import { getFirestoreDb } from '@/infrastructure/firebase/admin';
import { CashHarvest, DepositedCollection, DepositSummary, DepositType } from '@/domain/types';
import { formatReportName } from './harvest-repo';

function mapDepositHarvest(r: any): CashHarvest {
  let adjustments = [];
  if (r.adjustments_json || r.adjustmentsJson) {
    try {
      adjustments = JSON.parse(r.adjustments_json || r.adjustmentsJson);
    } catch {
      adjustments = [];
    }
  }
  return {
    id: r.id,
    machineId: r.machine_id || r.machineId,
    machineName: r.machineName || r.machine_name || (r.machine_id === 'm1' ? 'Kiosk-1' : r.machine_id),
    harvestedAt: r.harvested_at || r.harvestedAt,
    reportingDate: r.reporting_date || r.reportingDate || null,
    reportName: r.report_name || r.reportName || formatReportName(r.reporting_date || r.reportingDate, r.harvested_at || r.harvestedAt),
    expectedAmount: Number(r.expected_amount ?? r.expectedAmount ?? 0),
    baseAmount: r.base_amount ?? r.baseAmount ?? undefined,
    totalAdded: r.total_added ?? r.totalAdded ?? undefined,
    totalDeducted: r.total_deducted ?? r.totalDeducted ?? undefined,
    netAdjustment: r.net_adjustment ?? r.netAdjustment ?? undefined,
    adjustmentType: r.adjustment_type || r.adjustmentType || undefined,
    adjustmentAmount: r.adjustment_amount ?? r.adjustmentAmount ?? undefined,
    adjustmentReason: r.adjustment_reason || r.adjustmentReason || undefined,
    actualAmount: Number(r.actual_amount ?? r.actualAmount ?? 0),
    variance: Number(r.variance ?? 0),
    collectedBy: r.collected_by || r.collectedBy || '',
    depositedCollectionId: r.deposited_collection_id || r.depositedCollectionId || undefined,
    isDeposited: Boolean(r.is_deposited === 1 || r.is_deposited === true || r.isDeposited),
    notes: r.notes || undefined,
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    adjustments,
  };
}

export async function getPendingHarvests(): Promise<CashHarvest[]> {
  const db = getFirestoreDb();
  const [harvestsSnap, machinesSnap] = await Promise.all([
    db.collection('cash_harvests').get(),
    db.collection('machines').get(),
  ]);

  const machineMap = new Map<string, string>();
  machinesSnap.docs.forEach((doc) => {
    machineMap.set(doc.id, doc.data().name || doc.id);
  });

  const pending: CashHarvest[] = [];
  for (const doc of harvestsSnap.docs) {
    const data = doc.data();
    const isDeposited = data.is_deposited === 1 || data.is_deposited === true || data.isDeposited;
    const hasDepId = Boolean(data.deposited_collection_id || data.depositedCollectionId);

    if (!isDeposited || !hasDepId) {
      pending.push(mapDepositHarvest({
        ...data,
        id: doc.id,
        machineName: machineMap.get(data.machine_id || data.machineId) || data.machine_id,
      }));
    }
  }

  return pending.sort((a, b) => new Date(a.harvestedAt).getTime() - new Date(b.harvestedAt).getTime());
}

