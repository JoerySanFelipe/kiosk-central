import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Machine, Transaction, MachineVaultSummary, CashHarvest, ServiceType } from '@/domain/types';

export interface ExportReportOptions {
  machine: Machine;
  vaultSummary?: MachineVaultSummary | null;
  transactions: Transaction[];
  serviceFilter: string;
  categoryFilter?: string;
  currency?: string;
}

export function getServiceFilterLabel(serviceType: string): string {
  switch (serviceType) {
    case 'CASH_IN':
      return 'Cash In Only';
    case 'E_LOAD':
      return 'E-Load Only';
    case 'BILLS_PAYMENT':
      return 'Bills Payment Only';
    case 'PISO_WIFI':
      return 'Piso WiFi Only';
    default:
      return 'All Methods';
  }
}

export function formatServiceType(st: ServiceType): string {
  switch (st) {
    case 'CASH_IN':
      return 'Cash-In';
    case 'E_LOAD':
      return 'Load';
    case 'BILLS_PAYMENT':
      return 'Bills Payment';
    case 'PISO_WIFI':
      return 'Piso Wifi';
    default:
      return st;
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Generates and downloads a formatted Excel (.xlsx) workbook for a machine's statement
 */
export function exportMachineToExcel(options: ExportReportOptions): void {
  const { machine, vaultSummary, transactions, serviceFilter, currency = '₱' } = options;
  const filterLabel = getServiceFilterLabel(serviceFilter);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Calculate totals from transactions
  let totalGross = 0;
  let totalFee = 0;
  let totalInserted = 0;
  let totalDeduction = 0;
  let totalProfit = 0;

  for (const t of transactions) {
    if (t.status === 'SUCCEEDED') {
      if (!t.isPersonalDraw) {
        totalGross += t.amount;
        totalFee += t.fee;
        totalInserted += t.insertedAmount;
      }
      totalDeduction += t.walletDeduction;
      totalProfit += t.netProfit;
    }
  }

  // Build spreadsheet grid (Array of Arrays)
  const aoa: (string | number)[][] = [
    ['LPB KIOSK CENTRAL — TERMINAL FINANCIAL STATEMENT'],
    [`Terminal Name:`, machine.name, `Location:`, machine.location || 'N/A', `Station:`, machine.stationName || 'N/A'],
    [`Report Export Date:`, `${dateFormatted} ${timeFormatted}`, `Applied Method Filter:`, filterLabel],
    [],
    // KPI Summary Header
    ['EXECUTIVE SUMMARY', '', '', ''],
    ['Uncollected Cash in Box', 'Gross Customer Sales', 'Total Net Profit', 'Transactions Count'],
    [
      `${currency}${(vaultSummary?.currentCashInVault ?? totalInserted).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `${currency}${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `+${currency}${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      transactions.length,
    ],
    [],
    // Data Table Header
    [
      '#',
      'Date & Time',
      'Category',
      'Reference #',
      'Phone / Account #',
      'Provider / Method / Biller',
      `Service Charge (${currency})`,
      `Amount (${currency})`,
      `Transaction Fee (${currency})`,
      `Total (Amt+Fee) (${currency})`,
      `Inserted Cash (${currency})`,
      `Overpayment (${currency})`,
      `Net Profit (${currency})`,
      `Starting Wallet Balance (${currency})`,
      `Ending Wallet Balance (${currency})`,
      'Status',
      'Notes',
    ],
  ];

  let sumMachineServiceCharge = 0;
  let sumMachineTotalAmtFee = 0;
  let sumMachineOverpayment = 0;

  // Append data rows
  transactions.forEach((t, index) => {
    const isWifi = t.serviceType === 'PISO_WIFI';
    const faceAmt = isWifi ? 0 : (t.amount || 0);
    const feeAmt = isWifi ? 0 : (t.fee || 0);
    const totalAmtFee = isWifi ? 0 : faceAmt + feeAmt;
    const inserted = t.insertedAmount || 0;
    const overpayment = isWifi ? 0 : Math.max(0, inserted - totalAmtFee);
    const sCharge = t.providerCost || 0;

    sumMachineServiceCharge += sCharge;
    sumMachineTotalAmtFee += totalAmtFee;
    sumMachineOverpayment += overpayment;

    const formattedDate = new Date(t.transactionTime).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    aoa.push([
      index + 1,
      formattedDate,
      formatServiceType(t.serviceType),
      t.referenceNo || '—',
      t.accountOrPhone || t.customerName || '—',
      t.providerOrBiller || (isWifi ? '—' : '—'),
      isWifi ? '—' : Number(sCharge.toFixed(2)),
      isWifi ? '—' : Number(faceAmt.toFixed(2)),
      isWifi ? '—' : Number(feeAmt.toFixed(2)),
      isWifi ? '—' : Number(totalAmtFee.toFixed(2)),
      Number(inserted.toFixed(2)),
      overpayment > 0 ? Number(overpayment.toFixed(2)) : '—',
      Number((t.netProfit || 0).toFixed(2)),
      t.oldBalance !== null && t.oldBalance !== undefined ? Number(t.oldBalance.toFixed(2)) : '—',
      t.newBalance !== null && t.newBalance !== undefined ? Number(t.newBalance.toFixed(2)) : '—',
      t.status,
      t.notes || '',
    ]);
  });

  // Summary Totals Row
  aoa.push([
    'TOTAL',
    `${transactions.length} Records`,
    '',
    '',
    '',
    '',
    Math.round(sumMachineServiceCharge * 100) / 100,
    Math.round(totalGross * 100) / 100,
    Math.round(totalFee * 100) / 100,
    Math.round(sumMachineTotalAmtFee * 100) / 100,
    Math.round(totalInserted * 100) / 100,
    Math.round(sumMachineOverpayment * 100) / 100,
    Math.round(totalProfit * 100) / 100,
    '',
    '',
    '',
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set column widths for clean readability
  ws['!cols'] = [
    { wch: 5 },  // #
    { wch: 22 }, // Date & Time
    { wch: 18 }, // Ref No
    { wch: 15 }, // Method
    { wch: 26 }, // Account/Phone/Customer
    { wch: 16 }, // Face Amount
    { wch: 12 }, // Fee
    { wch: 16 }, // Cash in Vault
    { wch: 18 }, // Wallet Deduction
    { wch: 16 }, // Net Profit
    { wch: 20 }, // Record Type
    { wch: 12 }, // Status
    { wch: 30 }, // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Terminal Statement');

  const fileDateStr = now.toISOString().slice(0, 10);
  const fileName = `${sanitizeFileName(machine.name)}_Statement_${fileDateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Generates and downloads a clean, branded PDF report for a machine's financial statement
 */
export function exportMachineToPdf(options: ExportReportOptions): void {
  const { machine, vaultSummary, transactions, serviceFilter, currency = '₱' } = options;
  const filterLabel = getServiceFilterLabel(serviceFilter);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Calculate totals
  let totalGross = 0;
  let totalFee = 0;
  let totalInserted = 0;
  let totalDeduction = 0;
  let totalProfit = 0;

  for (const t of transactions) {
    if (t.status === 'SUCCEEDED') {
      if (!t.isPersonalDraw) {
        totalGross += t.amount;
        totalFee += t.fee;
        totalInserted += t.insertedAmount;
      }
      totalDeduction += t.walletDeduction;
      totalProfit += t.netProfit;
    }
  }

  // Create landscape A4 document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Crimson Brand Header Bar
  doc.setFillColor(138, 0, 0); // #8A0000
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('LPB KIOSK CENTRAL', 14, 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`TERMINAL FINANCIAL REPORT • ${machine.name.toUpperCase()}`, 14, 16);

  doc.setFontSize(8);
  doc.text(`Generated: ${dateFormatted} at ${timeFormatted}`, pageWidth - 14, 14, { align: 'right' });

  // 2. Machine Details Sub-header
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Terminal: ${machine.name}`, 14, 29);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const metaLine = `Location: ${machine.location || 'N/A'}  |  Station: ${machine.stationName || 'N/A'}  |  Filter: ${filterLabel}`;
  doc.text(metaLine, 14, 34);

  // 3. Four KPI Metric Boxes
  const kpiY = 38;
  const kpiWidth = (pageWidth - 28 - 9) / 4;
  const kpiHeight = 16;

  const kpis = [
    {
      label: 'UNCOLLECTED CASH IN BOX',
      value: `${currency}${(vaultSummary?.currentCashInVault ?? totalInserted).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      color: [138, 0, 0],
    },
    {
      label: 'GROSS CUSTOMER SALES',
      value: `${currency}${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      color: [51, 65, 85],
    },
    {
      label: 'MACHINE NET PROFIT',
      value: `+${currency}${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      color: [5, 150, 105],
    },
    {
      label: 'CONSOLIDATED TRANSACTIONS',
      value: `${transactions.length} Records`,
      color: [71, 85, 105],
    },
  ];

  kpis.forEach((kpi, i) => {
    const x = 14 + i * (kpiWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, kpiY, kpiWidth, kpiHeight, 2, 2, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3.5, kpiY + 5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x + 3.5, kpiY + 12);
  });

  // 4. Data Table via jspdf-autotable
  const tableData = transactions.map((t, idx) => {
    const formattedDate = new Date(t.transactionTime).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const isWifi = t.serviceType === 'PISO_WIFI';
    const isDraw = t.isPersonalDraw;
    const faceAmt = isWifi ? '—' : `${currency}${t.amount.toFixed(2)}`;
    const feeAmt = isWifi ? '—' : `${currency}${t.fee.toFixed(2)}`;
    const totalAmtFee = isWifi ? '—' : `${currency}${(t.amount + t.fee).toFixed(2)}`;
    const profitDisplay = isDraw ? `${currency}0.00` : `+${currency}${t.netProfit.toFixed(2)}`;

    return [
      idx + 1,
      formattedDate,
      formatServiceType(t.serviceType),
      t.referenceNo || '—',
      t.accountOrPhone || t.customerName || '—',
      faceAmt,
      feeAmt,
      totalAmtFee,
      `${currency}${t.insertedAmount.toFixed(2)}`,
      profitDisplay,
      t.status,
    ];
  });

  const tableFoot = [
    [
      'TOTAL',
      `${transactions.length} Records`,
      '',
      '',
      '',
      `${currency}${totalGross.toFixed(2)}`,
      `${currency}${totalFee.toFixed(2)}`,
      `${currency}${(totalGross + totalFee).toFixed(2)}`,
      `${currency}${totalInserted.toFixed(2)}`,
      `+${currency}${totalProfit.toFixed(2)}`,
      '',
    ],
  ];

  autoTable(doc, {
    startY: 58,
    margin: { left: 14, right: 14, bottom: 15 },
    head: [[
      '#',
      'Date & Time',
      'Category',
      'Reference #',
      'Phone / Account #',
      `Amount`,
      `Transaction Fee`,
      `Total (Amt+Fee)`,
      `Inserted Cash`,
      `Net Profit`,
      'Status',
    ]],
    body: tableData,
    foot: tableFoot,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      font: 'helvetica',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [138, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 22 },
      3: { cellWidth: 26 },
      4: { cellWidth: 34 },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 24, halign: 'right' },
      8: { cellWidth: 24, halign: 'right' },
      9: { cellWidth: 24, halign: 'right' },
      10: { cellWidth: 20, halign: 'center' },
    },
    didDrawPage: (data) => {
      // Bottom footer on every page
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} • Confidential Financial Record • LPB Kiosk Central Management System`,
        14,
        pageHeight - 6
      );
    },
  });

  const fileDateStr = now.toISOString().slice(0, 10);
  const fileName = `${sanitizeFileName(machine.name)}_Report_${fileDateStr}.pdf`;
  doc.save(fileName);
}

export interface ExportHarvestOptions {
  harvest: CashHarvest;
  transactions: Transaction[];
  machine?: Machine | null;
  currency?: string;
}

/**
 * Generates and downloads a formatted Excel (.xlsx) workbook for a specific Cash Harvest Statement
 */
export function exportHarvestToExcel(options: ExportHarvestOptions): void {
  const { harvest, transactions, machine, currency = '₱' } = options;
  const terminalName = machine?.name || harvest.machineName || 'Vendo Terminal';
  const harvestDate = new Date(harvest.harvestedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const varianceLabel =
    harvest.variance === 0
      ? 'BALANCED (₱0.00)'
      : harvest.variance < 0
      ? `SHORTAGE (-${currency}${Math.abs(harvest.variance).toFixed(2)})`
      : `OVERAGE (+${currency}${harvest.variance.toFixed(2)})`;

  // Wallet balance progression calculations
  const chronologicalTx = [...transactions].sort(
    (a, b) => new Date(a.transactionTime).getTime() - new Date(b.transactionTime).getTime()
  );
  const walletTx = transactions.filter(
    (t) => t.serviceType !== 'PISO_WIFI' || (t.walletDeduction || 0) > 0
  );
  const totalWalletFaceAmount = walletTx.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalProvidedCharge = walletTx.reduce((acc, t) => acc + (t.providerCost || 0), 0);
  const firstBalTx = chronologicalTx.find((t) => t.oldBalance !== null && t.oldBalance !== undefined);
  const startingBalVal = firstBalTx && firstBalTx.oldBalance !== null && firstBalTx.oldBalance !== undefined
    ? Number(firstBalTx.oldBalance)
    : null;
  const lastBalTx = [...chronologicalTx].reverse().find((t) => t.newBalance !== null && t.newBalance !== undefined);
  const endingBalVal = lastBalTx && lastBalTx.newBalance !== null && lastBalTx.newBalance !== undefined
    ? Number(lastBalTx.newBalance)
    : (startingBalVal !== null ? startingBalVal - (totalWalletFaceAmount + totalProvidedCharge) : null);
  const totalHarvestProfit = transactions.reduce((acc, t) => acc + (t.netProfit || 0), 0);

  const rows: (string | number)[][] = [
    ['LPB KIOSK CENTRAL - CASH HARVEST & COLLECTION STATEMENT'],
    ['Generated On:', new Date().toLocaleString('en-US')],
    [],
    ['--- COLLECTION METADATA ---'],
    ['Terminal Name:', terminalName],
    ['Terminal Location:', machine?.location || '—'],
    ['Collector Name:', harvest.collectedBy],
    ['Collection Date & Time:', harvestDate],
    ['Deposit Status:', harvest.isDeposited ? 'DEPOSITED' : 'PENDING DEPOSIT'],
    ['General Notes:', harvest.notes || '—'],
    [],
    ['--- COLLECTION SUMMARY ---'],
    ['Metric', 'Amount', 'Remarks'],
    ['Inserted Cash:', `${currency}${harvest.expectedAmount.toFixed(2)}`, harvest.rawExpectedAmount ? `Raw System: ${currency}${harvest.rawExpectedAmount.toFixed(2)}` : 'System Records'],
    ['Physical Counted:', `${currency}${(harvest.baseAmount ?? harvest.actualAmount).toFixed(2)}`, 'Physical cash counted'],
    ['Variance:', `${harvest.variance >= 0 ? '+' : ''}${currency}${harvest.variance.toFixed(2)}`, varianceLabel],
    ['Net Profit (Kita):', `+${currency}${totalHarvestProfit.toFixed(2)}`, 'Total profit earned from transactions'],
    [],
    ['--- WALLET BALANCE SUMMARY ---'],
    ['Metric', 'Amount', 'Remarks'],
    ['Starting Balance:', startingBalVal !== null ? `${currency}${startingBalVal.toFixed(2)}` : '—', 'Wallet before 1st transaction'],
    ['less Amount:', totalWalletFaceAmount > 0 ? `-${currency}${totalWalletFaceAmount.toFixed(2)}` : `${currency}0.00`, 'Customer transaction principal'],
    ['less service Charge:', totalProvidedCharge > 0 ? `-${currency}${totalProvidedCharge.toFixed(2)}` : `${currency}0.00`, 'Provider fee / cost deducted'],
    ['Ending Balance:', endingBalVal !== null ? `${currency}${endingBalVal.toFixed(2)}` : '—', 'Wallet balance at cutoff'],
    [],
  ];

  // Adjustments list if any
  if (harvest.adjustments && harvest.adjustments.length > 0) {
    rows.push(['--- ITEMIZED ADJUSTMENTS BREAKDOWN ---']);
    rows.push(['#', 'Target', 'Type', 'Amount', 'Reason / Description']);
    harvest.adjustments.forEach((adj, idx) => {
      rows.push([
        idx + 1,
        adj.target === 'PHYSICAL' ? 'Physical Cash' : 'Vault Expectation',
        adj.type === 'ADD' ? '+ ADD' : '- DEDUCT',
        `${adj.type === 'ADD' ? '+' : '-'}${currency}${adj.amount.toFixed(2)}`,
        adj.description || '—',
      ]);
    });
    rows.push([]);
  }

  // Covered Transactions Table matching standardized spreadsheet columns
  rows.push(['--- COVERED TRANSACTIONS IN THIS COLLECTION ---']);
  rows.push([
    '#',
    'Date & Time',
    'Category',
    'Reference #',
    'Phone / Account #',
    'Provider / Method / Biller',
    'Service Charge',
    'Amount',
    'Transaction Fee',
    'Total (Amt+Fee)',
    'Inserted Cash',
    'Overpayment',
    'Net Profit',
    'Starting Wallet Balance',
    'Ending Wallet Balance',
  ]);

  let sumAmount = 0;
  let sumFee = 0;
  let sumTotalAmtFee = 0;
  let sumInserted = 0;
  let sumOverpayment = 0;
  let sumServiceCharge = 0;
  let sumProfit = 0;

  transactions.forEach((tx, idx) => {
    const isWifi = tx.serviceType === 'PISO_WIFI';
    const faceAmt = isWifi ? 0 : (tx.amount || 0);
    const feeAmt = isWifi ? 0 : (tx.fee || 0);
    const totalAmtFee = isWifi ? 0 : faceAmt + feeAmt;
    const inserted = tx.insertedAmount || 0;
    const overpayment = isWifi ? 0 : Math.max(0, inserted - totalAmtFee);
    const sCharge = tx.providerCost || 0;
    const profit = tx.netProfit || 0;

    sumAmount += faceAmt;
    sumFee += feeAmt;
    sumTotalAmtFee += totalAmtFee;
    sumInserted += inserted;
    sumOverpayment += overpayment;
    sumServiceCharge += sCharge;
    sumProfit += profit;

    const txDate = new Date(tx.transactionTime).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    rows.push([
      idx + 1,
      txDate,
      formatServiceType(tx.serviceType),
      tx.referenceNo || '—',
      tx.accountOrPhone || tx.customerName || '—',
      tx.providerOrBiller || (isWifi ? '—' : '—'),
      isWifi ? '—' : Number(sCharge.toFixed(2)),
      isWifi ? '—' : Number(faceAmt.toFixed(2)),
      isWifi ? '—' : Number(feeAmt.toFixed(2)),
      isWifi ? '—' : Number(totalAmtFee.toFixed(2)),
      Number(inserted.toFixed(2)),
      overpayment > 0 ? Number(overpayment.toFixed(2)) : '—',
      Number(profit.toFixed(2)),
      tx.oldBalance !== null && tx.oldBalance !== undefined ? Number(tx.oldBalance.toFixed(2)) : '—',
      tx.newBalance !== null && tx.newBalance !== undefined ? Number(tx.newBalance.toFixed(2)) : '—',
    ]);
  });

  // Totals Row
  rows.push([
    'TOTALS',
    `${transactions.length} Transactions`,
    '',
    '',
    '',
    '',
    Math.round(sumServiceCharge * 100) / 100,
    Math.round(sumAmount * 100) / 100,
    Math.round(sumFee * 100) / 100,
    Math.round(sumTotalAmtFee * 100) / 100,
    Math.round(sumInserted * 100) / 100,
    Math.round(sumOverpayment * 100) / 100,
    Math.round(sumProfit * 100) / 100,
    '',
    '',
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Auto-size columns
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
    { wch: 24 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Harvest Statement');

  const fileDateStr = harvest.harvestedAt.slice(0, 10);
  const fileName = `Harvest_${sanitizeFileName(terminalName)}_${fileDateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Generates and downloads an executive PDF Collection Statement for a specific Cash Harvest
 */
export function exportHarvestToPdf(options: ExportHarvestOptions): void {
  const { harvest, transactions, machine, currency = '₱' } = options;
  const terminalName = machine?.name || harvest.machineName || 'Vendo Terminal';
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Top header banner
  doc.setFillColor(138, 0, 0); // Crimson brand color
  doc.rect(0, 0, 297, 24, 'F');

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('KIOSK CENTRAL • CASH HARVEST & COLLECTION STATEMENT', 14, 11);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Terminal: ${terminalName} • Collector: ${harvest.collectedBy} • Generated: ${new Date().toLocaleString('en-US')}`,
    14,
    18
  );

  // Metadata Grid Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 28, 269, 18, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 28, 269, 18, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('COLLECTION DATE & TIME', 18, 33);
  doc.text('COLLECTOR NAME', 85, 33);
  doc.text('DEPOSIT STATUS', 155, 33);
  doc.text('REMARKS / NOTES', 215, 33);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');

  const formattedDate = new Date(harvest.harvestedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  doc.text(formattedDate, 18, 40);
  doc.text(harvest.collectedBy, 85, 40);

  if (harvest.isDeposited) {
    doc.setTextColor(22, 101, 52); // green
    doc.text('DEPOSITED IN BANK', 155, 40);
  } else {
    doc.setTextColor(180, 83, 9); // amber
    doc.text('PENDING DEPOSIT', 155, 40);
  }

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const truncatedNotes = (harvest.notes || 'No observations recorded').slice(0, 38);
  doc.text(truncatedNotes, 215, 40);

  // Wallet balance progression calculations
  const chronologicalTx = [...transactions].sort(
    (a, b) => new Date(a.transactionTime).getTime() - new Date(b.transactionTime).getTime()
  );
  const walletTx = transactions.filter(
    (t) => t.serviceType !== 'PISO_WIFI' || (t.walletDeduction || 0) > 0
  );
  const totalWalletFaceAmount = walletTx.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalProvidedCharge = walletTx.reduce((acc, t) => acc + (t.providerCost || 0), 0);
  const firstBalTx = chronologicalTx.find((t) => t.oldBalance !== null && t.oldBalance !== undefined);
  const startingBalVal = firstBalTx && firstBalTx.oldBalance !== null && firstBalTx.oldBalance !== undefined
    ? Number(firstBalTx.oldBalance)
    : null;
  const lastBalTx = [...chronologicalTx].reverse().find((t) => t.newBalance !== null && t.newBalance !== undefined);
  const endingBalVal = lastBalTx && lastBalTx.newBalance !== null && lastBalTx.newBalance !== undefined
    ? Number(lastBalTx.newBalance)
    : (startingBalVal !== null ? startingBalVal - (totalWalletFaceAmount + totalProvidedCharge) : null);
  const totalHarvestProfit = transactions.reduce((acc, t) => acc + (t.netProfit || 0), 0);

  // 1. Collection Summary & Net Profit KPI Cards
  const kpiData = [
    {
      title: 'INSERTED CASH',
      val: `${currency}${harvest.expectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      sub: harvest.rawExpectedAmount ? `Raw: ${currency}${harvest.rawExpectedAmount.toFixed(2)}` : 'System Records',
    },
    {
      title: 'PHYSICAL COUNTED',
      val: `${currency}${(harvest.baseAmount ?? harvest.actualAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      sub: 'Base Counted Bills & Coins',
    },
    {
      title: 'VARIANCE',
      val:
        harvest.variance === 0
          ? 'BALANCED (₱0.00)'
          : harvest.variance < 0
          ? `-${currency}${Math.abs(harvest.variance).toFixed(2)}`
          : `+${currency}${harvest.variance.toFixed(2)}`,
      sub: harvest.variance === 0 ? 'Fully Reconciled' : harvest.variance < 0 ? 'Cash Shortage' : 'Cash Overage',
      highlight: true,
      variance: harvest.variance,
    },
    {
      title: 'NET PROFIT (KITA)',
      val: `+${currency}${totalHarvestProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      sub: 'Earned Margin & Fees',
      highlight: true,
      variance: 0,
    },
  ];

  const cardW = 63.5;
  const cardH = 17;
  const startY = 48;

  kpiData.forEach((kpi, i) => {
    const x = 14 + i * (cardW + 5);

    if (kpi.highlight) {
      if (kpi.variance === 0) {
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(187, 247, 208);
      } else if ((kpi.variance || 0) < 0) {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(254, 202, 202);
      } else {
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(253, 230, 138);
      }
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
    }

    doc.roundedRect(x, startY, cardW, cardH, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.title, x + 3.5, startY + 5);

    doc.setFontSize(10.5);
    if (kpi.highlight) {
      if (kpi.variance === 0) doc.setTextColor(22, 101, 52);
      else if ((kpi.variance || 0) < 0) doc.setTextColor(225, 29, 72);
      else doc.setTextColor(217, 119, 6);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(kpi.val, x + 3.5, startY + 11);

    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.sub, x + 3.5, startY + 15);
  });

  // 2. Wallet Balance Summary Row
  const walletY = startY + cardH + 3;
  const walletCards = [
    {
      title: 'STARTING BALANCE',
      val: startingBalVal !== null ? `${currency}${startingBalVal.toFixed(2)}` : '—',
      sub: 'Before 1st transaction',
    },
    {
      title: 'LESS AMOUNT',
      val: totalWalletFaceAmount > 0 ? `-${currency}${totalWalletFaceAmount.toFixed(2)}` : `${currency}0.00`,
      sub: 'Customer principal',
    },
    {
      title: 'LESS SERVICE CHARGE',
      val: totalProvidedCharge > 0 ? `-${currency}${totalProvidedCharge.toFixed(2)}` : `${currency}0.00`,
      sub: 'Provider fee / cost',
    },
    {
      title: 'ENDING BALANCE',
      val: endingBalVal !== null ? `${currency}${endingBalVal.toFixed(2)}` : '—',
      sub: 'Balance at cutoff',
    },
  ];

  walletCards.forEach((wc, i) => {
    const x = 14 + i * (cardW + 5);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, walletY, cardW, 11, 1.5, 1.5, 'FD');

    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text(wc.title, x + 3, walletY + 4);

    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text(wc.val, x + 3, walletY + 8.5);

    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text(wc.sub, x + 32, walletY + 8.5);
  });

  // Covered Transactions autoTable
  let currentY = walletY + 14;

  const tableHeaders = [
    '#',
    'Date & Time',
    'Category',
    'Reference #',
    'Phone / Account #',
    'Provider / Method / Biller',
    `Service Charge (${currency})`,
    `Amount (${currency})`,
    `Fee (${currency})`,
    `Total (${currency})`,
    `Inserted Cash (${currency})`,
    `Overpay (${currency})`,
    `Net Profit (${currency})`,
  ];

  let sumServiceCharge = 0;
  let sumAmount = 0;
  let sumFee = 0;
  let sumTotalAmtFee = 0;
  let sumInserted = 0;
  let sumOverpayment = 0;
  let sumProfit = 0;

  const tableRows = transactions.map((t, idx) => {
    const isWifi = t.serviceType === 'PISO_WIFI';
    const faceAmt = isWifi ? 0 : (t.amount || 0);
    const feeAmt = isWifi ? 0 : (t.fee || 0);
    const totalAmtFee = isWifi ? 0 : faceAmt + feeAmt;
    const inserted = t.insertedAmount || 0;
    const overpayment = isWifi ? 0 : Math.max(0, inserted - totalAmtFee);
    const sCharge = t.providerCost || 0;
    const profit = t.netProfit || 0;

    sumServiceCharge += sCharge;
    sumAmount += faceAmt;
    sumFee += feeAmt;
    sumTotalAmtFee += totalAmtFee;
    sumInserted += inserted;
    sumOverpayment += overpayment;
    sumProfit += profit;

    const tDate = new Date(t.transactionTime).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return [
      String(idx + 1),
      tDate,
      formatServiceType(t.serviceType),
      t.referenceNo || '—',
      t.accountOrPhone || t.customerName || '—',
      t.providerOrBiller || t.subType || '—',
      isWifi || sCharge <= 0 ? '—' : sCharge.toFixed(2),
      isWifi ? '—' : faceAmt.toFixed(2),
      isWifi ? '—' : feeAmt.toFixed(2),
      isWifi ? '—' : totalAmtFee.toFixed(2),
      inserted.toFixed(2),
      overpayment > 0 ? overpayment.toFixed(2) : '—',
      profit.toFixed(2),
    ];
  });

  const footRow = [
    'TOTALS',
    `${transactions.length} Transactions`,
    '',
    '',
    '',
    '',
    sumServiceCharge > 0 ? sumServiceCharge.toFixed(2) : '—',
    sumAmount.toFixed(2),
    sumFee.toFixed(2),
    sumTotalAmtFee.toFixed(2),
    sumInserted.toFixed(2),
    sumOverpayment > 0 ? sumOverpayment.toFixed(2) : '—',
    sumProfit.toFixed(2),
  ];

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableRows,
    foot: [footRow],
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [138, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { cellWidth: 6, halign: 'center' },
      1: { cellWidth: 23 },
      2: { cellWidth: 18 },
      3: { cellWidth: 23 },
      4: { cellWidth: 27 },
      5: { cellWidth: 23 },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 19, halign: 'right' },
      8: { cellWidth: 15, halign: 'right' },
      9: { cellWidth: 19, halign: 'right' },
      10: { cellWidth: 21, halign: 'right' },
      11: { cellWidth: 16, halign: 'right' },
      12: { cellWidth: 21, halign: 'right' },
    },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} • Confidential Cash Harvest Record • LPB Kiosk Central`,
        14,
        pageHeight - 6
      );
    },
  });

  const fileDateStr = harvest.harvestedAt.slice(0, 10);
  const fileName = `Harvest_${sanitizeFileName(terminalName)}_${fileDateStr}.pdf`;
  doc.save(fileName);
}


