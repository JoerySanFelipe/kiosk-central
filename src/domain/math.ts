import { ServiceType } from './types';

/**
 * Pure Mathematical Invariants for LPB Kiosk and Piso WiFi Financials.
 * Enforces zero-rounding drift and predictable accounting.
 */

export interface TransactionMathInput {
  serviceType: ServiceType;
  amount: number;
  fee?: number;
  insertedAmount?: number;
  oldBalance?: number | null;
  newBalance?: number | null;
  isPersonalDraw?: boolean;
}

export interface TransactionMathResult {
  amount: number;
  fee: number;
  insertedAmount: number;
  walletDeduction: number;
  providerCost: number;
  netProfit: number;
}

export function roundToCentavos(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function computeTransactionFinancials(input: TransactionMathInput): TransactionMathResult {
  const amount = roundToCentavos(Number(input.amount) || 0);
  const fee = roundToCentavos(Number(input.fee) || 0);
  const insertedAmount = roundToCentavos(
    input.insertedAmount !== undefined && input.insertedAmount !== null
      ? Number(input.insertedAmount)
      : (amount + fee)
  );

  if (input.serviceType === 'PISO_WIFI') {
    // Piso WiFi has no digital wallet deduction
    return {
      amount,
      fee: 0,
      insertedAmount: amount,
      walletDeduction: 0,
      providerCost: 0,
      netProfit: amount, // 100% of coin drops are revenue
    };
  }

  // For Cash In, E-Load, and Bills Payment
  let walletDeduction = 0;
  if (
    input.oldBalance !== undefined &&
    input.oldBalance !== null &&
    input.newBalance !== undefined &&
    input.newBalance !== null
  ) {
    walletDeduction = roundToCentavos(Math.max(0, input.oldBalance - input.newBalance));
  } else {
    // If balance was not recorded, default deduction to face amount
    walletDeduction = amount;
  }

  // Provider cost is the difference between wallet deduction and face amount
  const providerCost = roundToCentavos(Math.max(0, walletDeduction - amount));

  // Net Profit is the physical cash inserted minus what was drained from master wallet
  // For personal withdrawals / owner draws, this is an equity transfer, NOT an operating loss.
  const netProfit = input.isPersonalDraw ? 0 : roundToCentavos(insertedAmount - walletDeduction);

  return {
    amount,
    fee,
    insertedAmount,
    walletDeduction,
    providerCost,
    netProfit,
  };
}
