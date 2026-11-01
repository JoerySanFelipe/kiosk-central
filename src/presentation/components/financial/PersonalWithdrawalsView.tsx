'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserMinus,
  Search,
  RefreshCw,
  Calendar,
  Building2,
  DollarSign,
  Wallet,
  Server,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Info,
  Edit2,
  CheckCircle,
} from 'lucide-react';
import { Transaction, Machine } from '@/domain/types';

interface PersonalWithdrawalsViewProps {
  currency?: string;
  onEditTransaction?: (transaction: Transaction) => void;
}

export function PersonalWithdrawalsView({
  currency = '₱',
  onEditTransaction,
}: PersonalWithdrawalsViewProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalDeduction, setTotalDeduction] = useState<number>(0);
  const [totalFaceAmount, setTotalFaceAmount] = useState<number>(0);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedMachine, setSelectedMachine] = useState<string>('ALL');
  const [selectedService, setSelectedService] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Fetch machines for filter dropdown
  useEffect(() => {
    fetch('/api/machines')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMachines(data))
      .catch((e) => console.error('Failed to load machines', e));
  }, []);

  // Fetch personal withdrawal transactions
  const fetchPersonalWithdrawals = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('category', 'PERSONAL_WITHDRAWALS');
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      if (search.trim()) params.set('search', search.trim());
      if (selectedMachine !== 'ALL') params.set('machineId', selectedMachine);
      if (selectedService !== 'ALL') params.set('serviceType', selectedService);
      if (timeRange !== 'ALL') params.set('timeRange', timeRange);
      if (customStartDate) params.set('startDate', customStartDate);
      if (customEndDate) params.set('endDate', customEndDate);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTotalCount(data.total || 0);
        setTotalDeduction(data.totalWalletDeduction || 0);
        setTotalFaceAmount(data.totalAmount || 0);
      }
    } catch (e) {
      console.error('Failed to load personal withdrawals', e);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, selectedMachine, selectedService, timeRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchPersonalWithdrawals();
  }, [fetchPersonalWithdrawals]);

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

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const hasActiveFilters =
    Boolean(search.trim()) ||
    selectedMachine !== 'ALL' ||
    selectedService !== 'ALL' ||
    timeRange !== 'ALL' ||
    Boolean(customStartDate) ||
    Boolean(customEndDate);

  const resetFilters = () => {
    setSearch('');
    setSelectedMachine('ALL');
    setSelectedService('ALL');
    setTimeRange('ALL');
    setCustomStartDate('');
    setCustomEndDate('');
    setPage(1);
  };

  // CSV Export for Personal Withdrawals
  const exportCSV = () => {
    if (transactions.length === 0) return;
    const headers = [
      'Date/Time',
      'Transaction ID',
      'Kiosk Machine',
      'Service Type',
      'Provider / Biller',
      'Reference No',
      'Account / Phone',
      'Customer Name',
      'Face Amount',
      'Wallet Deduction (Draw)',
      'Wallet Balance After',
      'Status',
      'Notes',
    ];

    const rows = transactions.map((t) => [
      `"${t.transactionTime}"`,
      `"${t.id}"`,
      `"${t.machineName || t.machineId}"`,
      `"${t.serviceType}"`,
      `"${t.providerOrBiller || ''}"`,
      `"${t.referenceNo || ''}"`,
      `"${t.accountOrPhone || ''}"`,
      `"${t.customerName || ''}"`,
      t.amount,
      t.walletDeduction,
      t.newBalance ?? '',
      `"${t.status}"`,
      `"${t.notes || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `personal-withdrawals-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Compact Informative Context Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs shadow-2xs">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-rose-500 shrink-0"></span>
          <span className="text-slate-700 font-medium text-[11px] sm:text-xs">
            Displaying transactions tagged as <strong>Personal Withdrawals / Owner Draws</strong>.
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Manage tags directly from the Dashboard Transactions Table
        </span>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Total Personal Drained */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Total Personal Draws
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-800">
              <UserMinus className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-rose-950">
            {currency}
            {totalDeduction.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="mt-1 text-[11px] text-rose-700 font-medium">
            Total master wallet deduction for owner draws
          </p>
        </div>

        {/* Card 2: Total Face Value */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Transaction Value
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {currency}
            {totalFaceAmount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            Sum of face amounts processed as personal draws
          </p>
        </div>

        {/* Card 3: Total Recorded Draw Events */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Recorded Draw Events
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {totalCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-400 font-medium">
            Transactions tagged as owner withdrawal
          </p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header & Controls Toolbar */}
        <div className="border-b border-slate-100 bg-slate-50/70 p-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Personal Withdrawal Records ({totalCount})
              </h3>
              <p className="text-[11px] text-slate-500">
                Detailed history of personal withdrawals deducted from wallet
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportCSV}
                disabled={transactions.length === 0}
                className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={fetchPersonalWithdrawals}
                disabled={isLoading}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                title="Refresh Records"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-[#8A0000]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4 items-center">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ref, phone, account, name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs focus:border-[#8A0000] focus:outline-none"
              />
            </div>

            {/* Machine Filter */}
            <div>
              <select
                value={selectedMachine}
                onChange={(e) => {
                  setSelectedMachine(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#8A0000] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Kiosks</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Type Filter */}
            <div>
              <select
                value={selectedService}
                onChange={(e) => {
                  setSelectedService(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#8A0000] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Services</option>
                <option value="CASH_IN">Cash In</option>
                <option value="E_LOAD">E-Load</option>
                <option value="BILLS_PAYMENT">Bills Payment</option>
              </select>
            </div>

            {/* Time Range Filter */}
            <div>
              <select
                value={timeRange}
                onChange={(e) => {
                  setTimeRange(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-[#8A0000] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>
          </div>

          {/* Custom Date Range Picker if CUSTOM selected */}
          {timeRange === 'CUSTOM' && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Custom Dates:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs focus:border-[#8A0000] focus:outline-none"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs focus:border-[#8A0000] focus:outline-none"
              />
            </div>
          )}

          {/* Clear Filter Prompt */}
          {hasActiveFilters && (
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>Filtered view active</span>
              <button
                onClick={resetFilters}
                className="font-bold text-[#8A0000] hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/40 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>
                <th className="py-3 pl-6 pr-2 whitespace-nowrap">Date & Time</th>
                <th className="px-3 py-3 whitespace-nowrap">Kiosk Machine</th>
                <th className="px-3 py-3 whitespace-nowrap">Service & Channel</th>
                <th className="px-3 py-3 whitespace-nowrap">Reference & Account</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Face Amount</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Wallet Draw</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Wallet Balance</th>
                <th className="px-3 py-3 whitespace-nowrap">Tag / Remarks</th>
                <th className="py-3 pr-5 pl-2 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-[#8A0000]" />
                      <span>Loading personal withdrawal records...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-1.5">
                      <UserMinus className="h-8 w-8 text-slate-300" />
                      <span className="font-semibold text-slate-700">No Personal Withdrawals Found</span>
                      <span className="text-[11px] text-slate-400 max-w-sm">
                        {hasActiveFilters
                          ? 'No personal withdrawal transactions match your current search or date filters.'
                          : 'No transactions have been tagged as Personal Withdrawal yet. You can mark transactions in the Dashboard table.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const serviceBadge =
                    t.serviceType === 'CASH_IN'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : t.serviceType === 'E_LOAD'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : t.serviceType === 'BILLS_PAYMENT'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3 pl-6 pr-2 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {formatDate(t.transactionTime)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {t.id}
                        </div>
                      </td>

                      {/* Kiosk Machine */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5 font-medium text-slate-800">
                          <Server className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{t.machineName || t.machineId}</span>
                        </div>
                      </td>

                      {/* Service & Channel */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${serviceBadge}`}>
                            {t.serviceType.replace('_', ' ')}
                          </span>
                          {t.providerOrBiller && (
                            <span className="text-[10px] font-semibold text-slate-600">
                              {t.providerOrBiller}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reference & Account */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="text-slate-900 font-mono text-xs font-semibold">
                          {t.referenceNo || '—'}
                        </div>
                        {(t.accountOrPhone || t.customerName) && (
                          <div className="text-[10px] text-slate-500">
                            {t.customerName ? `${t.customerName} • ` : ''}
                            {t.accountOrPhone || ''}
                          </div>
                        )}
                      </td>

                      {/* Face Amount */}
                      <td className="px-3 py-3 text-right font-medium text-slate-700 whitespace-nowrap text-xs">
                        {currency}
                        {t.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Wallet Used (Draw Amount) */}
                      <td className="px-3 py-3 text-right font-black text-rose-700 whitespace-nowrap text-xs">
                        -{currency}
                        {t.walletDeduction.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* Wallet Balance After */}
                      <td className="px-3 py-3 text-right whitespace-nowrap text-xs font-mono">
                        {t.newBalance !== null && t.newBalance !== undefined ? (
                          <span className="font-semibold text-slate-800">
                            {currency}
                            {t.newBalance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Tag & Notes */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-0.5 max-w-[220px]">
                          <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-800 border border-rose-200">
                            <UserMinus className="h-2.5 w-2.5 mr-1" />
                            Personal Draw
                          </span>
                          {t.notes && (
                            <span className="text-[10px] text-slate-500 truncate block w-full" title={t.notes}>
                              {t.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 pr-5 pl-2 text-right whitespace-nowrap">
                        {onEditTransaction && (
                          <button
                            onClick={() => onEditTransaction(t)}
                            className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Inspect or Edit Transaction"
                          >
                            <Edit2 className="h-3 w-3 text-slate-400" />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-xs text-slate-500 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <span>
              Showing {transactions.length} of {totalCount} records
            </span>
            <span className="font-bold text-rose-800">
              Total Wallet Draws: {currency}
              {totalDeduction.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-400 text-[11px]">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-700 focus:border-[#8A0000] focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 text-xs font-semibold text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

