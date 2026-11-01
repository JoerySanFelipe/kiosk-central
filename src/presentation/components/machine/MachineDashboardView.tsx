'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Machine, CashHarvest, MachineVaultSummary, Transaction, FinancialSummary } from '@/domain/types';
import { RecordHarvestModal } from '../harvest/RecordHarvestModal';
import { HarvestHistoryTable } from '../harvest/HarvestHistoryTable';
import { CollectionDetailsModal } from '../harvest/CollectionDetailsModal';
import { TransactionsTable } from '../dashboard/TransactionsTable';
import { TimelineDropdown } from '../dashboard/TimelineDropdown';
import { ExportDropdown } from '../dashboard/ExportDropdown';
import { EditTransactionModal } from '../dashboard/EditTransactionModal';
import { HeroTotalCard } from '../dashboard/HeroTotalCard';
import { MachineVaultHeroCard } from './MachineVaultHeroCard';
import { ServiceSummaryCards } from '../dashboard/ServiceSummaryCards';
import { exportMachineToExcel, exportMachineToPdf } from '@/infrastructure/export/report-export';
import {
  Vault,
  PlusCircle,
  MapPin,
  Phone,
  Server,
  RefreshCw,
  CreditCard,
} from 'lucide-react';

interface MachineDashboardViewProps {
  machine: Machine;
  currency?: string;
  onRefreshParentSummary?: () => void;
}

const defaultFinancialSummary: FinancialSummary = {
  totalGrossVolume: 0,
  totalInsertedCash: 0,
  totalWalletDeduction: 0,
  totalNetProfit: 0,
  totalTransactionsCount: 0,
  breakdown: {
    cashIn: { serviceType: 'CASH_IN', label: 'Cash In', volume: 0, netProfit: 0, cashInserted: 0, walletDeduction: 0, transactionCount: 0 },
    load: { serviceType: 'E_LOAD', label: 'E-Load', volume: 0, netProfit: 0, cashInserted: 0, walletDeduction: 0, transactionCount: 0 },
    bills: { serviceType: 'BILLS_PAYMENT', label: 'Bills Payment', volume: 0, netProfit: 0, cashInserted: 0, walletDeduction: 0, transactionCount: 0 },
    pisoWifi: { serviceType: 'PISO_WIFI', label: 'Piso WiFi', volume: 0, netProfit: 0, cashInserted: 0, walletDeduction: 0, transactionCount: 0 },
  },
  reconciliation: {
    physicalCashToCollect: 0,
    walletReplenishmentNeeded: 0,
    currentEstimatedWalletBalance: undefined,
  },
};

