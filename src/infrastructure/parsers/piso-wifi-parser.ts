import Papa from 'papaparse';
import { Transaction } from '@/domain/types';
import { computeTransactionFinancials } from '@/domain/math';
import { generateDeterministicTransactionId } from '@/domain/deduplication';

interface PisoWifiRow {
  Date: string;
  IP?: string;
  MAC?: string;
  'Trans Time'?: string;
  Type?: string;
  Station?: string;
  Time?: string;
  Amount?: string | number;
}

export function parsePisoWifiFile(
  content: string,
  targetMachineId: string,
  batchId: string
): Transaction[] {
  const parsed = Papa.parse<PisoWifiRow>(content, {
    header: true,
    skipEmptyLines: true,
  });

  const transactions: Transaction[] = [];
  const now = new Date().toISOString();

  for (const row of parsed.data) {
    if (!row.Date || !row.Amount) continue;

    const dateStr = String(row.Date).trim();
    const timeStr = String(row['Trans Time'] || '00:00:00').trim();
    const mac = String(row.MAC || '').trim();
    const station = String(row.Station || 'Main Vendo').trim();
    const duration = String(row.Time || '').trim();
    const amount = Number(row.Amount) || 0;

    // ISO timestamp from "2026-10-24" + "10:55:16"
    let isoTime: string;
    try {
      const dt = new Date(`${dateStr}T${timeStr}`);
      isoTime = isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
    } catch {
      isoTime = new Date().toISOString();
    }

    const financials = computeTransactionFinancials({
      serviceType: 'PISO_WIFI',
      amount,
    });

    const id = generateDeterministicTransactionId({
      serviceType: 'PISO_WIFI',
      transactionTime: isoTime,
      stationOrMac: `${station}_${mac}`,
      amount,
    });

    transactions.push({
      id,
      machineId: targetMachineId,
      serviceType: 'PISO_WIFI',
      referenceNo: mac ? `MAC:${mac}` : null,
      transactionTime: isoTime,
      accountOrPhone: mac || null,
      customerName: station,
      providerOrBiller: 'PISO_WIFI',
      subType: duration || 'time',
      amount: financials.amount,
      fee: 0,
      insertedAmount: financials.insertedAmount,
      walletDeduction: 0,
      providerCost: 0,
      netProfit: financials.netProfit,
      oldBalance: null,
      newBalance: null,
      status: 'SUCCEEDED',
      notes: row.IP ? `IP: ${row.IP} | Station: ${station}` : `Station: ${station}`,
      importBatchId: batchId,
      createdAt: now,
    });
  }

  return transactions;
}
