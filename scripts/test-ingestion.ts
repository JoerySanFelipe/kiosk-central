import fs from 'fs';
import path from 'path';
import { autoDetectAndParse } from '../src/infrastructure/parsers/auto-detector';
import { upsertTransactions, computeFinancialSummary } from '../src/infrastructure/repositories/transaction-repo';

async function main() {
  const baseDir = path.resolve(process.cwd(), 'exported_transactions-files');
  const files = [
    'lpbkiosk-bills-transactions (1).xlsx',
    'lpbkiosk-cash-in-transactions (3).xlsx',
    'lpbkiosk-load-transactions (3).xlsx',
    'sales_inventory_2026-01-01_to_2026-12-31 (2).csv',
  ];

  console.log('--- TEST PASS 1: Initial Ingestion of All 4 Files ---');
  let totalProcessedPass1 = 0;
  let totalInsertedPass1 = 0;

  for (const fileName of files) {
    const filePath = path.join(baseDir, fileName);
    if (!fs.existsSync(filePath)) continue;
    const buffer = fs.readFileSync(filePath);
    const result = autoDetectAndParse(fileName, buffer, 'm1', 'test_batch_1');
    const upsert = await upsertTransactions(result.transactions);
    console.log(`[PASS 1] ${fileName} (${result.detectedService}): Total=${upsert.total}, Inserted=${upsert.inserted}, Skipped=${upsert.skipped}`);
    totalProcessedPass1 += upsert.total;
    totalInsertedPass1 += upsert.inserted;
  }

  const summaryPass1 = await computeFinancialSummary();
  console.log('\n--- PASS 1 FINANCIAL SUMMARY ---');
  console.log(`Total Gross Volume: ₱${summaryPass1.totalGrossVolume.toLocaleString()}`);
  console.log(`Physical Cash in Vault: ₱${summaryPass1.totalInsertedCash.toLocaleString()}`);
  console.log(`Master Wallet Deduction: ₱${summaryPass1.totalWalletDeduction.toLocaleString()}`);
  console.log(`Net Profit: ₱${summaryPass1.totalNetProfit.toLocaleString()}`);
  console.log(`Total Transactions Count: ${summaryPass1.totalTransactionsCount}`);
}

main().catch(console.error);
