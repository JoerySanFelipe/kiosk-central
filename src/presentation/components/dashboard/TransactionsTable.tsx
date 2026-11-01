'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  Search,
  X,
  ArrowRight,
  Info,
  Pencil,
} from 'lucide-react';
import { Transaction } from '@/domain/types';

interface TransactionsTableProps {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  category?: string;
  onCategoryChange?: (category: string) => void;
  serviceType?: string;
  onServiceTypeChange?: (service: string) => void;
  isLoading?: boolean;
  currency?: string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  timelineControl?: React.ReactNode;
  onEditTransaction?: (t: Transaction) => void;
  extraActions?: React.ReactNode;
}

export function TransactionsTable({
  transactions,
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  category,
  onCategoryChange,
  serviceType,
  onServiceTypeChange,
  isLoading,
  currency = '₱',
  searchTerm,
  onSearchChange,
  timelineControl,
  onEditTransaction,
  extraActions,
}: TransactionsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  const formatMoney = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    return `${currency}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getOverpayment = (t: Transaction) => {
    if (t.serviceType === 'PISO_WIFI') return 0;
    const totalExpected = (t.amount || 0) + (t.fee || 0);
    return Math.max(0, Math.round(((t.insertedAmount || 0) - totalExpected) * 100) / 100);
  };

  const getTotalAmtFee = (t: Transaction) => {
    if (t.serviceType === 'PISO_WIFI') return 0;
    return Math.round(((t.amount || 0) + (t.fee || 0)) * 100) / 100;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Clean White Table Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b border-slate-200 bg-white px-4 sm:px-6 py-3 text-slate-800">
        <div className="text-sm font-bold tracking-wide text-[#8A0000] shrink-0">
          Transaction Records
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* 1. Search Box */}
          {onSearchChange && (
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-8 w-32 sm:w-40 rounded-xl border border-slate-200 bg-slate-50/80 pl-8 pr-6 text-xs font-medium text-slate-900 placeholder-slate-400 shadow-2xs transition-all focus:bg-white focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:w-36 sm:focus:w-44 focus:outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* 2. Category Dropdown (formerly Service) */}
          {onServiceTypeChange && (
            <div className="flex items-center space-x-1 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1">
              <span className="text-[11px] font-semibold text-slate-500">Category:</span>
              <select
                value={serviceType || 'ALL'}
                onChange={(e) => onServiceTypeChange(e.target.value)}
                className="rounded-lg bg-transparent px-0.5 py-0.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="CASH_IN">Cash-In</option>
                <option value="E_LOAD">Load</option>
                <option value="BILLS_PAYMENT">Bills</option>
                <option value="PISO_WIFI">Piso Wifi</option>
              </select>
            </div>
          )}

          {/* 3. View Filter: All, Kiosk Sales, Personal Draws */}
          {onCategoryChange && (
            <div className="flex items-center space-x-1 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1">
              <span className="text-[11px] font-semibold text-slate-500">View:</span>
              <select
                value={category || 'ALL'}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="rounded-lg bg-transparent px-0.5 py-0.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All</option>
                <option value="KIOSK_SALES">Kiosk Sales</option>
                <option value="PERSONAL_WITHDRAWALS">Personal Draws</option>
              </select>
            </div>
          )}

          {/* 4. Timeline Dropdown Filter */}
          {timelineControl && (
            <div className="flex items-center">
              {timelineControl}
            </div>
          )}

          {/* 5. Rows Display Selector: 20, 50, 100, 150, All */}
          {onPageSizeChange && (
            <div className="flex items-center space-x-1 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-1">
              <span className="text-[11px] font-semibold text-slate-500">Show:</span>
              <select
                value={pageSize >= 10000 ? 'ALL' : String(pageSize)}
                onChange={(e) => {
                  const val = e.target.value === 'ALL' ? 10000 : Number(e.target.value);
                  onPageSizeChange(val);
                }}
                className="rounded-lg bg-transparent px-0.5 py-0.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="150">150</option>
                <option value="ALL">All</option>
              </select>
            </div>
          )}

          {/* 6. Export Actions Dropdown */}
          {extraActions && (
            <div className="flex items-center space-x-1 pl-1 border-l border-slate-200">
              {extraActions}
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 pl-6 pr-2 whitespace-nowrap">Date & Time</th>
              <th className="px-3 py-3 whitespace-nowrap">Category</th>
              <th className="px-3 py-3 min-w-[140px]">Reference & Account</th>
              <th className="px-3 py-3 text-right whitespace-nowrap min-w-[90px]">Service Charge</th>
              <th className="px-3 py-3 text-right whitespace-nowrap min-w-[105px]">Amount & Fee</th>
              <th className="px-3 py-3 text-right whitespace-nowrap min-w-[110px]">Inserted Cash</th>
              <th className="px-3 py-3 text-right whitespace-nowrap min-w-[100px]">Net Profit</th>
              <th className="px-3 py-3 whitespace-nowrap">Status</th>
              <th className="py-3 pr-6 pl-2 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`tx-loading-${i}`} className="animate-pulse">
                  <td className="py-3.5 pl-6 pr-2"><div className="h-3.5 w-28 bg-slate-200 rounded"></div></td>
                  <td className="px-3 py-3.5"><div className="h-4 w-16 bg-slate-200 rounded-md"></div></td>
                  <td className="px-3 py-3.5"><div className="h-3.5 w-24 bg-slate-200 rounded"></div></td>
                  <td className="px-3 py-3.5 text-right"><div className="h-3.5 w-12 bg-slate-200 rounded ml-auto"></div></td>
                  <td className="px-3 py-3.5 text-right"><div className="h-3.5 w-16 bg-slate-200 rounded ml-auto"></div></td>
                  <td className="px-3 py-3.5 text-right"><div className="h-3.5 w-16 bg-slate-200 rounded ml-auto"></div></td>
                  <td className="px-3 py-3.5 text-right"><div className="h-3.5 w-14 bg-slate-200 rounded ml-auto"></div></td>
                  <td className="px-3 py-3.5"><div className="h-4 w-16 bg-slate-200 rounded-full"></div></td>
                  <td className="py-3.5 pr-6 pl-2 text-right"><div className="h-6 w-12 bg-slate-200 rounded ml-auto"></div></td>
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-sm text-slate-400">
                  No transaction records found. Please import files to view sales.
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                const isExpanded = expandedId === t.id;
                const isWifi = t.serviceType === 'PISO_WIFI';
                const totalAmtFee = getTotalAmtFee(t);
                const overpayment = getOverpayment(t);

                return (
                  <React.Fragment key={t.id}>
                    <tr
                      onClick={() => toggleExpand(t.id)}
                      className={`cursor-pointer transition-colors ${
                        isExpanded
                          ? 'bg-rose-50/40 border-l-4 border-l-[#8A0000]'
                          : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                      }`}
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 pl-6 pr-2 align-middle">
                        <div className="flex items-center space-x-1.5">
                          <button
                            className={`transition-colors ${
                              isExpanded ? 'text-[#8A0000]' : 'text-slate-400 hover:text-slate-600'
                            }`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <div>
                            <div className="font-semibold text-slate-800">
                              {formatDate(t.transactionTime)}
                            </div>
                            {t.isPersonalDraw && (
                              <span className="inline-flex items-center rounded-md bg-purple-100 px-1.5 py-0.2 text-[9px] font-bold text-purple-800 border border-purple-200 mt-0.5">
                                Personal Withdrawal
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category & Provider */}
                      <td className="px-3 py-3.5 align-middle">
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

                      {/* Reference & Account (Stacked) */}
                      <td className="px-3 py-3.5 align-middle">
                        <div className="font-mono text-xs font-bold text-slate-900">
                          {t.accountOrPhone || t.customerName || (isWifi ? 'Direct Drop' : '—')}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]" title={t.referenceNo || 'None'}>
                          Ref: {t.referenceNo || 'None'}
                        </div>
                      </td>

                      {/* Service Charge */}
                      <td className="px-3 py-3.5 text-right align-middle">
                        <div className="font-medium text-slate-700 text-xs">
                          {isWifi || !t.providerCost ? '—' : formatMoney(t.providerCost)}
                        </div>
                      </td>

                      {/* Amount & Fee (Stacked) */}
                      <td className="px-3 py-3.5 text-right align-middle">
                        <div className="font-bold text-slate-900 text-xs">
                          {isWifi ? '—' : formatMoney(t.amount)}
                        </div>
                        {!isWifi && (
                          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                            Fee: {formatMoney(t.fee)}
                          </div>
                        )}
                      </td>

                      {/* Inserted Cash & Overpayment Pill */}
                      <td className="px-3 py-3.5 text-right align-middle whitespace-nowrap">
                        <div className="font-black text-slate-900 text-xs">
                          {formatMoney(t.insertedAmount)}
                        </div>
                        {overpayment > 0 && (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center whitespace-nowrap px-1.5 py-0.2 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                              +{formatMoney(overpayment)} overpay
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Net Profit */}
                      <td className="px-3 py-3.5 text-right align-middle whitespace-nowrap">
                        {t.isPersonalDraw ? (
                          <span className="inline-flex items-center whitespace-nowrap rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200">
                            {currency}0.00
                          </span>
                        ) : t.netProfit >= 0 ? (
                          <span className="font-black text-emerald-700 text-xs whitespace-nowrap">
                            +{formatMoney(t.netProfit)}
                          </span>
                        ) : (
                          <span className="font-black text-rose-600 text-xs whitespace-nowrap">
                            -{formatMoney(Math.abs(t.netProfit))}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5 align-middle">
                        {t.status === 'SUCCEEDED' ? (
                          <span className="status-badge-succeeded inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                            <CheckCircle className="h-3 w-3" />
                            <span>Succeeded</span>
                          </span>
                        ) : t.status === 'FAILED' ? (
                          <span className="status-badge-failed inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                            <XCircle className="h-3 w-3" />
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="status-badge-pending inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                            <Clock className="h-3 w-3" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pr-6 pl-2 text-right align-middle">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(t.id);
                            }}
                            className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                              isExpanded
                                ? 'bg-[#8A0000] text-white shadow-xs'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                            }`}
                            title={isExpanded ? 'Collapse details' : 'View full ledger drawer'}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {onEditTransaction && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditTransaction(t);
                              }}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                              title="Edit transaction"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Detailed Math Breakdown on expand */}
                    {isExpanded && (
                      <tr className="bg-slate-100/50 border-l-4 border-l-[#8A0000] text-xs">
                        <td colSpan={9} className="px-5 py-4 sm:px-6">
                          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
                            {/* Header row */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  Transaction Audit & Ledger Details
                                </span>
                                {t.referenceNo ? (
                                  <span className="text-[11px] font-mono font-medium text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                                    Ref: {t.referenceNo}
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded border border-slate-200">
                                    Ref: None
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center space-x-2.5">
                                <div className="text-[11px] font-medium text-slate-400">
                                  Exact data from imported file
                                </div>
                                {onEditTransaction && (
                                  <button
                                    onClick={() => onEditTransaction(t)}
                                    className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 hover:text-[#8A0000] transition-colors cursor-pointer"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    <span>Edit Entry</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Owner Personal Withdrawal Banner */}
                            {t.isPersonalDraw && (
                              <div className="flex items-center space-x-2.5 rounded-xl bg-purple-50 border border-purple-200 px-4 py-3 text-xs text-purple-900">
                                <Info className="h-4 w-4 shrink-0 text-purple-600" />
                                <div>
                                  <span className="font-bold">Owner Personal Withdrawal:</span>{' '}
                                  Deducted from LPB central wallet balance, but excluded from physical kiosk vault cash ({currency}0.00 expected) and kiosk operating net profit.
                                </div>
                              </div>
                            )}

                            {/* Wallet Balance Box (Starting Wallet Balance -> Ending Wallet Balance) */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                              {t.oldBalance !== null && t.oldBalance !== undefined && t.newBalance !== null && t.newBalance !== undefined ? (
                                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
                                  {/* Starting Wallet Balance */}
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      Starting Wallet Balance
                                    </span>
                                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                                      {formatMoney(t.oldBalance)}
                                    </div>
                                    <span className="text-[10px] text-slate-400">Wallet before transaction</span>
                                  </div>

                                  {/* less Amount */}
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      less Amount
                                    </span>
                                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                                      -{formatMoney(t.amount)}
                                    </div>
                                    <span className="text-[10px] text-slate-400">Principal face value</span>
                                  </div>

                                  {/* less Service Charge */}
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      less Service Charge
                                    </span>
                                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                                      {t.providerCost > 0 ? `-${formatMoney(t.providerCost)}` : formatMoney(0)}
                                    </div>
                                    <span className="text-[10px] text-slate-400">Provider fee / charge</span>
                                  </div>

                                  {/* Ending Wallet Balance */}
                                  <div className="flex flex-col sm:items-end">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 font-bold">
                                      Ending Wallet Balance
                                    </span>
                                    <div className="text-base font-extrabold text-slate-900 mt-0.5">
                                      {formatMoney(t.newBalance)}
                                    </div>
                                    <span className="text-[10px] text-slate-400">Wallet balance after transaction</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 p-3 text-emerald-900">
                                  <Info className="h-4 w-4 shrink-0 text-emerald-700" />
                                  <div className="text-xs">
                                    <span className="font-bold">No digital wallet ledger required (Piso Wifi):</span> Physical coin drops inserted directly into the kiosk coin hopper/vault.
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Breakdown of Cash, Fees, Overpayment & Profit */}
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                Transaction Financial Breakdown
                              </div>
                              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-7 text-slate-600">
                                {/* Amount */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                                  <span className="text-[10px] uppercase text-slate-400 font-bold block">
                                    Amount
                                  </span>
                                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                                    {isWifi ? '—' : formatMoney(t.amount)}
                                  </div>
                                  <span className="text-[9px] text-slate-400">Requested face value</span>
                                </div>

                                {/* Transaction Fee */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                                  <span className="text-[10px] uppercase text-slate-400 font-bold block">
                                    Transaction Fee
                                  </span>
                                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                                    {isWifi ? '—' : formatMoney(t.fee)}
                                  </div>
                                  <span className="text-[9px] text-slate-400">Convenience fee</span>
                                </div>

                                {/* Total (Amt+Fee) */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                                  <span className="text-[10px] uppercase text-slate-500 font-bold block">
                                    Total (Amt+Fee)
                                  </span>
                                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                                    {isWifi ? '—' : formatMoney(totalAmtFee)}
                                  </div>
                                  <span className="text-[9px] text-slate-400">Amount + fee required</span>
                                </div>

                                {/* Inserted Cash */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                                  <span className="text-[10px] uppercase text-slate-700 font-bold block">
                                    Inserted Cash
                                  </span>
                                  <div className="text-sm font-black text-slate-900 mt-0.5">
                                    {formatMoney(t.insertedAmount)}
                                  </div>
                                  <span className="text-[9px] text-slate-400">Physical cash in hopper</span>
                                </div>

                                {/* Overpayment */}
                                <div className={`rounded-xl border p-2.5 ${
                                  overpayment > 0 
                                    ? 'border-amber-200 bg-amber-50/70 text-amber-900' 
                                    : 'border-slate-200 bg-slate-50/70'
                                }`}>
                                  <span className="text-[10px] uppercase font-bold block text-slate-400">
                                    Overpayment
                                  </span>
                                  <div className={`text-sm font-extrabold mt-0.5 ${
                                    overpayment > 0 ? 'text-amber-700 font-black' : 'text-slate-500'
                                  }`}>
                                    {overpayment > 0 ? `+${formatMoney(overpayment)}` : '—'}
                                  </div>
                                  <span className="text-[9px] text-slate-400">Extra inserted cash</span>
                                </div>

                                {/* Service Charge */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                                  <span className="text-[10px] uppercase text-slate-400 font-bold block">
                                    Service Charge
                                  </span>
                                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                                    {t.providerCost > 0 ? formatMoney(t.providerCost) : '—'}
                                  </div>
                                  <span className="text-[9px] text-slate-400">Cost from provider</span>
                                </div>

                                {/* Net Profit */}
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-emerald-900">
                                  <span className="text-[10px] uppercase text-emerald-700 font-bold block">
                                    Net Profit (Kita)
                                  </span>
                                  <div className="text-sm font-black text-emerald-700 mt-0.5">
                                    +{formatMoney(t.netProfit)}
                                  </div>
                                  <span className="text-[9px] text-emerald-600/90">Earned margin</span>
                                </div>
                              </div>
                            </div>

                            {/* Notes / Diagnostics */}
                            {t.notes && (
                              <div className="flex items-start space-x-2 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700">
                                <Info className="h-4 w-4 shrink-0 mt-0.5 text-slate-500" />
                                <div>
                                  <span className="font-bold">Log / File Notes:</span> {t.notes}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row text-xs text-slate-500">
        <div>
          {pageSize >= 10000
            ? `Showing all ${total} transaction records`
            : total === 0
            ? '0 transactions'
            : `Showing ${((page - 1) * pageSize) + 1} to ${Math.min(page * pageSize, total)} of ${total} transactions (Page ${page} of ${totalPages})`}
        </div>
        <div className="flex items-center space-x-1">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex h-8 items-center space-x-1 rounded-lg border border-slate-200 px-2.5 font-medium transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Previous</span>
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = i + 1;
            const isCurrent = pageNum === page;
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold transition-colors ${
                  isCurrent
                    ? 'bg-[#8A0000] text-white shadow-sm'
                    : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex h-8 items-center space-x-1 rounded-lg border border-slate-200 px-2.5 font-medium transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
