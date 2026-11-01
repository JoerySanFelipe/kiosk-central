import { getFirestoreDb } from '@/infrastructure/firebase/admin';
import { WalletReplenishment } from '@/domain/types';

export async function listReplenishments(): Promise<WalletReplenishment[]> {
  const db = getFirestoreDb();
  
  // 1. Get all replenishments
  const repSnap = await db.collection('wallet_replenishments').get();
  const depositsSnap = await db.collection('deposited_collections').get();
  const txSnap = await db.collection('transactions').get();

  const allDeposits = depositsSnap.docs.map(d => d.data());
  const allTxs = txSnap.docs.map(d => d.data());

  const rows: WalletReplenishment[] = repSnap.docs.map(doc => {
    const data = doc.data();
    const linkedDeposits = allDeposits.filter(d => d.wallet_replenishment_id === doc.id);
    return {
      id: doc.id,
      amount: Number(data.amount) || 0,
      source: data.source || undefined,
      referenceNo: data.reference_no || data.referenceNo || undefined,
      receiptImageUrl: data.receipt_image_url || data.receiptImageUrl || undefined,
      replenishedAt: data.replenished_at || data.replenishedAt || data.created_at || new Date().toISOString(),
      notes: data.notes || undefined,
      createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      linkedDepositsCount: linkedDeposits.length,
      linkedDepositIds: linkedDeposits.map(d => d.id),
    };
  });

  // Sort descending by replenishedAt, then createdAt
  rows.sort((a, b) => {
    const timeDiff = new Date(b.replenishedAt).getTime() - new Date(a.replenishedAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return rows.map((rep) => {
    // 1. Previous transaction before replenishment
    const prevTxs = allTxs
      .filter(t => t.new_balance != null && t.transaction_time <= rep.replenishedAt)
      .sort((a, b) => {
        const timeDiff = new Date(b.transaction_time).getTime() - new Date(a.transaction_time).getTime();
        if (timeDiff !== 0) return timeDiff;
        return b.id.localeCompare(a.id);
      });

    const prevTx = prevTxs[0];

    if (prevTx) {
      const intermediateReps = rows.filter(r => 
        r.replenishedAt > prevTx.transaction_time && 
        (r.replenishedAt < rep.replenishedAt || (r.replenishedAt === rep.replenishedAt && r.id < rep.id))
      );
      const intermediateRepsSum = intermediateReps.reduce((sum, r) => sum + r.amount, 0);

      const intermediateTxs = allTxs.filter(t => 
        t.transaction_time > prevTx.transaction_time && t.transaction_time <= rep.replenishedAt
      );
      const txDeductionsSum = intermediateTxs.reduce((sum, t) => sum + (Number(t.wallet_deduction) || 0), 0);

      const balanceBefore = Number(prevTx.new_balance) + intermediateRepsSum - txDeductionsSum;
      const computedNewBalance = balanceBefore + Number(rep.amount);
      return { ...rep, balanceBefore, computedNewBalance };
    }

    // 2. Next transaction after replenishment
    const nextTxs = allTxs
      .filter(t => t.old_balance != null && t.transaction_time >= rep.replenishedAt)
      .sort((a, b) => {
        const timeDiff = new Date(a.transaction_time).getTime() - new Date(b.transaction_time).getTime();
        if (timeDiff !== 0) return timeDiff;
        return a.id.localeCompare(b.id);
      });

    const nextTx = nextTxs[0];

    if (nextTx) {
      const laterReps = rows.filter(r => 
        (r.replenishedAt > rep.replenishedAt || (r.replenishedAt === rep.replenishedAt && r.id > rep.id)) &&
        r.replenishedAt < nextTx.transaction_time
      );
      const laterRepsSum = laterReps.reduce((sum, r) => sum + r.amount, 0);

      const intermediateTxs = allTxs.filter(t => 
        t.transaction_time > rep.replenishedAt && t.transaction_time < nextTx.transaction_time
      );
      const intermediateDeductionsSum = intermediateTxs.reduce((sum, t) => sum + (Number(t.wallet_deduction) || 0), 0);

      let computedNewBalance = Number(nextTx.old_balance) - laterRepsSum + intermediateDeductionsSum;
      let balanceBefore = computedNewBalance - Number(rep.amount);
      if (balanceBefore < 0) {
        balanceBefore = 0;
        computedNewBalance = Number(rep.amount);
      }
      return { ...rep, balanceBefore, computedNewBalance };
    }

    // 3. Fallback
    return { ...rep, balanceBefore: 0, computedNewBalance: Number(rep.amount) };
  });
}

export async function createReplenishment(params: {
  amount: number;
  source?: string;
  referenceNo?: string;
  receiptImageUrl?: string;
  replenishedAt?: string;
  notes?: string;
  linkedDepositIds?: string[];
}): Promise<WalletReplenishment> {
  const db = getFirestoreDb();
  const id = 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const now = new Date().toISOString();
  const replenishedAt = params.replenishedAt || now;
  const receiptImageUrl = params.receiptImageUrl ? params.receiptImageUrl.trim() : null;

  const batch = db.batch();

  // Create replenishment doc
  const repRef = db.collection('wallet_replenishments').doc(id);
  batch.set(repRef, {
    id,
    amount: params.amount,
    source: params.source || null,
    reference_no: params.referenceNo || null,
    receipt_image_url: receiptImageUrl,
    replenished_at: replenishedAt,
    notes: params.notes || null,
    created_at: now,
  });

  // If linked deposits are specified, mark them as replenished and associate with this replenishment
  if (params.linkedDepositIds && params.linkedDepositIds.length > 0) {
    for (const depId of params.linkedDepositIds) {
      const depRef = db.collection('deposited_collections').doc(depId);
      batch.update(depRef, {
        is_replenished: 1,
        replenished_at: replenishedAt,
        wallet_replenishment_id: id,
      });
    }
  }

  await batch.commit();

  return {
    id,
    amount: params.amount,
    source: params.source,
    referenceNo: params.referenceNo,
    receiptImageUrl: receiptImageUrl || undefined,
    replenishedAt,
    notes: params.notes,
    linkedDepositIds: params.linkedDepositIds,
    linkedDepositsCount: params.linkedDepositIds ? params.linkedDepositIds.length : 0,
    createdAt: now,
  };
}

export async function deleteReplenishment(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  const batch = db.batch();

  // Revert any linked deposits back to unreplenished
  const linkedDepositsSnap = await db.collection('deposited_collections')
    .where('wallet_replenishment_id', '==', id)
    .get();

  for (const doc of linkedDepositsSnap.docs) {
    batch.update(doc.ref, {
      is_replenished: 0,
      replenished_at: null,
      wallet_replenishment_id: null,
    });
  }

  const repRef = db.collection('wallet_replenishments').doc(id);
  batch.delete(repRef);

  await batch.commit();
  return true;
}

export async function getReplenishmentTotal(): Promise<number> {
  const db = getFirestoreDb();
  const snap = await db.collection('wallet_replenishments').get();
  let total = 0;
  for (const doc of snap.docs) {
    total += Number(doc.data().amount) || 0;
  }
  return total;
}
