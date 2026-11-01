import * as XLSX from 'xlsx';
import { Transaction, TransactionStatus } from '@/domain/types';
import { computeTransactionFinancials } from '@/domain/math';
import { generateDeterministicTransactionId } from '@/domain/deduplication';
import { normalizeLpbDate } from './date-util';

export function parseBillsFile(
  buffer: Buffer | ArrayBuffer | Uint8Array,
  targetMachineId: string,
  batchId: string
): Transaction[] {
  const data = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  const wb = XLSX.read(data, { type: data instanceof Uint8Array ? 'array' : 'buffer' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);

  const transactions: Transaction[] = [];
  const now = new Date().toISOString();

  for (const row of rawRows) {
    const rawDate = row['Date'] || row['date'];
    const reference = row['Reference'] ? String(row['Reference']).trim() : null;
    const biller = row['Biller'] ? String(row['Biller']).trim() : null;
    const accountNumber = row['Account Number'] ? String(row['Account Number']).trim() : null;
    const customerName = row['Customer Name'] ? String(row['Customer Name']).trim() : null;
    const amount = Number(row['Amount']) || 0;
    const fee = row['Fee'] !== undefined && row['Fee'] !== null && String(row['Fee']).trim() !== '' ? Number(row['Fee']) : 0;
    const hasInserted = row['Inserted Amount'] !== undefined && row['Inserted Amount'] !== null && String(row['Inserted Amount']).trim() !== '';
    const insertedAmount = hasInserted ? Number(row['Inserted Amount']) : (amount + fee);
    const oldBalance = row['Old Balance'] !== undefined && row['Old Balance'] !== null && String(row['Old Balance']).trim() !== '' ? Number(row['Old Balance']) : null;
    const newBalance = row['New Balance'] !== undefined && row['New Balance'] !== null && String(row['New Balance']).trim() !== '' ? Number(row['New Balance']) : null;
    const rawStatus = String(row['Status'] || 'Succeeded').trim().toUpperCase();
    const notes = row['Notes'] ? String(row['Notes']).trim() : null;

    let status: TransactionStatus = 'SUCCEEDED';
    if (rawStatus.includes('FAIL')) status = 'FAILED';
    else if (rawStatus.includes('PEND')) status = 'PENDING';

    const isoDate = normalizeLpbDate(rawDate as string | number | Date);

    const financials = computeTransactionFinancials({
      serviceType: 'BILLS_PAYMENT',
      amount,
      fee,
      insertedAmount,
      oldBalance,
      newBalance,
    });

    const id = generateDeterministicTransactionId({
      serviceType: 'BILLS_PAYMENT',
      referenceNo: reference,
      transactionTime: isoDate,
      accountOrPhone: accountNumber,
      amount,
      status,
    });

    transactions.push({
      id,
      machineId: targetMachineId,
      serviceType: 'BILLS_PAYMENT',
      referenceNo: reference,
      transactionTime: isoDate,
      accountOrPhone: accountNumber,
      customerName,
      providerOrBiller: biller,
      subType: 'BILLS',
      amount: financials.amount,
      fee: financials.fee,
      insertedAmount: financials.insertedAmount,
      walletDeduction: financials.walletDeduction,
      providerCost: financials.providerCost,
      netProfit: financials.netProfit,
      oldBalance,
      newBalance,
      status,
      notes,
      importBatchId: batchId,
      createdAt: now,
    });
  }

  return transactions;
}