export function MachineDashboardView({
  machine,
  currency = '₱',
  onRefreshParentSummary,
}: MachineDashboardViewProps) {
  const [vaultSummary, setVaultSummary] = useState<MachineVaultSummary | null>(null);
  const [machineSummary, setMachineSummary] = useState<FinancialSummary>(defaultFinancialSummary);
  const [harvests, setHarvests] = useState<CashHarvest[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(true);
  const [machineTab, setMachineTab] = useState<'transactions' | 'harvests'>('transactions');

  // Metric Toggle & Time Range State
  const [viewMetric, setViewMetric] = useState<'CASH' | 'PROFIT' | 'GROSS'>('CASH');
  const [timeRange, setTimeRange] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Date & Time Filter state (From & To datetime-local for table timeline dropdown)
  const [startDateTime, setStartDateTime] = useState<string>('');
  const [endDateTime, setEndDateTime] = useState<string>('');
  const [activePreset, setActivePreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'CUSTOM'>('ALL');

  // Machine transactions table states
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [category, setCategory] = useState<string>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [isLoadingTransactions, setIsLoadingTransactions] = useState<boolean>(true);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Modals state
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState<boolean>(false);
  const [editingHarvest, setEditingHarvest] = useState<CashHarvest | null>(null);
  const [detailsHarvest, setDetailsHarvest] = useState<CashHarvest | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Helper to format Date into YYYY-MM-DDTHH:mm for datetime-local
  const toLocalDatetime = (d: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const applyPreset = (preset: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS') => {
    setActivePreset(preset);
    const now = new Date();
    if (preset === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
      setStartDateTime(toLocalDatetime(start));
      setEndDateTime(toLocalDatetime(end));
    } else if (preset === 'YESTERDAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59);
      setStartDateTime(toLocalDatetime(start));
      setEndDateTime(toLocalDatetime(end));
    } else if (preset === 'LAST_7_DAYS') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
      setStartDateTime(toLocalDatetime(start));
      setEndDateTime(toLocalDatetime(end));
    }
    setPage(1);
  };

  const clearDateTimeFilter = () => {
    setActivePreset('ALL');
    setStartDateTime('');
    setEndDateTime('');
    setPage(1);
  };

  // Fetch harvests and vault summary for this machine
  const fetchHarvestData = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch(`/api/harvests?machineId=${machine.id}&summary=true`);
      if (res.ok) {
        const data = await res.json();
        setHarvests(data.harvests || []);
        setVaultSummary(data.vaultSummary || null);
      }
    } catch (e) {
      console.error('Failed to load harvests for machine', e);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [machine.id]);

  // Fetch machine-specific financial summary (supports timeline filters)
  const fetchMachineSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('machineId', machine.id);
      if (timeRange && timeRange !== 'ALL') params.append('timeRange', timeRange);
      if (timeRange === 'CUSTOM') {
        if (customStartDate) params.append('startDate', customStartDate);
        if (customEndDate) params.append('endDate', customEndDate);
      } else if (startDateTime || endDateTime) {
        if (startDateTime) params.append('startDate', startDateTime);
        if (endDateTime) params.append('endDate', endDateTime);
      }

      const res = await fetch(`/api/stats?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMachineSummary(data);
      }
    } catch (e) {
      console.error('Failed to load machine summary', e);
    }
  }, [machine.id, timeRange, customStartDate, customEndDate, startDateTime, endDateTime]);

  // Fetch machine-specific transactions filtered by date, time, category, etc.
  const fetchTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const params = new URLSearchParams();
      params.append('machineId', machine.id);
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      if (selectedMethod && selectedMethod !== 'ALL') params.append('serviceType', selectedMethod);
      if (category && category !== 'ALL') params.append('category', category);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      // If timeRange is set on Hero card and not ALL, apply it
      if (timeRange && timeRange !== 'ALL' && timeRange !== 'CUSTOM') {
        params.append('timeRange', timeRange);
      } else if (timeRange === 'CUSTOM') {
        if (customStartDate) params.append('startDate', customStartDate);
        if (customEndDate) params.append('endDate', customEndDate);
      } else if (startDateTime || endDateTime) {
        if (startDateTime) params.append('startDate', startDateTime);
        if (endDateTime) params.append('endDate', endDateTime);
      }

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTotalCount(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load machine transactions', e);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [
    machine.id,
    page,
    pageSize,
    searchTerm,
    category,
    selectedMethod,
    timeRange,
    customStartDate,
    customEndDate,
    startDateTime,
    endDateTime,
  ]);

  // Formatted file exports handler
  const handleExport = async (format: 'excel' | 'pdf') => {
    if (format === 'excel') setIsExportingExcel(true);
    else setIsExportingPdf(true);

    try {
      const params = new URLSearchParams();
      params.append('machineId', machine.id);
      params.append('pageSize', '10000');
      if (selectedMethod && selectedMethod !== 'ALL') params.append('serviceType', selectedMethod);
      if (category && category !== 'ALL') params.append('category', category);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (startDateTime) params.append('startDate', startDateTime);
      if (endDateTime) params.append('endDate', endDateTime);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch transactions for export');
      const data = await res.json();
      const exportList: Transaction[] = data.transactions || [];

      const currentVaultForExport = vaultSummary
        ? {
            ...vaultSummary,
            totalGrossVolume: machineSummary.totalGrossVolume,
            totalNetProfit: machineSummary.totalNetProfit,
          }
        : null;

      if (format === 'excel') {
        exportMachineToExcel({
          machine,
          vaultSummary: currentVaultForExport,
          transactions: exportList,
          serviceFilter: selectedMethod,
          categoryFilter: category,
          currency,
        });
      } else {
        exportMachineToPdf({
          machine,
          vaultSummary: currentVaultForExport,
          transactions: exportList,
          serviceFilter: selectedMethod,
          categoryFilter: category,
          currency,
        });
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExportingExcel(false);
      setIsExportingPdf(false);
    }
  };

  useEffect(() => {
    fetchHarvestData();
  }, [fetchHarvestData]);

  useEffect(() => {
    fetchTransactions();
    fetchMachineSummary();
  }, [fetchTransactions, fetchMachineSummary]);

  const handleHarvestSuccess = () => {
    fetchHarvestData();
    fetchTransactions();
    fetchMachineSummary();
    if (onRefreshParentSummary) onRefreshParentSummary();
  };

  const handleDeleteHarvest = async (harvestId: string) => {
    try {
      const res = await fetch(`/api/harvests?id=${harvestId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchHarvestData();
        fetchTransactions();
        fetchMachineSummary();
        if (onRefreshParentSummary) onRefreshParentSummary();
      }
    } catch (e) {
      console.error('Failed to delete harvest', e);
    }
  };

  const handleTransactionUpdated = () => {
    fetchHarvestData();
    fetchTransactions();
    fetchMachineSummary();
    if (onRefreshParentSummary) onRefreshParentSummary();
  };

  // Filter harvests if startDateTime or endDateTime is set
  const displayedHarvests = useMemo(() => {
    if (!startDateTime && !endDateTime) return harvests;
    return harvests.filter((h) => {
      const hTime = new Date(h.harvestedAt).getTime();
      if (startDateTime && hTime < new Date(startDateTime).getTime()) return false;
      if (endDateTime && hTime > new Date(endDateTime).getTime()) return false;
      return true;
    });
  }, [harvests, startDateTime, endDateTime]);

  return (
    <div className="space-y-6">
      {/* Machine Profile Header Card (Crimson Red Theme) */}
      <div className="crimson-gradient relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden rounded-2xl p-6 text-white shadow-lg">
        {/* Background ambient lighting */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-black/20 blur-2xl" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center space-x-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-xs text-white border border-white/20">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  {machine.name}
                </h2>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-xs">
                  Active Terminal
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/80 font-medium mt-1">
                {machine.location && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="h-3.5 w-3.5 text-white/70" />
                    <span>{machine.location}</span>
                  </span>
                )}
                {machine.stationName && (
                  <span className="rounded-md bg-black/25 px-2 py-0.5 text-[10px] font-bold text-white/90 border border-white/10">
                    Station: {machine.stationName}
                  </span>
                )}
                {machine.contactNumber && (
                  <span className="flex items-center space-x-1">
                    <Phone className="h-3.5 w-3.5 text-white/70" />
                    <span>{machine.contactNumber}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Refresh & Primary Record Cash Harvest */}
        <div className="relative z-10 flex items-center space-x-2.5">
          <button
            onClick={() => {
              fetchHarvestData();
              fetchTransactions();
              fetchMachineSummary();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 border border-white/20 text-white hover:bg-white/25 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Refresh Terminal Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingSummary ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditingHarvest(null);
              setIsHarvestModalOpen(true);
            }}
            className="flex h-10 items-center space-x-2 rounded-xl bg-white px-4 text-xs font-black text-[#8A0000] shadow-md hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="h-4 w-4 text-[#8A0000]" />
            <span>Record Cash Harvest</span>
          </button>
        </div>
      </div>

      {/* Twin Executive Metric Cards for Machine (Clean KPI Theme) */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 flex flex-col">
          <HeroTotalCard
            summary={machineSummary}
            viewMetric={viewMetric}
            onChangeViewMetric={setViewMetric}
            selectedService={selectedMethod}
            onSelectService={(svc) => {
              setSelectedMethod(svc);
              setPage(1);
            }}
            currency={currency}
            timeRange={timeRange}
            onChangeTimeRange={(range) => {
              setTimeRange(range);
              setPage(1);
            }}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomDateChange={(start, end) => {
              setCustomStartDate(start);
              setCustomEndDate(end);
              setPage(1);
            }}
            onExport={() => handleExport('excel')}
            theme="clean"
          />
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <MachineVaultHeroCard
            vaultSummary={vaultSummary}
            machineSummary={machineSummary}
            currency={currency}
            theme="clean"
          />
        </div>
      </div>

      {/* 4-in-1 Service Summary Cards (Cash In, Load, Bills, Piso WiFi for this Machine) */}
      <ServiceSummaryCards
        summary={machineSummary}
        viewMetric={viewMetric}
        selectedService={selectedMethod}
        onFilterService={(svc) => {
          setSelectedMethod(svc);
          setPage(1);
        }}
        currency={currency}
      />

      {/* Section 2: Machine Navigation Underline Tabs */}
      <div className="flex items-center space-x-8 border-b border-slate-200">
        <button
          onClick={() => setMachineTab('transactions')}
          className={`group flex items-center space-x-2.5 pb-3 pt-1 text-sm font-bold transition-all cursor-pointer relative ${
            machineTab === 'transactions'
              ? 'text-[#8A0000]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard
            className={`h-4 w-4 transition-colors ${
              machineTab === 'transactions' ? 'text-[#8A0000]' : 'text-slate-400 group-hover:text-slate-600'
            }`}
          />
          <span>Terminal Transactions</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              machineTab === 'transactions'
                ? 'bg-rose-50 text-[#8A0000] border border-rose-200/60'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {totalCount}
          </span>
          {machineTab === 'transactions' && (
            <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-[#8A0000] rounded-full" />
          )}
        </button>

        <button
          onClick={() => setMachineTab('harvests')}
          className={`group flex items-center space-x-2.5 pb-3 pt-1 text-sm font-bold transition-all cursor-pointer relative ${
            machineTab === 'harvests'
              ? 'text-[#8A0000]'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Vault
            className={`h-4 w-4 transition-colors ${
              machineTab === 'harvests' ? 'text-[#8A0000]' : 'text-slate-400 group-hover:text-slate-600'
            }`}
          />
          <span>Collection History</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors ${
              machineTab === 'harvests'
                ? 'bg-rose-50 text-[#8A0000] border border-rose-200/60'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {displayedHarvests.length}
          </span>
          {machineTab === 'harvests' && (
            <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-[#8A0000] rounded-full" />
          )}
        </button>
      </div>

      {/* Tab Content 1: Cash Harvest & Collection History */}
      {machineTab === 'harvests' && (
        <HarvestHistoryTable
          harvests={displayedHarvests}
          isLoading={isLoadingSummary}
          currency={currency}
          timelineControl={
            <TimelineDropdown
              activePreset={activePreset}
              startDateTime={startDateTime}
              endDateTime={endDateTime}
              onSelectPreset={applyPreset}
              onClear={clearDateTimeFilter}
              onCustomChange={(start, end) => {
                setStartDateTime(start);
                setEndDateTime(end);
                setActivePreset('CUSTOM');
                setPage(1);
              }}
            />
          }
          onViewDetails={(h) => setDetailsHarvest(h)}
          onEditHarvest={(h) => setEditingHarvest(h)}
          onDeleteHarvest={handleDeleteHarvest}
        />
      )}

      {/* Tab Content 2: Terminal Transactions */}
      {machineTab === 'transactions' && (
        <div className="space-y-4">
          <TransactionsTable
            transactions={transactions}
            total={totalCount}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            timelineControl={
              <TimelineDropdown
                activePreset={activePreset}
                startDateTime={startDateTime}
                endDateTime={endDateTime}
                onSelectPreset={applyPreset}
                onClear={clearDateTimeFilter}
                onCustomChange={(start, end) => {
                  setStartDateTime(start);
                  setEndDateTime(end);
                  setActivePreset('CUSTOM');
                  setPage(1);
                }}
              />
            }
            serviceType={selectedMethod}
            onServiceTypeChange={(method) => {
              setSelectedMethod(method);
              setPage(1);
            }}
            category={category}
            onCategoryChange={(cat) => {
              setCategory(cat);
              setPage(1);
            }}
            extraActions={
              <ExportDropdown
                onExportExcel={() => handleExport('excel')}
                onExportPdf={() => handleExport('pdf')}
                isExportingExcel={isExportingExcel}
                isExportingPdf={isExportingPdf}
              />
            }
            isLoading={isLoadingTransactions}
            currency={currency}
            searchTerm={searchTerm}
            onSearchChange={(val) => {
              setSearchTerm(val);
              setPage(1);
            }}
            onEditTransaction={(t) => setEditingTransaction(t)}
          />
        </div>
      )}

      {/* Record / Edit Cash Harvest Modal */}
      <RecordHarvestModal
        isOpen={isHarvestModalOpen || !!editingHarvest}
        onClose={() => {
          setIsHarvestModalOpen(false);
          setEditingHarvest(null);
        }}
        machineId={machine.id}
        machineName={machine.name}
        expectedCash={vaultSummary?.currentCashInVault ?? 0}
        currency={currency}
        harvest={editingHarvest}
        onSuccess={handleHarvestSuccess}
      />

      {/* Edit / Balance Transaction Modal */}
      <EditTransactionModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        currency={currency}
        onSuccess={handleTransactionUpdated}
      />

      {/* Collection Details & Audit Statement Modal */}
      <CollectionDetailsModal
        isOpen={!!detailsHarvest}
        onClose={() => setDetailsHarvest(null)}
        harvest={detailsHarvest}
        machine={machine}
        currency={currency}
        onHarvestUpdated={() => {
          fetchHarvestData();
          fetchMachineSummary();
          if (onRefreshParentSummary) onRefreshParentSummary();
        }}
        onTransactionUpdated={() => {
          fetchTransactions();
          fetchHarvestData();
          fetchMachineSummary();
          if (onRefreshParentSummary) onRefreshParentSummary();
        }}
      />
    </div>
  );
}