export async function recordDepositedCollection(input: {
  depositDate?: string;
  depositType: DepositType;
  referenceNo?: string | null;
  harvestIds: string[];
  actualAmount: number;
  depositedBy: string;
  receivedBy?: string | null;
  slipImageUrl?: string | null;
  notes?: string | null;
}): Promise<DepositedCollection> {
  const db = getFirestoreDb();
  const id = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const depositDate = input.depositDate || new Date().toISOString();
  const createdAt = new Date().toISOString();
  const actualAmount = Math.round(Number(input.actualAmount) * 100) / 100;

  // Calculate expected amount from selected harvests
  let expectedAmount = 0;
  const linkedHarvests: CashHarvest[] = [];

  if (input.harvestIds && input.harvestIds.length > 0) {
    const harvestsSnap = await db.collection('cash_harvests').get();
    for (const doc of harvestsSnap.docs) {
      if (input.harvestIds.includes(doc.id)) {
        const h = mapDepositHarvest({ ...doc.data(), id: doc.id });
        linkedHarvests.push(h);
        expectedAmount += Number(h.actualAmount || 0);
      }
    }
  } else {
    expectedAmount = actualAmount;
  }

  expectedAmount = Math.round(expectedAmount * 100) / 100;
  const variance = Math.round((actualAmount - expectedAmount) * 100) / 100;

  const batch = db.batch();

  // Create deposit document
  const depositRef = db.collection('deposited_collections').doc(id);
  batch.set(depositRef, {
    id,
    deposit_date: depositDate,
    deposit_type: input.depositType,
    reference_no: input.referenceNo ? input.referenceNo.trim() : null,
    expected_amount: expectedAmount,
    actual_amount: actualAmount,
    variance,
    deposited_by: input.depositedBy.trim(),
    received_by: input.receivedBy ? input.receivedBy.trim() : null,
    slip_image_url: input.slipImageUrl ? input.slipImageUrl.trim() : null,
    notes: input.notes ? input.notes.trim() : null,
    created_at: createdAt,
    is_replenished: 0,
    replenished_at: null,
    wallet_replenishment_id: null,
  });

  // Link harvests to this deposited collection record
  if (input.harvestIds && input.harvestIds.length > 0) {
    for (const harvestId of input.harvestIds) {
      const hRef = db.collection('cash_harvests').doc(harvestId);
      batch.update(hRef, {
        deposited_collection_id: id,
        is_deposited: 1,
      });
    }
  }

  await batch.commit();

  return {
    id,
    depositDate,
    depositType: input.depositType,
    referenceNo: input.referenceNo ? input.referenceNo.trim() : null,
    expectedAmount,
    actualAmount,
    variance,
    depositedBy: input.depositedBy.trim(),
    receivedBy: input.receivedBy ? input.receivedBy.trim() : null,
    slipImageUrl: input.slipImageUrl ? input.slipImageUrl.trim() : null,
    notes: input.notes ? input.notes.trim() : null,
    linkedHarvestsCount: linkedHarvests.length,
    linkedHarvests,
    createdAt,
  };
}

export async function getDepositedCollections(): Promise<DepositedCollection[]> {
  const db = getFirestoreDb();
  const [depositsSnap, harvestsSnap] = await Promise.all([
    db.collection('deposited_collections').get(),
    db.collection('cash_harvests').get(),
  ]);

  const harvestCountMap = new Map<string, number>();
  harvestsSnap.docs.forEach((doc) => {
    const data = doc.data();
    const depId = data.deposited_collection_id || data.depositedCollectionId;
    if (depId) {
      harvestCountMap.set(depId, (harvestCountMap.get(depId) || 0) + 1);
    }
  });

  const deposits: DepositedCollection[] = depositsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      depositDate: data.deposit_date || data.depositDate || data.created_at,
      depositType: data.deposit_type || data.depositType || 'BANK_DEPOSIT',
      referenceNo: data.reference_no || data.referenceNo || null,
      expectedAmount: Number(data.expected_amount ?? data.expectedAmount ?? 0),
      actualAmount: Number(data.actual_amount ?? data.actualAmount ?? 0),
      variance: Number(data.variance ?? 0),
      depositedBy: data.deposited_by || data.depositedBy || '',
      receivedBy: data.received_by || data.receivedBy || null,
      slipImageUrl: data.slip_image_url || data.slipImageUrl || null,
      notes: data.notes || null,
      createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      isReplenished: Boolean(data.is_replenished === 1 || data.is_replenished === true || data.isReplenished),
      replenishedAt: data.replenished_at || data.replenishedAt || null,
      walletReplenishmentId: data.wallet_replenishment_id || data.walletReplenishmentId || null,
      linkedHarvestsCount: harvestCountMap.get(doc.id) || 0,
    };
  });

  return deposits.sort((a, b) => new Date(b.depositDate).getTime() - new Date(a.depositDate).getTime());
}

