export type ServiceType = 'PISO_WIFI' | 'CASH_IN' | 'E_LOAD' | 'BILLS_PAYMENT';

export type TransactionStatus = 'SUCCEEDED' | 'FAILED' | 'PENDING';

export interface Machine {
  id: string;
  name: string;
  contactNumber?: string | null;
  location?: string | null;
  stationName?: string; // e.g. "Main Vendo" for Piso WiFi matching
  isDefault?: boolean;
  createdAt: string;
}

export interface WalletReplenishment {
  id: string;
  amount: number;
  source?: string | null;
  referenceNo?: string | null;
  receiptImageUrl?: string | null;
  replenishedAt: string;
  balanceBefore?: number;
  computedNewBalance?: number;
  notes?: string | null;
  linkedDepositIds?: string[];
  linkedDepositsCount?: number;
  createdAt: string;
}

export type DepositType = 'BANK_DEPOSIT' | 'CASH_HANDOVER';

export type HarvestAdjustmentType = 'NONE' | 'ADD' | 'LESS';
export type AdjustmentAction = 'ADD' | 'DEDUCT';
export type AdjustmentTarget = 'EXPECTED' | 'PHYSICAL';

export interface HarvestAdjustmentItem {
  id: string;
  type: AdjustmentAction;
  target?: AdjustmentTarget; // 'EXPECTED' (default) or 'PHYSICAL'
  amount: number;
  description: string;
}

export interface CashHarvest {
  id: string;
  machineId: string;
  machineName?: string;
  harvestedAt: string;
  reportingDate?: string | null;
  reportName?: string | null;
  rawExpectedAmount?: number; // Expected cash from system records before adjustments
  expectedAmount: number; // Final adjusted expected cash (= rawExpectedAmount +/- expectedAdjustments)
  baseAmount?: number | null; // Physical cash counted before physical adjustments
  adjustments?: HarvestAdjustmentItem[]; // Multiple add/deduct line items
  totalAdded?: number;
  totalDeducted?: number;
  netAdjustment?: number;
  adjustmentType?: HarvestAdjustmentType | null; // Compatibility
  adjustmentAmount?: number; // Compatibility
  adjustmentReason?: string | null; // Compatibility
  actualAmount: number; // Final net collected cash to deposit (= baseAmount +/- physicalAdjustments)
  variance: number; // actualAmount - expectedAmount
  collectedBy: string;
  depositedCollectionId?: string | null;
  isDeposited?: boolean;
  slipImageUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface DepositedCollection {
  id: string;
  depositDate: string;
  depositType: DepositType;
  referenceNo?: string | null;
  expectedAmount: number;
  actualAmount: number;
  variance: number;
  depositedBy: string;
  receivedBy?: string | null;
  slipImageUrl?: string | null;
  notes?: string | null;
  isReplenished?: boolean;
  replenishedAt?: string | null;
  walletReplenishmentId?: string | null;
  linkedHarvestsCount?: number;
  linkedHarvests?: CashHarvest[];
  createdAt: string;
}

export interface DepositSummary {
  undepositedCashInTransit: number;
  undepositedHarvestsCount: number;
  totalBankDeposited: number;
  totalCashHandedOver: number;
  totalVariance: number;
  totalUnreplenishedAmount: number;
  unreplenishedCount: number;
  totalReplenishedAmount: number;
  replenishedCount: number;
  // Audit & Wallet Reconciliation Breakdown fields
  actualWalletReloadAmount?: number;
  bankTransferFee?: number;
  startingCapital?: number;
  totalWalletInflow?: number;
  totalWalletDeduction?: number;
  kioskWalletDrain?: number;
  personalDraws?: number;
  remainingWalletBalance?: number;
  capitalAccountedAmount?: number;
  capitalInWallet?: number;
  capitalInBank?: number;
  capitalInTransitAndDraws?: number;
  unreplenishedDepositsList?: Array<{
    id: string;
    depositDate: string;
    amount: number;
    referenceNo?: string | null;
  }>;
  undepositedHarvestsList?: Array<{
    id: string;
    harvestedAt: string;
    amount: number;
    collector: string;
  }>;
}

export interface MachineVaultSummary {
  machineId: string;
  machineName: string;
  currentCashInVault: number;
  uncollectedTransactionsCount: number;
  lastHarvest?: CashHarvest | null;
  totalGrossVolume: number;
  totalNetProfit: number;
}

export interface Transaction {
  id: string; // Deterministic unique key (e.g. "cash_in:2046476261933" or "wifi:hash")
  machineId: string;
  machineName?: string;
  serviceType: ServiceType;
  referenceNo?: string | null;
  transactionTime: string; // ISO string
  accountOrPhone?: string | null;
  customerName?: string | null;
  providerOrBiller?: string | null; // e.g. "GCASH", "PAYMAYA", "GLOBE", "CONVERGE_ICT"
  subType?: string | null; // e.g. "GOEXTRA99", "7 hrs", "time"
  
  // Financial amounts
  amount: number; // Face value of load/bill/wifi/cash-in
  fee: number; // Convenience fee charged to customer
  insertedAmount: number; // Actual physical cash put into hopper/bill acceptor
  walletDeduction: number; // (oldBalance - newBalance), 0 for Piso WiFi
  providerCost: number; // (walletDeduction - amount)
  netProfit: number; // insertedAmount - walletDeduction (or pure inserted for WiFi)
  
  // Wallet tracking
  oldBalance?: number | null;
  newBalance?: number | null;

  status: TransactionStatus;
  isPersonalDraw?: boolean;
  notes?: string | null;
  importBatchId?: string | null;
  createdAt: string;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  serviceType: ServiceType | 'AUTO';
  targetMachineId: string;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  importedAt: string;
}

export interface FinancialSummary {
  totalGrossVolume: number; // Sum of face value amounts (excluding personal draws)
  totalInsertedCash: number; // Total physical cash collected in kiosk boxes
  totalWalletDeduction: number; // Total drained from LPB master wallet
  totalPersonalDraws?: number; // Total owner personal withdrawals
  totalKioskWalletDeduction?: number; // Total wallet deductions strictly for customer kiosk transactions
  totalNetProfit: number; // True net earnings
  totalTransactionsCount: number;
  breakdown: {
    cashIn: ServiceMetric;
    load: ServiceMetric;
    bills: ServiceMetric;
    pisoWifi: ServiceMetric;
  };
  reconciliation: {
    physicalCashToCollect: number;
    walletReplenishmentNeeded: number;
    kioskReplenishmentNeeded?: number;
    personalDrawsDeduction?: number;
    currentEstimatedWalletBalance?: number;
  };
  machineDeductions?: {
    machineId: string;
    machineName: string;
    totalDeduction: number;
  }[];
  lastImportAt?: string | null;
}

export interface ServiceMetric {
  serviceType: ServiceType;
  label: string;
  volume: number;
  netProfit: number;
  cashInserted: number;
  walletDeduction: number;
  transactionCount: number;
}
