import { getFirestoreDb } from '@/infrastructure/firebase/admin';
import {
  CashHarvest,
  Transaction,
  MachineVaultSummary,
  HarvestAdjustmentItem,
  AdjustmentAction,
  AdjustmentTarget,
} from '@/domain/types';

interface RawDbHarvest {
  id: string;
  machineId: string;
  machineName?: string;
  harvestedAt: string;
  reportingDate?: string | null;
  reportName?: string | null;
  rawExpectedAmount?: number | null;
  expectedAmount: number;
  baseAmount?: number | null;
  totalAdded?: number;
  totalDeducted?: number;
  netAdjustment?: number;
  adjustmentsJson?: string | null;
  adjustmentType?: string | null;
  adjustmentAmount?: number;
  adjustmentReason?: string | null;
  actualAmount: number;
  variance: number;
  collectedBy: string;
  depositedCollectionId?: string | null;
  isDeposited?: number | boolean;
  slipImageUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export function formatReportName(reportingDate?: string | null, harvestedAt?: string): string {
  try {
    const raw = reportingDate || harvestedAt || new Date().toISOString();
    let d: Date;
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
      const [year, month, day] = raw.trim().split('-').map(Number);
      d = new Date(year, month - 1, day);
    } else {
      d = new Date(raw);
    }
    const formatted = d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return `Harvest-${formatted}`;
  } catch {
    return `Harvest-${reportingDate || harvestedAt || 'Record'}`;
  }
}