export async function getDepositedCollectionById(id: string): Promise<DepositedCollection | null> {
  const db = getFirestoreDb();
  const [doc, harvestsSnap, machinesSnap] = await Promise.all([
    db.collection('deposited_collections').doc(id).get(),
    db.collection('cash_harvests').where('deposited_collection_id', '==', id).get(),
    db.collection('machines').get(),
  ]);

  if (!doc.exists) return null;
  const data = doc.data() || {};

  const machineMap = new Map<string, string>();
  machinesSnap.docs.forEach((m) => machineMap.set(m.id, m.data().name || m.id));

  const linkedHarvests: CashHarvest[] = harvestsSnap.docs
    .map((hDoc) => {
      const hData = hDoc.data();
      return mapDepositHarvest({
        ...hData,
        id: hDoc.id,
        machineName: machineMap.get(hData.machine_id || hData.machineId) || hData.machine_id,
      });
    })
    .sort((a, b) => new Date(a.harvestedAt).getTime() - new Date(b.harvestedAt).getTime());

  return {
    id: doc.id,
    depositDate: data.deposit_date || data.depositDate || data.created_at,
    depositType: data.deposit_type || data.depositType || 'BANK_DEPOSIT',
    referenceNo: data.reference_no || data.referenceNo || null,
    expectedAmount: Number(data.expected_amount ?? data.expectedAmount ?? 0),
    actualAmount: Number(data.actual_amount ?? data.actualAmount ?? 0),
    variance: Number(data.variance ?? 0),
    depositedBy: data.deposited_by || data.depositedBy || '',
    receivedBy: data.received_by || data.receivedBy || null,
    slipImageUrl: data.slip_image_url || data.slipImageUrl || null,
    notes: data.notes || null,
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
    isReplenished: Boolean(data.is_replenished === 1 || data.is_replenished === true || data.isReplenished),
    replenishedAt: data.replenished_at || data.replenishedAt || null,
    walletReplenishmentId: data.wallet_replenishment_id || data.walletReplenishmentId || null,
    linkedHarvestsCount: linkedHarvests.length,
    linkedHarvests,
  };
}

export async function deleteDepositedCollection(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  const batch = db.batch();

  // Unlink any linked harvests
  const linkedHarvestsSnap = await db.collection('cash_harvests')
    .where('deposited_collection_id', '==', id)
    .get();

  for (const doc of linkedHarvestsSnap.docs) {
    batch.update(doc.ref, {
      deposited_collection_id: null,
      is_deposited: 0,
    });
  }

  // Delete deposit doc
  const depRef = db.collection('deposited_collections').doc(id);
  batch.delete(depRef);

  await batch.commit();
  return true;
}

export async function toggleDepositReplenished(
  id: string,
  isReplenished?: boolean,
  walletReplenishmentId?: string | null
): Promise<DepositedCollection | null> {
  const db = getFirestoreDb();
  const docRef = db.collection('deposited_collections').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return null;

  const current = doc.data() || {};
  const currentStatus = current.is_replenished === 1 || current.is_replenished === true;
  const nextStatus = isReplenished !== undefined ? isReplenished : !currentStatus;
  const replenishedAt = nextStatus ? new Date().toISOString() : null;
  const replenishmentId = nextStatus ? (walletReplenishmentId || null) : null;

  await docRef.update({
    is_replenished: nextStatus ? 1 : 0,
    replenished_at: replenishedAt,
    wallet_replenishment_id: replenishmentId,
  });

  return getDepositedCollectionById(id);
}

export async function getUnreplenishedDeposits(): Promise<DepositedCollection[]> {
  const allDeposits = await getDepositedCollections();
  return allDeposits.filter((d) => !d.isReplenished);
}

