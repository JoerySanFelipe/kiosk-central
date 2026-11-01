import * as XLSX from 'xlsx';
import { ServiceType, Transaction } from '@/domain/types';
import { parseBillsFile } from './bills-parser';
import { parseCashInFile } from './cash-in-parser';
import { parseLoadFile } from './load-parser';
import { parsePisoWifiFile } from './piso-wifi-parser';

export interface ParseResult {
  detectedService: ServiceType;
  transactions: Transaction[];
  fileName: string;
}

export function autoDetectAndParse(
  fileName: string,
  buffer: Buffer | ArrayBuffer | Uint8Array,
  targetMachineId: string,
  batchId: string
): ParseResult {
  const lowerName = fileName.toLowerCase();
  const data = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;

  // 1. CSV Check: Piso WiFi
  if (lowerName.endsWith('.csv')) {
    const textContent = typeof buffer === 'string'
      ? buffer
      : ('toString' in buffer && typeof buffer.toString === 'function' && !(buffer instanceof ArrayBuffer) && !(buffer instanceof Uint8Array))
        ? (buffer as any).toString('utf-8')
        : new TextDecoder('utf-8').decode(data);
    if (textContent.includes('MAC') || textContent.includes('Station') || textContent.includes('Trans Time')) {
      const transactions = parsePisoWifiFile(textContent, targetMachineId, batchId);
      return {
        detectedService: 'PISO_WIFI',
        transactions,
        fileName,
      };
    }
  }

  // 2. Excel Check: Inspect Workbook Sheets & Headers
  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const wb = XLSX.read(data, { type: data instanceof Uint8Array ? 'array' : 'buffer' });
    const sheetName = wb.SheetNames[0] || '';
    const lowerSheet = sheetName.toLowerCase();

    // Check Sheet name clues
    if (lowerSheet.includes('bill') || lowerName.includes('bill')) {
      const transactions = parseBillsFile(buffer, targetMachineId, batchId);
      return { detectedService: 'BILLS_PAYMENT', transactions, fileName };
    }

    if (lowerSheet.includes('cash-in') || lowerSheet.includes('cashin') || lowerName.includes('cash-in') || lowerName.includes('cashin')) {
      const transactions = parseCashInFile(buffer, targetMachineId, batchId);
      return { detectedService: 'CASH_IN', transactions, fileName };
    }

    if (lowerSheet.includes('load') || lowerName.includes('load')) {
      const transactions = parseLoadFile(buffer, targetMachineId, batchId);
      return { detectedService: 'E_LOAD', transactions, fileName };
    }

    // Inspect columns of the first sheet
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
    if (rows && rows.length > 0) {
      const headerStr = JSON.stringify(rows[0]).toLowerCase();
      if (headerStr.includes('biller')) {
        return { detectedService: 'BILLS_PAYMENT', transactions: parseBillsFile(buffer, targetMachineId, batchId), fileName };
      }
      if (headerStr.includes('payment method')) {
        return { detectedService: 'CASH_IN', transactions: parseCashInFile(buffer, targetMachineId, batchId), fileName };
      }
      if (headerStr.includes('load type') || headerStr.includes('provider')) {
        return { detectedService: 'E_LOAD', transactions: parseLoadFile(buffer, targetMachineId, batchId), fileName };
      }
    }
  }

  // Fallback if name matches
  if (lowerName.includes('wifi')) {
    const transactions = parsePisoWifiFile(buffer.toString('utf-8'), targetMachineId, batchId);
    return { detectedService: 'PISO_WIFI', transactions, fileName };
  }

  throw new Error(`Unable to recognize file structure for "${fileName}". Please ensure it is an exported file from LPB Kiosk or LPB Piso WiFi 2.0.`);
}
