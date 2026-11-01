'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CashHarvest, Transaction, Machine } from '@/domain/types';
import { EditTransactionModal } from '../dashboard/EditTransactionModal';
import { exportHarvestToExcel, exportHarvestToPdf } from '@/infrastructure/export/report-export';
import html2canvas from 'html2canvas-pro';
import {
  X,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Edit3,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Receipt,
  Coins,
  Banknote,
  DollarSign,
  Clock,
  Sparkles,
  Layers,
  ArrowDownLeft,
  ArrowUpRight as ArrowUpRightIcon,
  ShieldCheck,
  Building,
  Wallet,
  TrendingUp,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface CollectionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  harvest: CashHarvest | null;
  machine?: Machine | null;
  currency?: string;
  onHarvestUpdated?: () => void;
  onTransactionUpdated?: () => void;
}

export function CollectionDetailsModal({
  isOpen,
  onClose,
  harvest,
  machine,
  currency = '₱',
  onHarvestUpdated,
  onTransactionUpdated,
}: CollectionDetailsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [previousCutoff, setPreviousCutoff] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    totalInserted: number;
    totalFee: number;
    totalGross: number;
    totalNetProfit: number;
    count: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);

  const printableRef = useRef<HTMLDivElement>(null);

  // Fetch covered transactions and harvest data
  const loadHarvestTransactions = useCallback(async () => {
    if (!harvest) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/harvests/${harvest.id}?includeTransactions=true`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setPreviousCutoff(data.previousHarvestAt || null);
        setSummary(data.summary || null);
      }
    } catch (e) {
      console.error('Failed to load harvest covered transactions', e);
    } finally {
      setIsLoading(false);
    }
  }, [harvest]);

  useEffect(() => {
    if (isOpen && harvest) {
      loadHarvestTransactions();
      setSearchTerm('');
    }
  }, [isOpen, harvest, loadHarvestTransactions]);

  if (!isOpen || !harvest) return null;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  const formatMoney = (val: number) => {
    return `${currency}${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatCategory = (serviceType: string) => {
    switch (serviceType) {
      case 'CASH_IN':
        return 'Cash-In';
      case 'E_LOAD':
        return 'Load';
      case 'BILLS_PAYMENT':
        return 'Bills';
      case 'PISO_WIFI':
        return 'Piso Wifi';
      default:
        return serviceType;
    }
  };

  const getCategoryBadge = (serviceType: string) => {
    switch (serviceType) {
      case 'CASH_IN':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'E_LOAD':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'BILLS_PAYMENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'PISO_WIFI':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      (t.referenceNo && t.referenceNo.toLowerCase().includes(s)) ||
      (t.accountOrPhone && t.accountOrPhone.toLowerCase().includes(s)) ||
      (t.providerOrBiller && t.providerOrBiller.toLowerCase().includes(s)) ||
      (t.customerName && t.customerName.toLowerCase().includes(s)) ||
      (t.subType && t.subType.toLowerCase().includes(s)) ||
      String(t.amount).includes(s) ||
      String(t.insertedAmount).includes(s)
    );
  });

  // Calculate live table totals for filtered transactions
  const totalAmount = filteredTransactions.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalFee = filteredTransactions.reduce((acc, t) => acc + (t.fee || 0), 0);
  const totalAmtFeeSum = filteredTransactions.reduce(
    (acc, t) => acc + (t.serviceType === 'PISO_WIFI' ? 0 : (t.amount || 0) + (t.fee || 0)),
    0
  );
  const totalInserted = filteredTransactions.reduce((acc, t) => acc + (t.insertedAmount || 0), 0);
  const totalOverpayment = filteredTransactions.reduce((acc, t) => {
    if (t.serviceType === 'PISO_WIFI') return acc;
    const req = (t.amount || 0) + (t.fee || 0);
    return acc + Math.max(0, (t.insertedAmount || 0) - req);
  }, 0);
  const totalProfit = filteredTransactions.reduce((acc, t) => acc + (t.netProfit || 0), 0);

  // 1. Collection Summary metrics
  const expectedCash = harvest.expectedAmount;
  const physicalCounted = harvest.baseAmount ?? harvest.actualAmount;
  const variance = harvest.variance;
  const isBalanced = variance === 0;
  const isShortage = variance < 0;

  // Total Net Profit from transactions in this cutoff window
  const totalNetProfit = summary?.totalNetProfit ?? transactions.reduce((acc, t) => acc + (t.netProfit || 0), 0);

  // 2. Wallet Balance Summary metrics
  // Sort chronologically ascending to trace wallet progression
  const chronologicalTx = [...transactions].sort(
    (a, b) => new Date(a.transactionTime).getTime() - new Date(b.transactionTime).getTime()
  );

  // Filter transactions that consume wallet balance (Cash-In, Load, Bills)
  const walletTx = transactions.filter(
    (t) => t.serviceType !== 'PISO_WIFI' || (t.walletDeduction || 0) > 0
  );

  // Total Face Amount of wallet services
  const totalWalletFaceAmount = walletTx.reduce((acc, t) => acc + (t.amount || 0), 0);

  // Total Provided Charge (provider fee / cost)
  const totalProvidedCharge = walletTx.reduce((acc, t) => acc + (t.providerCost || 0), 0);

  // Starting Balance: oldBalance of the earliest transaction with balance tracking
  const firstBalTx = chronologicalTx.find((t) => t.oldBalance !== null && t.oldBalance !== undefined);
  const startingBalance: number | null = firstBalTx && firstBalTx.oldBalance !== null && firstBalTx.oldBalance !== undefined
    ? Number(firstBalTx.oldBalance)
    : null;

  // Ending Balance: newBalance of the latest transaction with balance tracking
  const lastBalTx = [...chronologicalTx].reverse().find((t) => t.newBalance !== null && t.newBalance !== undefined);
  const endingBalance: number | null = lastBalTx && lastBalTx.newBalance !== null && lastBalTx.newBalance !== undefined
    ? Number(lastBalTx.newBalance)
    : (startingBalance !== null ? startingBalance - (totalWalletFaceAmount + totalProvidedCharge) : null);

  // Handle Export Excel
  const handleExportExcel = () => {
    setIsExportingExcel(true);
    try {
      exportHarvestToExcel({
        harvest,
        machine,
        transactions,
        currency,
      });
    } catch (e) {
      console.error('Export Excel failed', e);
      alert('Failed to generate Excel export.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handle Export PDF
  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      exportHarvestToPdf({
        harvest,
        machine,
        transactions,
        currency,
      });
    } catch (e) {
      console.error('Export PDF failed', e);
      alert('Failed to generate PDF statement.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle Export PNG (High-Res Snapshot)
  const handleExportPng = async () => {
    if (!printableRef.current) return;
    setIsExportingPng(true);
    try {
      const element = printableRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // High DPI retina
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const printableEl = clonedDoc.querySelector('[data-printable-area="true"]') as HTMLElement;
          if (printableEl) {
            printableEl.style.width = '1150px';
            printableEl.style.maxWidth = 'none';
          }
          const scrollContainers = clonedDoc.querySelectorAll('.overflow-x-auto');
          scrollContainers.forEach((container) => {
            (container as HTMLElement).style.overflow = 'visible';
          });
        },
      });

      const termName = (machine?.name || harvest.machineName || 'Kiosk').replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateStr = harvest.harvestedAt.slice(0, 10);
      const fileName = `Collection_Report_${termName}_${dateStr}.png`;

      // Use Blob for memory efficiency and browser reliability
      canvas.toBlob((blob) => {
        if (!blob) {
          // Fallback to dataURL if toBlob returns null
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = fileName;
          link.href = dataUrl;
          link.click();
          setIsExportingPng(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsExportingPng(false);
      }, 'image/png');
    } catch (e) {
      console.error('Export PNG failed', e);
      alert('Failed to generate PNG image. Please ensure your browser supports canvas capture.');
      setIsExportingPng(false);
    }
  };

  const terminalDisplayName = machine?.name || harvest.machineName || 'Terminal Vault';

  const recordDisplayName = (() => {
    try {
      if (harvest.reportName && harvest.reportName.startsWith('Harvest-')) {
        const rawDate = harvest.reportName.replace('Harvest-', '');
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          return `Harvest-${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
        }
        return harvest.reportName;
      }
      if (harvest.reportName) return harvest.reportName;
      const d = new Date(harvest.harvestedAt);
      return `Harvest-${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    } catch {
      return harvest.reportName || `Harvest-${harvest.harvestedAt.slice(0, 10)}`;
    }
  })();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative flex max-h-[92vh] w-full max-w-6xl xl:max-w-7xl flex-col overflow-hidden rounded-3xl bg-slate-50 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-200">
          {/* Top Bar / Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8A0000]/10 text-[#8A0000]">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-black text-slate-900">
                    {recordDisplayName}
                  </h3>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                    {terminalDisplayName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Cutoff: {formatDate(harvest.harvestedAt)} • Collection Audit & Statement
                </p>
              </div>
            </div>

            {/* Export Actions & Close */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportExcel}
                disabled={isExportingExcel || isLoading}
                className="inline-flex items-center space-x-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                title="Export Formatted Excel Spreadsheet (.xlsx)"
              >
                {isExportingExcel ? (
                  <Loader2 className="h-3.5 w-3.5 text-emerald-700 animate-spin shrink-0" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                )}
                <span>{isExportingExcel ? 'Exporting Excel...' : 'Export Excel'}</span>
              </button>

              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf || isLoading}
                className="inline-flex items-center space-x-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-[#8A0000] hover:bg-rose-100 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                title="Export Official PDF Statement (.pdf)"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 text-[#8A0000] animate-spin shrink-0" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-[#8A0000] shrink-0" />
                )}
                <span>{isExportingPdf ? 'Exporting PDF...' : 'Export PDF'}</span>
              </button>

              <button
                onClick={handleExportPng}
                disabled={isExportingPng || isLoading}
                className="inline-flex items-center space-x-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100 transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                title="Export High-Res PNG Image for Group Chat Sharing (.png)"
              >
                {isExportingPng ? (
                  <Loader2 className="h-3.5 w-3.5 text-sky-700 animate-spin shrink-0" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5 text-sky-700 shrink-0" />
                )}
                <span>{isExportingPng ? 'Rendering PNG...' : 'Export PNG'}</span>
              </button>

              <div className="h-5 w-px bg-slate-200 mx-1" />

              <button
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Printable Report Card (This element is also captured by html2canvas) */}
            <div
              ref={printableRef}
              data-printable-area="true"
              className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
            >
              {/* Document Letterhead */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    CASH HARVEST & COLLECTION STATEMENT
                  </h2>
                  <div className="mt-1.5 flex items-center space-x-2 text-sm text-slate-700 font-semibold">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Record ID:</span>
                    <span className="text-sm font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      {recordDisplayName}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end space-y-1.5 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-400">Status:</span>
                    {harvest.isDeposited ? (
                      <span className="inline-flex items-center space-x-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Deposited in Bank</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                        <Clock className="h-3 w-3" />
                        <span>Pending Deposit</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Harvest Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 rounded-2xl bg-slate-50/80 p-4 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Terminal Details
                  </span>
                  <div className="mt-1 font-bold text-slate-900 flex items-center space-x-1.5">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    <span>{terminalDisplayName}</span>
                  </div>
                  {machine?.location && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {machine.location} {machine.stationName ? `• ${machine.stationName}` : ''}
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Collector / Staff
                  </span>
                  <div className="mt-1 font-bold text-slate-900 flex items-center space-x-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span>{harvest.collectedBy}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Authorized Cash Custodian
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Harvest Cutoff Time
                  </span>
                  <div className="mt-1 font-bold text-slate-900 flex items-center space-x-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{formatDate(harvest.harvestedAt)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {previousCutoff ? `Since: ${formatDate(previousCutoff)}` : 'Since initial deployment'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Remarks
                  </span>
                  <div className="mt-1 text-slate-700 italic truncate max-w-xs" title={harvest.notes || 'None'}>
                    {harvest.notes || 'No remarks recorded'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Created: {formatDate(harvest.createdAt)}
                  </div>
                </div>
              </div>

              {/* Financial Summaries & Attached Proof Section */}
              <div className={`grid grid-cols-1 ${harvest.slipImageUrl ? 'lg:grid-cols-12 gap-6 items-start' : 'gap-5'}`}>
                {/* Left Side: Collection & Wallet KPI Summaries (+ Adjustments) */}
                <div className={harvest.slipImageUrl ? 'lg:col-span-7 space-y-5' : 'space-y-5'}>
                  {/* 1. Collection Summary & Net Profit Card */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                        <Receipt className="h-3.5 w-3.5 text-[#8A0000]" />
                        <span>Collection Summary</span>
                      </h4>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${harvest.slipImageUrl ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-3`}>
                      {/* 1. Inserted Cash */}
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                            Inserted Cash
                          </span>
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                            <Banknote className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <div className="text-lg font-black text-emerald-950 mt-1">
                          {formatMoney(expectedCash)}
                        </div>
                        <div className="text-[10px] text-emerald-700/80 mt-1">
                          {harvest.rawExpectedAmount ? `Raw: ${formatMoney(harvest.rawExpectedAmount)}` : 'System vault records'}
                        </div>
                      </div>

                      {/* 2. Physical Counted */}
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                            Physical Counted
                          </span>
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                            <Coins className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <div className="text-lg font-black text-amber-950 mt-1">
                          {formatMoney(physicalCounted)}
                        </div>
                        <div className="text-[10px] text-amber-700/80 mt-1">
                          Counted bills & coins
                        </div>
                      </div>

                      {/* 3. Variance */}
                      <div
                        className={`rounded-2xl border p-4 shadow-xs ${
                          isBalanced
                            ? 'border-emerald-200 bg-emerald-50/40'
                            : isShortage
                            ? 'border-rose-200 bg-rose-50/40'
                            : 'border-amber-200 bg-amber-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              isBalanced
                                ? 'text-emerald-800'
                                : isShortage
                                ? 'text-rose-800'
                                : 'text-amber-800'
                            }`}
                          >
                            Variance
                          </span>
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                              isBalanced
                                ? 'bg-emerald-100 text-emerald-800'
                                : isShortage
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isBalanced ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                          </div>
                        </div>
                        <div
                          className={`text-lg font-black mt-1 ${
                            isBalanced
                              ? 'text-emerald-950'
                              : isShortage
                              ? 'text-rose-950'
                              : 'text-amber-950'
                          }`}
                        >
                          {isBalanced
                            ? 'Balanced (₱0.00)'
                            : isShortage
                            ? `-${formatMoney(Math.abs(variance))}`
                            : `+${formatMoney(variance)}`}
                        </div>
                        <div
                          className={`text-[10px] mt-1 font-medium ${
                            isBalanced
                              ? 'text-emerald-700/80'
                              : isShortage
                              ? 'text-rose-700/80'
                              : 'text-amber-700/80'
                          }`}
                        >
                          {isBalanced ? 'Fully reconciled' : isShortage ? 'Cash shortage' : 'Cash overage'}
                        </div>
                      </div>

                      {/* 4. Net Profit Card */}
                      <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">
                            Net Profit
                          </span>
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                            <TrendingUp className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <div className="text-lg font-black text-teal-950 mt-1">
                          +{formatMoney(totalNetProfit)}
                        </div>
                        <div className="text-[10px] text-teal-700/80 font-medium mt-1">
                          Total earnings from transactions
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Wallet Balance Summary */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                        <Wallet className="h-3.5 w-3.5 text-blue-600" />
                        <span>Wallet Balance Summary</span>
                      </h4>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${harvest.slipImageUrl ? 'lg:grid-cols-2' : 'lg:grid-cols-4'} gap-3`}>
                      {/* 1. Starting Balance */}
                      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                            Starting Balance
                          </span>
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800">
                            <Wallet className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <div className="text-lg font-black text-indigo-950 mt-1">
                          {startingBalance !== null ? formatMoney(startingBalance) : '—'}
                        </div>
                        <div className="text-[10px] text-indigo-700/80 mt-1">
                          Wallet before 1st transaction
                        </div>
                      </div>

                      {/* 2. Less: Transaction Amount */}
                      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                            Less: Transaction Amount
                          </span>
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-800">
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <div className="text-lg font-black text-rose-950 mt-1">
                          {totalWalletFaceAmount > 0 ? `-${formatMoney(totalWalletFaceAmount)}` : formatMoney(0)}
                        </div>
                        <div className="text-[10px] text-rose-700/80 mt-1">
                          Customer transaction principal
                        </div>
                      </div>

                      {/* 3. Less: Service Charge */}
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                            Less: Service Charge
                          </span>
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                            <Receipt className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <div className="text-lg font-black text-amber-950 mt-1">
                          {totalProvidedCharge > 0 ? `-${formatMoney(totalProvidedCharge)}` : formatMoney(0)}
                        </div>
                        <div className="text-[10px] text-amber-700/80 mt-1">
                          Provider fee / cost deducted
                        </div>
                      </div>

                      {/* 4. Ending Balance */}
                      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                            Ending Balance
                          </span>
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                            <Wallet className="h-3.5 w-3.5" />
                          </div>
                        </div>
                        <div className="text-xl font-black text-blue-950 mt-1">
                          {endingBalance !== null ? formatMoney(endingBalance) : '—'}
                        </div>
                        <div className="text-[10px] text-blue-700/80 font-medium mt-1">
                          Wallet balance at cutoff
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Adjustments Detailed List (if any) */}
                  {harvest.adjustments && harvest.adjustments.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                      <div className="flex items-center space-x-1.5 mb-2.5">
                        <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Itemized Adjustments Breakdown
                        </h5>
                      </div>
                      <div className="divide-y divide-slate-200/80 rounded-xl border border-slate-200 bg-white overflow-hidden text-xs">
                        {harvest.adjustments.map((adj, idx) => (
                          <div
                            key={adj.id || idx}
                            className="flex items-center justify-between p-3 transition-colors hover:bg-slate-50/80"
                          >
                            <div className="flex items-center space-x-3">
                              <span
                                className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${
                                  adj.type === 'ADD'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {adj.type === 'ADD' ? '+' : '-'}
                              </span>
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {adj.description || 'Adjustment'}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Target:{' '}
                                  <span className="font-medium text-slate-600">
                                    {adj.target === 'PHYSICAL' ? 'Physical Cash' : 'Vault Expectation (System)'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <span
                                className={`font-mono text-sm font-black ${
                                  adj.type === 'ADD' ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {adj.type === 'ADD' ? '+' : '-'}
                                {formatMoney(adj.amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Side: Attached Collection Proof / Breakdown Slip Card */}
                {harvest.slipImageUrl && (
                  <div className="lg:col-span-5 lg:sticky lg:top-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8A0000]/10 text-[#8A0000]">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                              Attached Collection Proof
                            </h5>
                            <p className="text-[10px] text-slate-500">
                              Coins Out tally sheet / breakdown slip
                            </p>
                          </div>
                        </div>

                        <a
                          href={harvest.slipImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          <span>Open Full</span>
                          <ExternalLink className="h-3 w-3 text-slate-500" />
                        </a>
                      </div>

                      <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-3 min-h-[300px] max-h-[560px] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={harvest.slipImageUrl}
                          alt="Coins Out Harvest Tally Slip"
                          className="max-h-[520px] w-auto max-w-full rounded-lg object-contain shadow-xs cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => window.open(harvest.slipImageUrl!, '_blank')}
                          title="Click to view full resolution photo in new tab"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Covered Transactions Table Header & Search */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Covered Transactions in this Collection Window
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Showing successful cash transactions between cutoff periods
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search phone, biller, amount..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#8A0000] focus:bg-white focus:outline-hidden transition-all"
                    />
                  </div>
                </div>

                {/* Covered Transactions Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 pl-4 pr-2 w-10">#</th>
                        <th className="px-3 py-2.5 whitespace-nowrap">Date & Time</th>
                        <th className="px-3 py-2.5 whitespace-nowrap">Category</th>
                        <th className="px-3 py-2.5 min-w-[140px]">Reference & Account</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap min-w-[90px]">Service Charge</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap min-w-[105px]">Amount & Fee</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap min-w-[110px]">Inserted Cash</th>
                        <th className="px-3 py-2.5 text-right whitespace-nowrap min-w-[100px]">Net Profit</th>
                        <th className="py-2.5 pr-4 pl-2 text-right w-12">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={`loading-row-${i}`} className="animate-pulse">
                            <td className="py-3 pl-4 pr-2"><div className="h-3 w-4 bg-slate-200 rounded"></div></td>
                            <td className="px-3 py-3"><div className="h-3.5 w-24 bg-slate-200 rounded"></div></td>
                            <td className="px-3 py-3"><div className="h-4 w-16 bg-slate-200 rounded-md"></div></td>
                            <td className="px-3 py-3"><div className="h-3.5 w-28 bg-slate-200 rounded"></div></td>
                            <td className="px-3 py-3 text-right"><div className="h-3.5 w-12 bg-slate-200 rounded ml-auto"></div></td>
                            <td className="px-3 py-3 text-right"><div className="h-3.5 w-16 bg-slate-200 rounded ml-auto"></div></td>
                            <td className="px-3 py-3 text-right"><div className="h-3.5 w-16 bg-slate-200 rounded ml-auto"></div></td>
                            <td className="px-3 py-3 text-right"><div className="h-3.5 w-14 bg-slate-200 rounded ml-auto"></div></td>
                            <td className="py-3 pr-4 pl-2 text-right"><div className="h-5 w-5 bg-slate-200 rounded ml-auto"></div></td>
                          </tr>
                        ))
                      ) : filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            {searchTerm ? 'No transactions match your search filter.' : 'No transactions recorded in this collection cutoff window.'}
                          </td>
                        </tr>
                      ) : (
                        filteredTransactions.map((t, index) => {
                          const isWifi = t.serviceType === 'PISO_WIFI';
                          const totalAmtFee = isWifi ? 0 : (t.amount || 0) + (t.fee || 0);
                          const overpayment = isWifi ? 0 : Math.max(0, (t.insertedAmount || 0) - totalAmtFee);

                          return (
                            <tr key={t.id} className="transition-colors hover:bg-slate-50/60">
                              <td className="py-2.5 pl-4 pr-2 text-slate-400 font-mono text-[11px] align-middle">
                                {index + 1}
                              </td>
                              <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap align-middle font-medium">
                                {formatDate(t.transactionTime)}
                              </td>
                              <td className="px-3 py-2.5 align-middle">
                                <span
                                  className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold border ${getCategoryBadge(
                                    t.serviceType
                                  )}`}
                                >
                                  {formatCategory(t.serviceType)}
                                </span>
                                {t.providerOrBiller && !isWifi && (
                                  <div className="text-[10px] text-slate-500 font-semibold mt-0.5 truncate max-w-[110px]" title={t.providerOrBiller}>
                                    {t.providerOrBiller}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 align-middle">
                                <div className="font-mono text-xs font-bold text-slate-900">
                                  {t.accountOrPhone || t.customerName || (isWifi ? 'Direct Drop' : '—')}
                                </div>
                                <div className="font-mono text-[10px] text-slate-400 mt-0.5 truncate max-w-[130px]" title={t.referenceNo || ''}>
                                  Ref: {t.referenceNo || 'None'}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right align-middle whitespace-nowrap">
                                <div className="font-medium text-slate-700 text-xs">
                                  {isWifi || !t.providerCost ? '—' : formatMoney(t.providerCost)}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right align-middle whitespace-nowrap">
                                <div className="font-bold text-slate-900 text-xs">
                                  {isWifi ? '—' : formatMoney(t.amount || 0)}
                                </div>
                                {!isWifi && (
                                  <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                    Fee: {formatMoney(t.fee || 0)}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right align-middle whitespace-nowrap">
                                <div className="font-black text-slate-900 text-xs">
                                  {formatMoney(t.insertedAmount || 0)}
                                </div>
                                {overpayment > 0 && (
                                  <div className="mt-0.5">
                                    <span className="inline-flex items-center whitespace-nowrap px-1.5 py-0.2 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                                      +{formatMoney(overpayment)} overpay
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right font-black text-emerald-700 text-xs align-middle whitespace-nowrap">
                                +{formatMoney(t.netProfit || 0)}
                              </td>
                              <td className="py-2.5 pr-4 pl-2 text-right align-middle">
                                <button
                                  onClick={() => setEditingTransaction(t)}
                                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                                  title="Edit this transaction"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {/* Table Summary Footer */}
                    {filteredTransactions.length > 0 && (
                      <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-xs text-slate-900">
                        <tr>
                          <td colSpan={4} className="py-3 pl-4 text-slate-600 uppercase tracking-wider text-[11px] whitespace-nowrap">
                            Total ({filteredTransactions.length} items)
                          </td>
                          <td className="px-3 py-3 text-right text-slate-800 font-bold whitespace-nowrap">
                            {totalProvidedCharge > 0 ? formatMoney(totalProvidedCharge) : '—'}
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <div>{formatMoney(totalAmount)}</div>
                            <div className="text-[10px] text-slate-500 font-normal">Fee: {formatMoney(totalFee)}</div>
                          </td>
                          <td className="px-3 py-3 text-right text-slate-900 font-black whitespace-nowrap">
                            <div>{formatMoney(totalInserted)}</div>
                            {totalOverpayment > 0 && (
                              <div className="mt-0.5">
                                <span className="inline-flex items-center whitespace-nowrap text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  +{formatMoney(totalOverpayment)} overpay
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-emerald-700 font-black text-xs sm:text-sm whitespace-nowrap">
                            +{formatMoney(totalProfit)}
                          </td>
                          <td className="py-3 pr-4"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        currency={currency}
        onSuccess={(updated) => {
          setEditingTransaction(null);
          // Reload this collection's transactions
          loadHarvestTransactions();
          // Notify parents
          if (onTransactionUpdated) onTransactionUpdated();
          if (onHarvestUpdated) onHarvestUpdated();
        }}
      />
    </>
  );
}