export async function getDepositSummary(): Promise<DepositSummary> {
  const db = getFirestoreDb();
  const [harvestsSnap, depositsSnap, replenishmentsSnap, txSnap] = await Promise.all([
    db.collection('cash_harvests').get(),
    db.collection('deposited_collections').get(),
    db.collection('wallet_replenishments').get(),
    db.collection('transactions').where('status', '==', 'SUCCEEDED').get(),
  ]);

  // Pending harvested cash in staff hands awaiting deposit
  let totalPending = 0;
  let pendingCount = 0;
  const undepositedHarvestsList: Array<{ id: string; harvestedAt: string; amount: number; collector: string }> = [];

  for (const doc of harvestsSnap.docs) {
    const data = doc.data();
    const isDeposited = data.is_deposited === 1 || data.is_deposited === true || data.isDeposited;
    const hasDepId = Boolean(data.deposited_collection_id || data.depositedCollectionId);

    if (!isDeposited || !hasDepId) {
      const amt = Number(data.actual_amount || 0);
      totalPending += amt;
      pendingCount += 1;
      undepositedHarvestsList.push({
        id: doc.id,
        harvestedAt: data.harvested_at || data.harvestedAt,
        amount: amt,
        collector: data.collected_by || data.collectedBy || '',
      });
    }
  }

  undepositedHarvestsList.sort((a, b) => new Date(a.harvestedAt).getTime() - new Date(b.harvestedAt).getTime());

  // Totals from deposited_collections
  let totalBank = 0;
  let totalCash = 0;
  let totalVariance = 0;
  let totalUnreplenished = 0;
  let unreplenishedCount = 0;
  let totalReplenished = 0;
  let replenishedCount = 0;
  const unreplenishedDepositsList: Array<{ id: string; depositDate: string; amount: number; referenceNo: string | null }> = [];

  for (const doc of depositsSnap.docs) {
    const data = doc.data();
    const actual = Number(data.actual_amount || 0);
    const variance = Number(data.variance || 0);
    const depositType = data.deposit_type || data.depositType;
    const isRep = data.is_replenished === 1 || data.is_replenished === true || data.isReplenished;

    if (depositType === 'BANK_DEPOSIT') {
      totalBank += actual;
    } else if (depositType === 'CASH_HANDOVER') {
      totalCash += actual;
    }
    totalVariance += variance;

    if (isRep) {
      totalReplenished += actual;
      replenishedCount += 1;
    } else {
      totalUnreplenished += actual;
      unreplenishedCount += 1;
      unreplenishedDepositsList.push({
        id: doc.id,
        depositDate: data.deposit_date || data.depositDate,
        amount: actual,
        referenceNo: data.reference_no || data.referenceNo || null,
      });
    }
  }

  unreplenishedDepositsList.sort((a, b) => new Date(a.depositDate).getTime() - new Date(b.depositDate).getTime());

  // Master wallet inflow
  let totalInflow = 0;
  let startingCapital = 0;
  let reloadsFromBank = 0;

  for (const doc of replenishmentsSnap.docs) {
    const data = doc.data();
    const amt = Number(data.amount || 0);
    totalInflow += amt;
    if (doc.id === 'rep_starting_capital_110955') {
      startingCapital += amt;
    } else {
      reloadsFromBank += amt;
    }
  }

  // Master wallet deductions
  let totalWalletDeduction = 0;
  let personalDraws = 0;
  let kioskDrain = 0;

  for (const doc of txSnap.docs) {
    const data = doc.data();
    const ded = Number(data.wallet_deduction || 0);
    totalWalletDeduction += ded;
    const isPersonal = data.is_personal_draw === 1 || data.is_personal_draw === true || data.isPersonalDraw;
    if (isPersonal) {
      personalDraws += ded;
    } else {
      kioskDrain += ded;
    }
  }

  const actualReload = Math.round(reloadsFromBank * 100) / 100;
  const totalReplenishedDep = Math.round(totalReplenished * 100) / 100;
  const transferFee = Math.max(0, Math.round((totalReplenishedDep - actualReload) * 100) / 100);
  const remainingWallet = Math.round((totalInflow - totalWalletDeduction) * 100) / 100;
  const startingCap = Math.round(startingCapital * 100) / 100;
  const unreplenishedBank = Math.round(totalUnreplenished * 100) / 100;
  const transitAndDraws = Math.max(0, Math.round((startingCap - remainingWallet - unreplenishedBank) * 100) / 100);

  return {
    undepositedCashInTransit: Math.round(totalPending * 100) / 100,
    undepositedHarvestsCount: pendingCount,
    totalBankDeposited: Math.round(totalBank * 100) / 100,
    totalCashHandedOver: Math.round(totalCash * 100) / 100,
    totalVariance: Math.round(totalVariance * 100) / 100,
    totalUnreplenishedAmount: unreplenishedBank,
    unreplenishedCount,
    totalReplenishedAmount: totalReplenishedDep,
    replenishedCount,
    actualWalletReloadAmount: actualReload,
    bankTransferFee: transferFee,
    startingCapital: startingCap,
    totalWalletInflow: Math.round(totalInflow * 100) / 100,
    totalWalletDeduction: Math.round(totalWalletDeduction * 100) / 100,
    kioskWalletDrain: Math.round(kioskDrain * 100) / 100,
    personalDraws: Math.round(personalDraws * 100) / 100,
    remainingWalletBalance: remainingWallet,
    capitalAccountedAmount: startingCap,
    capitalInWallet: remainingWallet,
    capitalInBank: unreplenishedBank,
    capitalInTransitAndDraws: transitAndDraws,
    unreplenishedDepositsList,
    undepositedHarvestsList,
  };
}
