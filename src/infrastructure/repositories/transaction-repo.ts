import { getFirestoreDb } from '@/infrastructure/firebase/admin';
import { Transaction, FinancialSummary, ServiceMetric, ServiceType, TransactionStatus } from '@/domain/types';
import { computeTransactionFinancials } from '@/domain/math';

export interface UpsertResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
}

export async function upsertTransactions(transactions: Transaction[]): Promise<UpsertResult> {
  const db = getFirestoreDb();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const batchSize = 400;
  for (let i = 0; i < transactions.length; i += batchSize) {
    const chunk = transactions.slice(i, i + batchSize);
    const batch = db.batch();

    for (const t of chunk) {
      const docRef = db.collection('transactions').doc(t.id);
      const existingDoc = await docRef.get();

      if (!existingDoc.exists) {
        batch.set(docRef, {
          id: t.id,
          machine_id: t.machineId,
          service_type: t.serviceType,
          reference_no: t.referenceNo || null,
          transaction_time: t.transactionTime,
          account_or_phone: t.accountOrPhone || null,
          customer_name: t.customerName || null,
          provider_or_biller: t.providerOrBiller || null,
          sub_type: t.subType || null,
          amount: t.amount,
          fee: t.fee,
          inserted_amount: t.insertedAmount,
          wallet_deduction: t.walletDeduction,
          provider_cost: t.providerCost,
          net_profit: t.netProfit,
          old_balance: t.oldBalance !== undefined ? t.oldBalance : null,
          new_balance: t.newBalance !== undefined ? t.newBalance : null,
          status: t.status,
          notes: t.notes || null,
          is_personal_draw: t.isPersonalDraw ? 1 : 0,
          import_batch_id: t.importBatchId || null,
          created_at: t.createdAt,
        });
        inserted++;
      } else {
        const existing = existingDoc.data() || {};
        const needsUpdate =
          existing.status !== t.status ||
          existing.notes !== t.notes ||
          existing.inserted_amount !== t.insertedAmount ||
          existing.wallet_deduction !== t.walletDeduction ||
          existing.old_balance !== (t.oldBalance ?? null) ||
          existing.new_balance !== (t.newBalance ?? null);

        if (needsUpdate) {
          batch.update(docRef, {
            status: t.status,
            notes: t.notes || null,
            amount: t.amount,
            fee: t.fee,
            inserted_amount: t.insertedAmount,
            wallet_deduction: t.walletDeduction,
            provider_cost: t.providerCost,
            net_profit: t.netProfit,
            old_balance: t.oldBalance !== undefined ? t.oldBalance : null,
            new_balance: t.newBalance !== undefined ? t.newBalance : null,
          });
          updated++;
        } else {
          skipped++;
        }
      }
    }

    await batch.commit();
  }

  return { total: transactions.length, inserted, updated, skipped };
}

export interface QueryFilters {
  machineId?: string;
  serviceType?: string;
  search?: string;
  status?: string;
  category?: 'ALL' | 'KIOSK_SALES' | 'PERSONAL_WITHDRAWALS' | string;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export function getDateRangeBounds(
  timeRange?: string,
  customStart?: string,
  customEnd?: string
): { start: string | null; end: string | null } {
  if (timeRange === 'CUSTOM' || (!timeRange && (customStart || customEnd)) || (timeRange === 'ALL' && (customStart || customEnd))) {
    let start: string | null = null;
    let end: string | null = null;

    if (customStart) {
      try {
        if (customStart.includes('T')) {
          start = new Date(customStart).toISOString();
        } else {
          start = new Date(`${customStart}T00:00:00.000Z`).toISOString();
        }
      } catch {
        start = customStart;
      }
    }

    if (customEnd) {
      try {
        if (customEnd.includes('T')) {
          end = new Date(customEnd).toISOString();
        } else {
          end = new Date(`${customEnd}T23:59:59.999Z`).toISOString();
        }
      } catch {
        end = customEnd;
      }
    }

    return { start, end };
  }

  if (!timeRange || timeRange === 'ALL') {
    return { start: null, end: null };
  }

  const now = new Date();

  if (timeRange === 'TODAY') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  if (timeRange === 'YESTERDAY') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  if (timeRange === 'LAST_7_DAYS' || timeRange === 'WEEK') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start: start.toISOString(), end: now.toISOString() };
  }

  if (timeRange === 'LAST_30_DAYS') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start: start.toISOString(), end: now.toISOString() };
  }

  if (timeRange === 'THIS_MONTH' || timeRange === 'MONTH') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }

  return { start: null, end: null };
}

