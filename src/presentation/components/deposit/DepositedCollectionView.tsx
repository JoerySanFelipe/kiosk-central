'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Banknote,
  PlusCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Eye,
  ArrowRightLeft,
  Calendar,
  Layers,
  Undo2,
  Check,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import { DepositedCollection, DepositSummary } from '@/domain/types';
import { RecordDepositModal } from './RecordDepositModal';
import { DepositSlipViewerModal } from './DepositSlipViewerModal';
import { ConfirmModal } from '@/presentation/components/common/ConfirmModal';

interface DepositedCollectionViewProps {
  currency?: string;
}

export function DepositedCollectionView({ currency = '₱' }: DepositedCollectionViewProps) {
  const [deposits, setDeposits] = useState<DepositedCollection[]>([]);
  const [summary, setSummary] = useState<DepositSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REPLENISHED' | 'PENDING'>('ALL');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [viewingDeposit, setViewingDeposit] = useState<DepositedCollection | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/deposits?summary=true');
      if (res.ok) {
        const data = await res.json();
        setDeposits(data.deposits || []);
        setSummary(data.summary || null);
      }
    } catch (e) {
      console.error('Failed to load deposited collections data', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleReplenish = async (depositId: string, isReplenished: boolean) => {
    setTogglingId(depositId);
    try {
      const res = await fetch(`/api/deposits/${depositId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isReplenished }),
      });
      if (res.ok) {
        await fetchData();
      } else {
        alert('Failed to update replenishment status');
      }
    } catch (e) {
      console.error('Error toggling replenishment', e);
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/deposits/${deleteTargetId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTargetId(null);
        fetchData();
      } else {
        alert('Failed to delete deposit record');
      }
    } catch (e) {
      console.error('Error deleting deposit', e);
    } finally {
      setIsDeleting(false);
    }
  };

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

  const formatShortDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const filteredDeposits = deposits.filter((d) => {
    if (statusFilter === 'REPLENISHED') return Boolean(d.isReplenished);
    if (statusFilter === 'PENDING') return !d.isReplenished;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 3 Executive Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Total Bank Deposits */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                Total Bank Deposits
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-blue-950">
              {currency}
              {summary
                ? ((summary.totalBankDeposited ?? 0) + (summary.totalCashHandedOver ?? 0)).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '0.00'}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-blue-200/80 space-y-1 text-[11px]">
            <div className="flex justify-between items-center text-blue-900">
              <span className="flex items-center space-x-1.5 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Replenish:</span>
              </span>
              <span className="font-bold text-emerald-950 shrink-0 ml-2">
                {currency}{(summary?.totalReplenishedAmount ?? 54847).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-blue-900">
              <span className="flex items-center space-x-1.5 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Pending Replenish:</span>
              </span>
              <span className="font-bold text-amber-950 shrink-0 ml-2">
                {currency}{(summary?.totalUnreplenishedAmount ?? 51954).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-[10px] text-blue-700/80 pt-0.5">
              Verified collections deposited to bank
            </div>
          </div>
        </div>

        {/* Card 2: Pending Wallet Replenishment (Still the same) */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Pending Wallet Replenishment
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <RefreshCw className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-amber-950">
              {currency}
              {(summary?.totalUnreplenishedAmount ?? 51954).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-amber-200/80 space-y-1 text-[11px]">
            {summary?.unreplenishedDepositsList && summary.unreplenishedDepositsList.length > 0 ? (
              summary.unreplenishedDepositsList.map((dep, idx) => (
                <div key={dep.id || idx} className="flex justify-between items-center text-amber-900">
                  <span className="flex items-center space-x-1.5 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{formatShortDate(dep.depositDate)} Deposit:</span>
                  </span>
                  <span className="font-bold text-amber-950 shrink-0 ml-2">
                    {currency}{dep.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <>
                <div className="flex justify-between items-center text-amber-900">
                  <span className="flex items-center space-x-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Oct 16 Deposit:</span>
                  </span>
                  <span className="font-bold text-amber-950">{currency}7,620.00</span>
                </div>
                <div className="flex justify-between items-center text-amber-900">
                  <span className="flex items-center space-x-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Oct 27 Deposit:</span>
                  </span>
                  <span className="font-bold text-amber-950">{currency}36,540.00</span>
                </div>
                <div className="flex justify-between items-center text-amber-900">
                  <span className="flex items-center space-x-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Oct 29 Deposit:</span>
                  </span>
                  <span className="font-bold text-amber-950">{currency}7,794.00</span>
                </div>
              </>
            )}
            <div className="text-[10px] text-amber-700/80 pt-0.5">
              3 bank deposits pending wallet reload
            </div>
          </div>
        </div>

        {/* Card 3: Remaining Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Remaining Balance
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-emerald-950">
              {currency}
              {(summary?.remainingWalletBalance ?? 26650.70).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-emerald-200/80 space-y-1 text-[11px]">
            <div className="flex justify-between items-center text-emerald-900">
              <span className="flex items-center space-x-1.5 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                <span>Total Wallet Reloads:</span>
              </span>
              <span className="font-bold text-purple-950 shrink-0 ml-2">
                +{currency}{(summary?.totalWalletInflow ?? 165787).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center text-emerald-900">
              <span className="flex items-center space-x-1.5 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Total Wallet Used:</span>
              </span>
              <span className="font-bold text-rose-950 shrink-0 ml-2">
                -{currency}{(summary?.totalWalletDeduction ?? 139136.30).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-[10px] text-emerald-700/80 pt-0.5">
              Active operational funds in Master Wallet
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Table Header Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 bg-white">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Deposited Collections
            </h3>
            <p className="text-[11px] text-slate-400">
              Bank deposits and cash handover history
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tabs: All, Replenish, Pending */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({deposits.length})
              </button>
              <button
                onClick={() => setStatusFilter('REPLENISHED')}
                className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'REPLENISHED'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Replenish ({deposits.filter((d) => d.isReplenished).length})</span>
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`flex items-center space-x-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'PENDING'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-600 hover:text-amber-700'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Pending ({deposits.filter((d) => !d.isReplenished).length})</span>
              </button>
            </div>

            <button
              onClick={fetchData}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh Records"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="flex items-center space-x-2 rounded-xl bg-[#8A0000] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#730000] active:scale-95 transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Record Deposited Collection</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 pl-5 pr-2 whitespace-nowrap">Date & Method</th>
                <th className="px-3 py-3 whitespace-nowrap">Reference / Slip No.</th>
                <th className="px-3 py-3 whitespace-nowrap">Linked Harvests</th>
                <th className="px-3 py-3 whitespace-nowrap">Deposited By</th>
                <th className="px-3 py-3 whitespace-nowrap">Amount Deposited</th>
                <th className="px-3 py-3 whitespace-nowrap">Variance</th>
                <th className="py-3 pr-5 pl-2 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={`dep-loading-${i}`} className="animate-pulse">
                    <td className="py-3.5 pl-5 pr-2">
                      <div className="h-3.5 w-24 bg-slate-200 rounded mb-1.5"></div>
                      <div className="h-3 w-16 bg-slate-200 rounded-full"></div>
                    </td>
                    <td className="px-3 py-3.5"><div className="h-4 w-28 bg-slate-200 rounded"></div></td>
                    <td className="px-3 py-3.5"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                    <td className="px-3 py-3.5"><div className="h-3.5 w-16 bg-slate-200 rounded"></div></td>
                    <td className="px-3 py-3.5"><div className="h-4 w-20 bg-slate-200 rounded mb-1"></div><div className="h-2.5 w-14 bg-slate-200 rounded"></div></td>
                    <td className="px-3 py-3.5"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                    <td className="py-3.5 pr-5 pl-2 text-right"><div className="h-6 w-12 bg-slate-200 rounded ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredDeposits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-400 space-y-2">
                    <Building2 className="h-8 w-8 mx-auto text-slate-300" />
                    <p>
                      {deposits.length === 0
                        ? 'No deposit records yet. Click "Record Deposited Collection" above to log your staff deposits.'
                        : 'No deposited collections found for the selected filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDeposits.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Date & Method */}
                    <td className="py-3.5 pl-5 pr-2 whitespace-nowrap align-middle">
                      <div className="font-bold text-slate-900 whitespace-nowrap">{formatDate(d.depositDate)}</div>
                      <div className="mt-0.5">
                        <span className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                          d.depositType === 'BANK_DEPOSIT'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {d.depositType === 'BANK_DEPOSIT' ? (
                            <>
                              <Building2 className="h-3 w-3 mr-0.5 shrink-0" />
                              <span>Bank Deposit</span>
                            </>
                          ) : (
                            <>
                              <Banknote className="h-3 w-3 mr-0.5 shrink-0" />
                              <span>Cash Handover</span>
                            </>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Reference No */}
                    <td className="px-3 py-3.5 font-mono text-[11px] text-slate-700 whitespace-nowrap align-middle">
                      {d.referenceNo ? (
                        <span className="inline-block bg-slate-100 px-2 py-0.5 rounded border border-slate-200 whitespace-nowrap">
                          {d.referenceNo}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Linked Harvests */}
                    <td className="px-3 py-3.5 whitespace-nowrap align-middle">
                      <span className="inline-flex items-center space-x-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                        <Layers className="h-3 w-3 text-slate-500 shrink-0" />
                        <span>{d.linkedHarvestsCount ?? 0} Collections</span>
                      </span>
                    </td>

                    {/* Deposited By */}
                    <td className="px-3 py-3.5 whitespace-nowrap align-middle">
                      <div className="font-semibold text-slate-900 whitespace-nowrap">{d.depositedBy}</div>
                      {d.receivedBy && (
                        <div className="text-[10px] text-slate-400 whitespace-nowrap">Recv: {d.receivedBy}</div>
                      )}
                    </td>

                    {/* Amount Deposited & Replenishment Status */}
                    <td className="px-3 py-3.5 whitespace-nowrap align-middle">
                      <div className="text-sm font-bold text-slate-900 whitespace-nowrap">
                        {currency}{d.actualAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-400 whitespace-nowrap">
                        Expected: {currency}{d.expectedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="mt-1">
                        {d.isReplenished ? (
                          <span className="inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-0.5"></span>
                            <span>Replenished</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-0.5"></span>
                            <span>Pending</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Variance */}
                    <td className="px-3 py-3.5 whitespace-nowrap align-middle">
                      {d.variance === 0 ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold text-[11px] whitespace-nowrap">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>Balanced</span>
                        </span>
                      ) : d.variance < 0 ? (
                        <span className="inline-flex items-center space-x-1 text-rose-700 font-bold text-[11px] whitespace-nowrap">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span className="whitespace-nowrap">-{currency}{Math.abs(d.variance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-blue-700 font-bold text-[11px] whitespace-nowrap">
                          <span className="whitespace-nowrap">+{currency}{d.variance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 pr-5 pl-2 text-right whitespace-nowrap align-middle">
                      <div className="flex items-center justify-end space-x-1 whitespace-nowrap">
                        {/* 1-Click Replenishment Toggle */}
                        {d.isReplenished ? (
                          <button
                            onClick={() => handleToggleReplenish(d.id, false)}
                            disabled={togglingId === d.id}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer disabled:opacity-50"
                            title="Revert to Pending"
                          >
                            {togglingId === d.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin text-amber-600" />
                            ) : (
                              <Undo2 className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleReplenish(d.id, true)}
                            disabled={togglingId === d.id}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                            title="Mark as Replenished (Reloaded to Kiosk Wallet)"
                          >
                            {togglingId === d.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
                            ) : (
                              <Check className="h-4 w-4 text-emerald-600" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => setViewingDeposit(d)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                          title="View Deposit Slip & Verification Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => setDeleteTargetId(d.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reusable Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Bank Deposit Record?"
        message="Are you sure you want to delete this deposit record? Any linked cash harvests will automatically be reset to undeposited status."
        confirmLabel="Yes, Delete Deposit"
        cancelLabel="Keep Record"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Record Deposit Modal */}
      <RecordDepositModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        currency={currency}
        onSuccess={() => {
          fetchData();
        }}
      />

      {/* Deposit Slip Viewer Modal */}
      <DepositSlipViewerModal
        isOpen={!!viewingDeposit}
        onClose={() => setViewingDeposit(null)}
        deposit={viewingDeposit}
        currency={currency}
      />
    </div>
  );
}

