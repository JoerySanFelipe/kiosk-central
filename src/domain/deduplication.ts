import { ServiceType } from './types';

/**
 * Deterministic unique key generator for LPB transactions.
 * Guarantees zero duplicate counting across repeated full-history uploads.
 */

export interface KeyGenerationParams {
  serviceType: ServiceType;
  referenceNo?: string | null;
  transactionTime: string; // ISO or formatted date
  accountOrPhone?: string | null;
  amount: number;
  stationOrMac?: string | null;
  status?: string | null;
}

export function generateDeterministicTransactionId(params: KeyGenerationParams): string {
  const servicePrefix = params.serviceType.toLowerCase();

  // 1. If valid Reference number exists (common for Succeeded Cash-In, Load, Bills)
  if (params.referenceNo && params.referenceNo.trim().length > 0) {
    return `${servicePrefix}:${params.referenceNo.trim()}`;
  }

  // 2. For Piso WiFi (which lacks Reference column in LPB export)
  if (params.serviceType === 'PISO_WIFI') {
    const cleanStationMac = (params.stationOrMac || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTime = params.transactionTime.replace(/[^0-9]/g, '');
    return `wifi:${cleanTime}_${cleanStationMac}_${params.amount}`;
  }

  // 3. For Failed / Expired Cash-In records without a Reference number
  const cleanPhone = (params.accountOrPhone || 'unknown').replace(/[^0-9]/g, '');
  const cleanTime = params.transactionTime.replace(/[^0-9]/g, '');
  return `${servicePrefix}:unreferenced:${cleanTime}_${cleanPhone}_${params.amount}_${params.status || 'unknown'}`;
}