export async function queryTransactions(filters: QueryFilters): Promise<{
  transactions: Transaction[];
  total: number;
  totalWalletDeduction?: number;
  totalAmount?: number;
}> {
  const db = getFirestoreDb();
  const [txSnap, machinesSnap] = await Promise.all([
    db.collection('transactions').get(),
    db.collection('machines').get(),
  ]);

  const machineMap = new Map<string, string>();
  machinesSnap.docs.forEach((m) => machineMap.set(m.id, m.data().name || m.id));

  const { start: dateStart, end: dateEnd } = getDateRangeBounds(filters.timeRange, filters.startDate, filters.endDate);
  const searchLower = filters.search ? filters.search.trim().toLowerCase() : '';

  let filtered = txSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      machineId: data.machine_id || data.machineId,
      machineName: machineMap.get(data.machine_id || data.machineId) || data.machine_id,
      serviceType: data.service_type || data.serviceType,
      referenceNo: data.reference_no || data.referenceNo || undefined,
      transactionTime: data.transaction_time || data.transactionTime,
      accountOrPhone: data.account_or_phone || data.accountOrPhone || undefined,
      customerName: data.customer_name || data.customerName || undefined,
      providerOrBiller: data.provider_or_biller || data.providerOrBiller || undefined,
      subType: data.sub_type || data.subType || undefined,
      amount: Number(data.amount) || 0,
      fee: Number(data.fee) || 0,
      insertedAmount: Number(data.inserted_amount || data.insertedAmount) || 0,
      walletDeduction: Number(data.wallet_deduction || data.walletDeduction) || 0,
      providerCost: Number(data.provider_cost || data.providerCost) || 0,
      netProfit: Number(data.net_profit || data.netProfit) || 0,
      oldBalance: data.old_balance != null ? Number(data.old_balance) : undefined,
      newBalance: data.new_balance != null ? Number(data.new_balance) : undefined,
      status: data.status,
      notes: data.notes || undefined,
      isPersonalDraw: Boolean(data.is_personal_draw === 1 || data.is_personal_draw === true || data.isPersonalDraw),
      importBatchId: data.import_batch_id || data.importBatchId || undefined,
      createdAt: data.created_at || data.createdAt,
    } as Transaction;
  });

  // Apply filters in memory
  if (filters.machineId && filters.machineId !== 'ALL') {
    filtered = filtered.filter((t) => t.machineId === filters.machineId);
  }

  if (filters.serviceType && filters.serviceType !== 'ALL') {
    filtered = filtered.filter((t) => t.serviceType === filters.serviceType);
  }

  if (filters.status && filters.status !== 'ALL') {
    filtered = filtered.filter((t) => t.status === filters.status);
  }

  if (filters.category === 'KIOSK_SALES') {
    filtered = filtered.filter((t) => !t.isPersonalDraw);
  } else if (filters.category === 'PERSONAL_WITHDRAWALS') {
    filtered = filtered.filter((t) => t.isPersonalDraw);
  }

  if (dateStart) {
    filtered = filtered.filter((t) => t.transactionTime >= dateStart);
  }
  if (dateEnd) {
    filtered = filtered.filter((t) => t.transactionTime <= dateEnd);
  }

  if (searchLower) {
    filtered = filtered.filter((t) => {
      const ref = (t.referenceNo || '').toLowerCase();
      const acc = (t.accountOrPhone || '').toLowerCase();
      const prov = (t.providerOrBiller || '').toLowerCase();
      const cust = (t.customerName || '').toLowerCase();
      return ref.includes(searchLower) || acc.includes(searchLower) || prov.includes(searchLower) || cust.includes(searchLower);
    });
  }

  // Sort descending by transactionTime
  filtered.sort((a, b) => new Date(b.transactionTime).getTime() - new Date(a.transactionTime).getTime());

  const total = filtered.length;
  let totalWalletDeduction = 0;
  let totalAmount = 0;

  for (const t of filtered) {
    totalWalletDeduction += t.walletDeduction;
    totalAmount += t.amount;
  }

  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(10000, Math.max(1, filters.pageSize || 20));
  const offset = (page - 1) * pageSize;
  const paginated = filtered.slice(offset, offset + pageSize);

  return {
    transactions: paginated,
    total,
    totalWalletDeduction: Math.round(totalWalletDeduction * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

export async function computeFinancialSummary(
  machineId?: string,
  timeRange?: string,
  customStart?: string,
  customEnd?: string
): Promise<FinancialSummary> {
  const db = getFirestoreDb();
  const [txSnap, machinesSnap, batchSnap] = await Promise.all([
    db.collection('transactions').get(),
    db.collection('machines').get(),
    db.collection('import_batches').orderBy('imported_at', 'desc').limit(1).get(),
  ]);

  const machineMap = new Map<string, string>();
  machinesSnap.docs.forEach((m) => machineMap.set(m.id, m.data().name || m.id));

  const { start: dateStart, end: dateEnd } = getDateRangeBounds(timeRange, customStart, customEnd);

  let rawTxs = txSnap.docs.map((doc) => doc.data());

  if (machineId && machineId !== 'ALL') {
    rawTxs = rawTxs.filter((t) => (t.machine_id || t.machineId) === machineId);
  }

  if (dateStart) {
    rawTxs = rawTxs.filter((t) => (t.transaction_time || t.transactionTime) >= dateStart);
  }
  if (dateEnd) {
    rawTxs = rawTxs.filter((t) => (t.transaction_time || t.transactionTime) <= dateEnd);
  }

  const initialMetric = (st: ServiceType, label: string): ServiceMetric => ({
    serviceType: st,
    label,
    volume: 0,
    netProfit: 0,
    cashInserted: 0,
    walletDeduction: 0,
    transactionCount: 0,
  });

  const breakdown: Record<ServiceType, ServiceMetric> = {
    CASH_IN: initialMetric('CASH_IN', 'Cash In'),
    E_LOAD: initialMetric('E_LOAD', 'E-Load'),
    BILLS_PAYMENT: initialMetric('BILLS_PAYMENT', 'Bills Payment'),
    PISO_WIFI: initialMetric('PISO_WIFI', 'Piso WiFi'),
  };

  let totalGrossVolume = 0;
  let totalInsertedCash = 0;
  let totalWalletDeduction = 0;
  let totalKioskWalletDeduction = 0;
  let totalPersonalDraws = 0;
  let totalNetProfit = 0;
  let totalTransactionsCount = 0;

  const machineDeductionMap = new Map<string, number>();

  for (const t of rawTxs) {
    const st = (t.service_type || t.serviceType) as ServiceType;
    const isPersonal = t.is_personal_draw === 1 || t.is_personal_draw === true || t.isPersonalDraw;
    const isSucceeded = t.status === 'SUCCEEDED';
    const amount = Number(t.amount || 0);
    const inserted = Number(t.inserted_amount || t.insertedAmount || 0);
    const deduction = Number(t.wallet_deduction || t.walletDeduction || 0);
    const profit = Number(t.net_profit || t.netProfit || 0);
    const mId = t.machine_id || t.machineId;

    if (isSucceeded) {
      totalWalletDeduction += deduction;
      totalNetProfit += profit;

      if (isPersonal) {
        totalPersonalDraws += deduction;
      } else {
        totalGrossVolume += amount;
        totalInsertedCash += inserted;
        totalKioskWalletDeduction += deduction;
        totalTransactionsCount += 1;

        if (breakdown[st]) {
          breakdown[st].volume += amount;
          breakdown[st].cashInserted += inserted;
          breakdown[st].walletDeduction += deduction;
          breakdown[st].netProfit += profit;
          breakdown[st].transactionCount += 1;
        }

        if (mId) {
          machineDeductionMap.set(mId, (machineDeductionMap.get(mId) || 0) + deduction);
        }
      }
    }
  }

  // Get latest recorded balance from wallet transactions
  const walletTxs = txSnap.docs
    .map((d) => d.data())
    .filter((t) => t.new_balance != null && t.status === 'SUCCEEDED')
    .sort((a, b) => new Date(b.transaction_time || b.transactionTime).getTime() - new Date(a.transaction_time || a.transactionTime).getTime());

  const latestWalletTx = walletTxs.length > 0 ? walletTxs[0] : undefined;
  const lastImportAt = !batchSnap.empty ? batchSnap.docs[0].data().imported_at : null;

  const machineDeductions = Array.from(machineDeductionMap.entries()).map(([mId, totalDed]) => ({
    machineId: mId,
    machineName: machineMap.get(mId) || mId,
    totalDeduction: Math.round(totalDed * 100) / 100,
  })).sort((a, b) => b.totalDeduction - a.totalDeduction);

  return {
    totalGrossVolume: Math.round(totalGrossVolume * 100) / 100,
    totalInsertedCash: Math.round(totalInsertedCash * 100) / 100,
    totalWalletDeduction: Math.round(totalWalletDeduction * 100) / 100,
    totalKioskWalletDeduction: Math.round(totalKioskWalletDeduction * 100) / 100,
    totalPersonalDraws: Math.round(totalPersonalDraws * 100) / 100,
    totalNetProfit: Math.round(totalNetProfit * 100) / 100,
    totalTransactionsCount,
    breakdown: {
      cashIn: breakdown.CASH_IN,
      load: breakdown.E_LOAD,
      bills: breakdown.BILLS_PAYMENT,
      pisoWifi: breakdown.PISO_WIFI,
    },
    reconciliation: {
      physicalCashToCollect: Math.round(totalInsertedCash * 100) / 100,
      walletReplenishmentNeeded: Math.round(totalWalletDeduction * 100) / 100,
      kioskReplenishmentNeeded: Math.round(totalKioskWalletDeduction * 100) / 100,
      personalDrawsDeduction: Math.round(totalPersonalDraws * 100) / 100,
      currentEstimatedWalletBalance: latestWalletTx ? Number(latestWalletTx.new_balance) : undefined,
    },
    machineDeductions,
    lastImportAt,
  };
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  const db = getFirestoreDb();
  const [doc, machinesSnap] = await Promise.all([
    db.collection('transactions').doc(id).get(),
    db.collection('machines').get(),
  ]);

  if (!doc.exists) return null;
  const data = doc.data() || {};

  const machineMap = new Map<string, string>();
  machinesSnap.docs.forEach((m) => machineMap.set(m.id, m.data().name || m.id));

  return {
    id: doc.id,
    machineId: data.machine_id || data.machineId,
    machineName: machineMap.get(data.machine_id || data.machineId) || data.machine_id,
    serviceType: data.service_type || data.serviceType,
    referenceNo: data.reference_no || data.referenceNo || undefined,
    transactionTime: data.transaction_time || data.transactionTime,
    accountOrPhone: data.account_or_phone || data.accountOrPhone || undefined,
    customerName: data.customer_name || data.customerName || undefined,
    providerOrBiller: data.provider_or_biller || data.providerOrBiller || undefined,
    subType: data.sub_type || data.subType || undefined,
    amount: Number(data.amount) || 0,
    fee: Number(data.fee) || 0,
    insertedAmount: Number(data.inserted_amount || data.insertedAmount) || 0,
    walletDeduction: Number(data.wallet_deduction || data.walletDeduction) || 0,
    providerCost: Number(data.provider_cost || data.providerCost) || 0,
    netProfit: Number(data.net_profit || data.netProfit) || 0,
    oldBalance: data.old_balance != null ? Number(data.old_balance) : undefined,
    newBalance: data.new_balance != null ? Number(data.new_balance) : undefined,
    status: data.status,
    notes: data.notes || undefined,
    isPersonalDraw: Boolean(data.is_personal_draw === 1 || data.is_personal_draw === true || data.isPersonalDraw),
    importBatchId: data.import_batch_id || data.importBatchId || undefined,
    createdAt: data.created_at || data.createdAt,
  };
}

export async function updateTransaction(
  id: string,
  updates: {
    amount?: number;
    fee?: number;
    insertedAmount?: number;
    walletDeduction?: number;
    netProfit?: number;
    providerCost?: number;
    status?: TransactionStatus;
    notes?: string | null;
    oldBalance?: number | null;
    newBalance?: number | null;
    customerName?: string | null;
    accountOrPhone?: string | null;
    transactionTime?: string;
    isPersonalDraw?: boolean;
  }
): Promise<Transaction | null> {
  const existing = await getTransactionById(id);
  if (!existing) return null;

  const db = getFirestoreDb();

  const amount = updates.amount !== undefined ? Number(updates.amount) : existing.amount;
  const fee = updates.fee !== undefined ? Number(updates.fee) : existing.fee;
  const insertedAmount = updates.insertedAmount !== undefined ? Number(updates.insertedAmount) : existing.insertedAmount;
  const status = updates.status !== undefined ? updates.status : existing.status;
  const notes = updates.notes !== undefined ? updates.notes : existing.notes;
  const oldBalance = updates.oldBalance !== undefined ? updates.oldBalance : existing.oldBalance;
  const newBalance = updates.newBalance !== undefined ? updates.newBalance : existing.newBalance;
  const customerName = updates.customerName !== undefined ? updates.customerName : existing.customerName;
  const accountOrPhone = updates.accountOrPhone !== undefined ? updates.accountOrPhone : existing.accountOrPhone;
  const transactionTime = updates.transactionTime !== undefined ? updates.transactionTime : existing.transactionTime;
  const isPersonalDraw = updates.isPersonalDraw !== undefined ? updates.isPersonalDraw : Boolean(existing.isPersonalDraw);

  const calculated = computeTransactionFinancials({
    serviceType: existing.serviceType,
    amount,
    fee,
    insertedAmount,
    oldBalance,
    newBalance,
    isPersonalDraw,
  });

  const walletDeduction = updates.walletDeduction !== undefined ? Number(updates.walletDeduction) : calculated.walletDeduction;
  const providerCost = updates.providerCost !== undefined ? Number(updates.providerCost) : calculated.providerCost;
  const netProfit = updates.netProfit !== undefined ? Number(updates.netProfit) : calculated.netProfit;

  await db.collection('transactions').doc(id).update({
    amount,
    fee,
    inserted_amount: insertedAmount,
    wallet_deduction: walletDeduction,
    provider_cost: providerCost,
    net_profit: netProfit,
    old_balance: oldBalance !== undefined && oldBalance !== null ? oldBalance : null,
    new_balance: newBalance !== undefined && newBalance !== null ? newBalance : null,
    status,
    notes: notes ?? null,
    customer_name: customerName ?? null,
    account_or_phone: accountOrPhone ?? null,
    is_personal_draw: isPersonalDraw ? 1 : 0,
    transaction_time: transactionTime,
  });

  return getTransactionById(id);
}