function mapHarvestRow(row: any): CashHarvest {
  let adjustments: HarvestAdjustmentItem[] = [];
  const adjJson = row.adjustments_json || row.adjustmentsJson;
  if (adjJson) {
    try {
      const parsed = typeof adjJson === 'string' ? JSON.parse(adjJson) : adjJson;
      adjustments = parsed.map((a: any) => ({
        id: a.id,
        type: a.type as AdjustmentAction,
        target: (a.target as AdjustmentTarget) || 'EXPECTED',
        amount: Number(a.amount) || 0,
        description: a.description || '',
      }));
    } catch {
      adjustments = [];
    }
  } else if (row.adjustment_type && row.adjustment_type !== 'NONE' && (row.adjustment_amount || 0) > 0) {
    adjustments = [
      {
        id: `adj_legacy_${row.id}`,
        type: row.adjustment_type === 'ADD' ? 'ADD' : 'DEDUCT',
        target: 'EXPECTED',
        amount: Number(row.adjustment_amount) || 0,
        description: row.adjustment_reason || '',
      },
    ];
  }

  const totalAdded = row.total_added !== undefined && row.total_added !== null
    ? Number(row.total_added)
    : (row.totalAdded !== undefined && row.totalAdded !== null
      ? Number(row.totalAdded)
      : adjustments.filter((a) => a.type === 'ADD').reduce((s, a) => s + a.amount, 0));

  const totalDeducted = row.total_deducted !== undefined && row.total_deducted !== null
    ? Number(row.total_deducted)
    : (row.totalDeducted !== undefined && row.totalDeducted !== null
      ? Number(row.totalDeducted)
      : adjustments.filter((a) => a.type === 'DEDUCT').reduce((s, a) => s + a.amount, 0));

  const netAdjustment = row.net_adjustment !== undefined && row.net_adjustment !== null
    ? Number(row.net_adjustment)
    : (row.netAdjustment !== undefined && row.netAdjustment !== null
      ? Number(row.netAdjustment)
      : totalAdded - totalDeducted);

  const reportingDate = row.reporting_date || row.reportingDate || null;
  const harvestedAt = row.harvested_at || row.harvestedAt;
  const reportName = row.report_name || row.reportName || formatReportName(reportingDate, harvestedAt);

  const rawExpectedAmount = row.raw_expected_amount !== null && row.raw_expected_amount !== undefined
    ? Number(row.raw_expected_amount)
    : (row.rawExpectedAmount !== null && row.rawExpectedAmount !== undefined ? Number(row.rawExpectedAmount) : Number(row.expected_amount || row.expectedAmount || 0));

  const baseAmount = row.base_amount !== null && row.base_amount !== undefined
    ? Number(row.base_amount)
    : (row.baseAmount !== null && row.baseAmount !== undefined ? Number(row.baseAmount) : Number(row.actual_amount || row.actualAmount || 0));

  return {
    id: row.id,
    machineId: row.machine_id || row.machineId,
    machineName: row.machineName || row.machine_name || (row.machine_id === 'm1' ? 'Kiosk-1' : row.machine_id),
    harvestedAt,
    reportingDate,
    reportName,
    rawExpectedAmount,
    expectedAmount: Number(row.expected_amount ?? row.expectedAmount ?? 0),
    baseAmount,
    adjustments,
    totalAdded: Math.round(totalAdded * 100) / 100,
    totalDeducted: Math.round(totalDeducted * 100) / 100,
    netAdjustment: Math.round(netAdjustment * 100) / 100,
    adjustmentType: row.adjustment_type || row.adjustmentType,
    adjustmentAmount: Number(row.adjustment_amount ?? row.adjustmentAmount ?? 0),
    adjustmentReason: row.adjustment_reason || row.adjustmentReason,
    actualAmount: Number(row.actual_amount ?? row.actualAmount ?? 0),
    variance: Number(row.variance ?? 0),
    collectedBy: row.collected_by || row.collectedBy || '',
    depositedCollectionId: row.deposited_collection_id || row.depositedCollectionId || null,
    isDeposited: Boolean(row.is_deposited === 1 || row.is_deposited === true || row.isDeposited),
    slipImageUrl: row.slip_image_url || row.slipImageUrl || null,
    notes: row.notes || null,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

function processAdjustments(
  rawExpected: number,
  baseCounted: number,
  rawAdjustments?: Array<{ id?: string; type: AdjustmentAction; target?: AdjustmentTarget; amount: number; description: string }>
) {
  const adjustments: HarvestAdjustmentItem[] = [];
  let totalAdded = 0;
  let totalDeducted = 0;

  let expectedDelta = 0;
  let physicalDelta = 0;

  if (rawAdjustments && Array.isArray(rawAdjustments)) {
    for (const adj of rawAdjustments) {
      const amt = Math.max(0, Math.round((Number(adj.amount) || 0) * 100) / 100);
      const desc = (adj.description || '').trim();
      const target: AdjustmentTarget = adj.target === 'PHYSICAL' ? 'PHYSICAL' : 'EXPECTED';
      const type: AdjustmentAction = adj.type === 'ADD' ? 'ADD' : 'DEDUCT';

      if (amt > 0 || desc) {
        adjustments.push({
          id: adj.id || `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          type,
          target,
          amount: amt,
          description: desc,
        });

        if (type === 'ADD') {
          totalAdded += amt;
          if (target === 'EXPECTED') expectedDelta += amt;
          else physicalDelta += amt;
        } else {
          totalDeducted += amt;
          if (target === 'EXPECTED') expectedDelta -= amt;
          else physicalDelta -= amt;
        }
      }
    }
  }

  totalAdded = Math.round(totalAdded * 100) / 100;
  totalDeducted = Math.round(totalDeducted * 100) / 100;
  const netAdjustment = Math.round((totalAdded - totalDeducted) * 100) / 100;

  const adjustedExpectedAmount = Math.max(0, Math.round((rawExpected + expectedDelta) * 100) / 100);
  const actualAmount = Math.max(0, Math.round((baseCounted + physicalDelta) * 100) / 100);
  const variance = Math.round((actualAmount - adjustedExpectedAmount) * 100) / 100;

  return {
    adjustments,
    totalAdded,
    totalDeducted,
    netAdjustment,
    expectedAmount: adjustedExpectedAmount,
    actualAmount,
    variance,
  };
}

export async function getLatestHarvestForMachine(machineId: string): Promise<CashHarvest | null> {
  const db = getFirestoreDb();
  const [harvestSnap, machinesSnap] = await Promise.all([
    db.collection('cash_harvests').where('machine_id', '==', machineId).get(),
    db.collection('machines').get(),
  ]);

  if (harvestSnap.empty) return null;

  const machineMap = new Map<string, string>();
  machinesSnap.docs.forEach(m => machineMap.set(m.id, m.data().name || m.id));

  const sorted = harvestSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }))
    .sort((a: any, b: any) => new Date(b.harvested_at || b.harvestedAt).getTime() - new Date(a.harvested_at || a.harvestedAt).getTime());

  const latest = sorted[0];
  return mapHarvestRow({ ...latest, machineName: machineMap.get(machineId) });
}

export async function computeUncollectedCashInVault(
  machineId: string,
  upToTime?: string,
  excludeHarvestId?: string
): Promise<{
  expectedCash: number;
  uncollectedCount: number;
  sinceTime: string | null;
}> {
  const db = getFirestoreDb();
  const [harvestSnap, txSnap] = await Promise.all([
    db.collection('cash_harvests').where('machine_id', '==', machineId).get(),
    db.collection('transactions').where('machine_id', '==', machineId).where('status', '==', 'SUCCEEDED').get(),
  ]);

  let priorHarvests: any[] = harvestSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  if (excludeHarvestId) {
    priorHarvests = priorHarvests.filter(h => h.id !== excludeHarvestId);
  }

  let sinceTime: string | null = null;
  if (upToTime) {
    const validPrior = priorHarvests
      .filter(h => (h.harvested_at || h.harvestedAt) < upToTime)
      .sort((a, b) => new Date(b.harvested_at || b.harvestedAt).getTime() - new Date(a.harvested_at || a.harvestedAt).getTime());
    sinceTime = validPrior.length > 0 ? (validPrior[0].harvested_at || validPrior[0].harvestedAt) : null;
  } else {
    const validLatest = priorHarvests
      .sort((a, b) => new Date(b.harvested_at || b.harvestedAt).getTime() - new Date(a.harvested_at || a.harvestedAt).getTime());
    sinceTime = validLatest.length > 0 ? (validLatest[0].harvested_at || validLatest[0].harvestedAt) : null;
  }

  let expectedCash = 0;
  let uncollectedCount = 0;

  for (const doc of txSnap.docs) {
    const data = doc.data();
    const isPersonal = data.is_personal_draw === 1 || data.is_personal_draw === true || data.isPersonalDraw;
    if (isPersonal) continue;

    const txTime = data.transaction_time || data.transactionTime;
    if (sinceTime && txTime <= sinceTime) continue;
    if (upToTime && txTime > upToTime) continue;

    expectedCash += Number(data.inserted_amount || data.insertedAmount || 0);
    uncollectedCount += 1;
  }

  return {
    expectedCash: Math.round(expectedCash * 100) / 100,
    uncollectedCount,
    sinceTime,
  };
}

export async function recordHarvest(input: {
  machineId: string;
  harvestedAt?: string;
  reportingDate?: string | null;
  reportName?: string | null;
  baseAmount?: number | null;
  adjustments?: Array<{ id?: string; type: AdjustmentAction; target?: AdjustmentTarget; amount: number; description: string }>;
  actualAmount?: number;
  collectedBy: string;
  slipImageUrl?: string | null;
  notes?: string | null;
}): Promise<CashHarvest> {
  const db = getFirestoreDb();
  const harvestedAt = input.harvestedAt || new Date().toISOString();
  const createdAt = new Date().toISOString();
  const id = `harvest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const reportingDate = input.reportingDate || null;
  const reportName = input.reportName ? input.reportName.trim() : formatReportName(reportingDate, harvestedAt);
  const slipImageUrl = input.slipImageUrl ? input.slipImageUrl.trim() : null;

  const baseAmount = input.baseAmount !== undefined && input.baseAmount !== null
    ? Math.round(Number(input.baseAmount) * 100) / 100
    : Math.round(Number(input.actualAmount || 0) * 100) / 100;

  const { expectedCash: rawExpected } = await computeUncollectedCashInVault(input.machineId, harvestedAt);

  const {
    adjustments,
    totalAdded,
    totalDeducted,
    netAdjustment,
    expectedAmount,
    actualAmount,
    variance,
  } = processAdjustments(rawExpected, baseAmount, input.adjustments);

  const adjustmentsJson = JSON.stringify(adjustments);

  const batch = db.batch();

  // Create harvest document
  const harvestRef = db.collection('cash_harvests').doc(id);
  batch.set(harvestRef, {
    id,
    machine_id: input.machineId,
    harvested_at: harvestedAt,
    reporting_date: reportingDate,
    report_name: reportName,
    raw_expected_amount: rawExpected,
    expected_amount: expectedAmount,
    base_amount: baseAmount,
    total_added: totalAdded,
    total_deducted: totalDeducted,
    net_adjustment: netAdjustment,
    adjustments_json: adjustmentsJson,
    actual_amount: actualAmount,
    variance,
    collected_by: input.collectedBy.trim(),
    slip_image_url: slipImageUrl,
    notes: input.notes ? input.notes.trim() : null,
    created_at: createdAt,
    is_deposited: 0,
    deposited_collection_id: null,
  });

  // Also persist into cash_harvest_adjustments collection
  for (const adj of adjustments) {
    const adjRef = db.collection('cash_harvest_adjustments').doc(adj.id);
    batch.set(adjRef, {
      id: adj.id,
      harvest_id: id,
      type: adj.type,
      target: adj.target || 'EXPECTED',
      amount: adj.amount,
      description: adj.description,
      created_at: createdAt,
    });
  }

  await batch.commit();

  const machineDoc = await db.collection('machines').doc(input.machineId).get();
  const machineName = machineDoc.exists ? (machineDoc.data()?.name || input.machineId) : input.machineId;

  return {
    id,
    machineId: input.machineId,
    machineName,
    harvestedAt,
    reportingDate,
    reportName,
    rawExpectedAmount: rawExpected,
    expectedAmount,
    baseAmount,
    adjustments,
    totalAdded,
    totalDeducted,
    netAdjustment,
    actualAmount,
    variance,
    collectedBy: input.collectedBy.trim(),
    slipImageUrl,
    notes: input.notes ? input.notes.trim() : null,
    createdAt,
  };
}

export async function updateHarvest(
  id: string,
  input: {
    harvestedAt?: string;
    reportingDate?: string | null;
    reportName?: string | null;
    baseAmount?: number | null;
    adjustments?: Array<{ id?: string; type: AdjustmentAction; target?: AdjustmentTarget; amount: number; description: string }>;
    collectedBy: string;
    slipImageUrl?: string | null;
    notes?: string | null;
  }
): Promise<CashHarvest> {
  const db = getFirestoreDb();
  const docRef = db.collection('cash_harvests').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) {
    throw new Error('Harvest record not found');
  }

  const existing = doc.data() || {};
  const machineId = existing.machine_id || existing.machineId;
  const harvestedAt = input.harvestedAt || existing.harvested_at;
  const reportingDate = input.reportingDate !== undefined ? input.reportingDate : existing.reporting_date;
  const reportName = input.reportName ? input.reportName.trim() : (existing.report_name || formatReportName(reportingDate, harvestedAt));
  const updatedAt = new Date().toISOString();
  const slipImageUrl = input.slipImageUrl !== undefined
    ? (input.slipImageUrl ? input.slipImageUrl.trim() : null)
    : (existing.slip_image_url || null);

  const baseAmount = input.baseAmount !== undefined && input.baseAmount !== null
    ? Math.round(Number(input.baseAmount) * 100) / 100
    : (existing.base_amount ?? existing.actual_amount);

  const { expectedCash: rawExpected } = await computeUncollectedCashInVault(machineId, harvestedAt, id);

  const {
    adjustments,
    totalAdded,
    totalDeducted,
    netAdjustment,
    expectedAmount,
    actualAmount,
    variance,
  } = processAdjustments(rawExpected, baseAmount, input.adjustments);

  const adjustmentsJson = JSON.stringify(adjustments);

  const batch = db.batch();

  batch.update(docRef, {
    harvested_at: harvestedAt,
    reporting_date: reportingDate,
    report_name: reportName,
    raw_expected_amount: rawExpected,
    expected_amount: expectedAmount,
    base_amount: baseAmount,
    total_added: totalAdded,
    total_deducted: totalDeducted,
    net_adjustment: netAdjustment,
    adjustments_json: adjustmentsJson,
    actual_amount: actualAmount,
    variance,
    collected_by: input.collectedBy.trim(),
    slip_image_url: slipImageUrl,
    notes: input.notes ? input.notes.trim() : null,
    updated_at: updatedAt,
  });

  // Refresh adjustments collection
  const oldAdjs = await db.collection('cash_harvest_adjustments').where('harvest_id', '==', id).get();
  for (const adjDoc of oldAdjs.docs) {
    batch.delete(adjDoc.ref);
  }

  for (const adj of adjustments) {
    const adjRef = db.collection('cash_harvest_adjustments').doc(adj.id);
    batch.set(adjRef, {
      id: adj.id,
      harvest_id: id,
      type: adj.type,
      target: adj.target || 'EXPECTED',
      amount: adj.amount,
      description: adj.description,
      created_at: updatedAt,
    });
  }

  // Recalculate linked deposit if any
  const depId = existing.deposited_collection_id;
  if (depId) {
    const depHarvests = await db.collection('cash_harvests').where('deposited_collection_id', '==', depId).get();
    let depExp = 0;
    for (const hDoc of depHarvests.docs) {
      if (hDoc.id === id) {
        depExp += actualAmount;
      } else {
        depExp += Number(hDoc.data().actual_amount || 0);
      }
    }
    depExp = Math.round(depExp * 100) / 100;

    const depDoc = await db.collection('deposited_collections').doc(depId).get();
    if (depDoc.exists) {
      const depActual = Number(depDoc.data()?.actual_amount || 0);
      const depVar = Math.round((depActual - depExp) * 100) / 100;
      batch.update(depDoc.ref, {
        expected_amount: depExp,
        variance: depVar,
      });
    }
  }

  await batch.commit();

  const machineDoc = await db.collection('machines').doc(machineId).get();
  const machineName = machineDoc.exists ? (machineDoc.data()?.name || machineId) : machineId;

  return {
    id,
    machineId,
    machineName,
    harvestedAt,
    reportingDate,
    reportName,
    rawExpectedAmount: rawExpected,
    expectedAmount,
    baseAmount,
    adjustments,
    totalAdded,
    totalDeducted,
    netAdjustment,
    actualAmount,
    variance,
    collectedBy: input.collectedBy.trim(),
    depositedCollectionId: depId,
    isDeposited: Boolean(existing.is_deposited),
    slipImageUrl,
    notes: input.notes ? input.notes.trim() : null,
    createdAt: existing.created_at,
    updatedAt,
  };
}

export async function getHarvestById(id: string): Promise<CashHarvest | null> {
  const db = getFirestoreDb();
  const doc = await db.collection('cash_harvests').doc(id).get();
  if (!doc.exists) return null;

  const data = doc.data() || {};
  const machineDoc = await db.collection('machines').doc(data.machine_id || data.machineId).get();
  const machineName = machineDoc.exists ? (machineDoc.data()?.name || data.machine_id) : data.machine_id;

  return mapHarvestRow({ ...data, id: doc.id, machineName });
}

export async function getHarvestsByMachine(machineId?: string): Promise<CashHarvest[]> {
  const db = getFirestoreDb();
  const [harvestSnap, machinesSnap] = await Promise.all([
    machineId && machineId !== 'ALL'
      ? db.collection('cash_harvests').where('machine_id', '==', machineId).get()
      : db.collection('cash_harvests').get(),
    db.collection('machines').get(),
  ]);

  const machineMap = new Map<string, string>();
  machinesSnap.docs.forEach((m) => machineMap.set(m.id, m.data().name || m.id));

  const list = harvestSnap.docs.map((doc) => {
    const data = doc.data();
    return mapHarvestRow({
      ...data,
      id: doc.id,
      machineName: machineMap.get(data.machine_id || data.machineId),
    });
  });

  return list.sort((a, b) => new Date(b.harvestedAt).getTime() - new Date(a.harvestedAt).getTime());
}

export async function deleteHarvest(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  const docRef = db.collection('cash_harvests').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  const harvestData = doc.data() || {};
  const depId = harvestData.deposited_collection_id;

  const batch = db.batch();

  // Delete adjustments
  const adjs = await db.collection('cash_harvest_adjustments').where('harvest_id', '==', id).get();
  for (const a of adjs.docs) {
    batch.delete(a.ref);
  }

  batch.delete(docRef);

  // Recalculate linked deposit if any
  if (depId) {
    const depHarvests = await db.collection('cash_harvests').where('deposited_collection_id', '==', depId).get();
    let depExp = 0;
    for (const hDoc of depHarvests.docs) {
      if (hDoc.id !== id) {
        depExp += Number(hDoc.data().actual_amount || 0);
      }
    }
    depExp = Math.round(depExp * 100) / 100;

    const depDoc = await db.collection('deposited_collections').doc(depId).get();
    if (depDoc.exists) {
      const depActual = Number(depDoc.data()?.actual_amount || 0);
      const depVar = Math.round((depActual - depExp) * 100) / 100;
      batch.update(depDoc.ref, {
        expected_amount: depExp,
        variance: depVar,
      });
    }
  }

  await batch.commit();
  return true;
}

export async function getMachineVaultSummary(machineId: string): Promise<MachineVaultSummary> {
  const db = getFirestoreDb();
  const [machineDoc, lastHarvest, uncollected, txSnap] = await Promise.all([
    db.collection('machines').doc(machineId).get(),
    getLatestHarvestForMachine(machineId),
    computeUncollectedCashInVault(machineId),
    db.collection('transactions').where('machine_id', '==', machineId).where('status', '==', 'SUCCEEDED').get(),
  ]);

  const machineName = machineDoc.exists ? (machineDoc.data()?.name || machineId) : machineId;

  let totalGross = 0;
  let totalProfit = 0;

  for (const doc of txSnap.docs) {
    const data = doc.data();
    const isPersonal = data.is_personal_draw === 1 || data.is_personal_draw === true || data.isPersonalDraw;
    if (!isPersonal) {
      totalGross += Number(data.amount || 0);
    }
    totalProfit += Number(data.net_profit || data.netProfit || 0);
  }

  return {
    machineId,
    machineName,
    currentCashInVault: uncollected.expectedCash,
    uncollectedTransactionsCount: uncollected.uncollectedCount,
    lastHarvest,
    totalGrossVolume: Math.round(totalGross * 100) / 100,
    totalNetProfit: Math.round(totalProfit * 100) / 100,
  };
}

export async function getTransactionsForHarvest(harvestId: string): Promise<{
  harvest: CashHarvest;
  transactions: Transaction[];
  previousHarvestAt: string | null;
  summary: {
    totalInserted: number;
    totalFee: number;
    totalGross: number;
    totalNetProfit: number;
    count: number;
  };
} | null> {
  const db = getFirestoreDb();
  const harvest = await getHarvestById(harvestId);
  if (!harvest) return null;

  const harvestSnap = await db.collection('cash_harvests').where('machine_id', '==', harvest.machineId).get();
  const priors = harvestSnap.docs
    .map((doc) => doc.data())
    .filter((h) => h.id !== harvest.id && (h.harvested_at || h.harvestedAt) < harvest.harvestedAt)
    .sort((a, b) => new Date(b.harvested_at || b.harvestedAt).getTime() - new Date(a.harvested_at || a.harvestedAt).getTime());

  const previousHarvestAt = priors.length > 0 ? (priors[0].harvested_at || priors[0].harvestedAt) : null;

  const [txSnap, machineDoc] = await Promise.all([
    db.collection('transactions').where('machine_id', '==', harvest.machineId).where('status', '==', 'SUCCEEDED').get(),
    db.collection('machines').doc(harvest.machineId).get(),
  ]);

  const machineName = machineDoc.exists ? (machineDoc.data()?.name || harvest.machineId) : harvest.machineId;

  const transactions: Transaction[] = [];
  for (const doc of txSnap.docs) {
    const data = doc.data();
    const isPersonal = data.is_personal_draw === 1 || data.is_personal_draw === true || data.isPersonalDraw;
    if (isPersonal) continue;

    const txTime = data.transaction_time || data.transactionTime;
    if (previousHarvestAt && txTime <= previousHarvestAt) continue;
    if (txTime > harvest.harvestedAt) continue;

    transactions.push({
      id: doc.id,
      machineId: harvest.machineId,
      machineName,
      serviceType: data.service_type || data.serviceType,
      referenceNo: data.reference_no || data.referenceNo || undefined,
      transactionTime: txTime,
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
      isPersonalDraw: false,
      createdAt: data.created_at || data.createdAt,
    });
  }

  transactions.sort((a, b) => new Date(b.transactionTime).getTime() - new Date(a.transactionTime).getTime());

  const totalInserted = Math.round(transactions.reduce((s, t) => s + (t.insertedAmount || 0), 0) * 100) / 100;
  const totalFee = Math.round(transactions.reduce((s, t) => s + (t.fee || 0), 0) * 100) / 100;
  const totalGross = Math.round(transactions.reduce((s, t) => s + (t.amount || 0), 0) * 100) / 100;
  const totalNetProfit = Math.round(transactions.reduce((s, t) => s + (t.netProfit || 0), 0) * 100) / 100;

  return {
    harvest,
    transactions,
    previousHarvestAt,
    summary: {
      totalInserted,
      totalFee,
      totalGross,
      totalNetProfit,
      count: transactions.length,
    },
  };
}
