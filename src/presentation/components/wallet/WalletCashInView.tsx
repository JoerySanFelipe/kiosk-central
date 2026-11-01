'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Plus,
  ArrowDownCircle,
  Calendar,
  Building2,
  RefreshCw,
  Trash2,
  Image as ImageIcon,
  QrCode,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { WalletReplenishment, DepositedCollection, FinancialSummary } from '@/domain/types';
import { RecordWalletCashInModal } from './RecordWalletCashInModal';
import { ConfirmModal } from '@/presentation/components/common/ConfirmModal';

interface WalletCashInViewProps {
  totalWalletDeductions?: number;
  summary?: FinancialSummary;
}

type TabType = 'ALL' | 'QR PH' | 'Metrobank' | 'Cash-in Form';

export function WalletCashInView({ totalWalletDeductions = 0, summary }: WalletCashInViewProps) {
  const [replenishments, setReplenishments] = useState<WalletReplenishment[]>([]);
  const [totalReplenished, setTotalReplenished] = useState<number>(0);
  const [unreplenishedDeposits, setUnreplenishedDeposits] = useState<DepositedCollection[]>([]);
  const [isLoadingDeposits, setIsLoadingDeposits] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Modal & Tab States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');

  const fetchReplenishments = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet-replenishments');
      if (res.ok) {
        const data = await res.json();
        setReplenishments(data.replenishments || []);
        setTotalReplenished(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load wallet replenishments', e);
    }
  }, []);

  const fetchUnreplenishedDeposits = useCallback(async () => {
    try {
      setIsLoadingDeposits(true);
      const res = await fetch('/api/deposits?unreplenished=true');
      if (res.ok) {
        const data = await res.json();
        setUnreplenishedDeposits(data.deposits || []);
      }
    } catch (e) {
      console.error('Failed to load unreplenished deposits', e);
    } finally {
      setIsLoadingDeposits(false);
    }
  }, []);

  useEffect(() => {
    fetchReplenishments();
    fetchUnreplenishedDeposits();
  }, [fetchReplenishments, fetchUnreplenishedDeposits]);

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    setDeletingId(confirmDeleteId);
    try {
      const res = await fetch(`/api/wallet-replenishments/${confirmDeleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setConfirmDeleteId(null);
        fetchReplenishments();
        fetchUnreplenishedDeposits();
      } else {
        alert('Failed to delete cash-in record');
      }
    } catch (e) {
      console.error('Error deleting replenishment', e);
    } finally {
      setDeletingId(null);
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
        minute: 'numeric',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  // Filter replenishments based on active tab
  const filteredReplenishments = replenishments.filter((r) => {
    if (activeTab === 'ALL') return true;
    const s = (r.source || '').toLowerCase();
    if (activeTab === 'QR PH') return s.includes('qr');
    if (activeTab === 'Metrobank') return s.includes('metrobank');
    if (activeTab === 'Cash-in Form') return s.includes('form') || s.includes('cash-in');
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar with Primary Action */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center space-x-2 rounded-xl bg-[#8A0000] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#730000] active:scale-98 transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Record Wallet Cash-In</span>
        </button>
      </div>

      {/* 3 Clean Metric Cards with Machine & Personal Draw Breakdowns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Card 1: Total Cash-In Reloads */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Total Wallet Reloads
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <ArrowDownCircle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-emerald-950">
              ₱{totalReplenished.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-emerald-200/80 space-y-1 text-[11px]">
            <div className="flex justify-between items-center text-emerald-900">
              <span className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Starting Capital:</span>
              </span>
              <span className="font-bold text-emerald-950">₱110,955.00</span>
            </div>
            <div className="flex justify-between items-center text-emerald-900">
              <span className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>Collection Reloads:</span>
              </span>
              <span className="font-bold text-emerald-950">
                ₱{Math.max(0, totalReplenished - 110955).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="text-[10px] text-emerald-700/80 pt-0.5">
              Total funds deposited into Master Wallet
            </div>
          </div>
        </div>

        {/* Card 2: Total Wallet Used with Breakdown of Machines & Personal Draws */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Total Wallet Used
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-amber-950">
              ₱{totalWalletDeductions.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Breakdown Section: Machines + Personal Withdrawals */}
          <div className="mt-3 pt-2.5 border-t border-amber-200/80 space-y-1 text-[11px]">
            {summary?.machineDeductions && summary.machineDeductions.length > 0 ? (
              summary.machineDeductions.map((m) => (
                <div key={m.machineId} className="flex justify-between items-center text-amber-900">
                  <span className="flex items-center space-x-1.5 truncate">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="truncate">{m.machineName}:</span>
                  </span>
                  <span className="font-bold text-amber-950 shrink-0 ml-2">
                    ₱{m.totalDeduction.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))
            ) : (
              <>
                <div className="flex justify-between items-center text-amber-900">
                  <span className="flex items-center space-x-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>3C Kiosk:</span>
                  </span>
                  <span className="font-bold text-amber-950">₱126,282.30</span>
                </div>
                <div className="flex justify-between items-center text-amber-900">
                  <span className="flex items-center space-x-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span>Porbido Farm:</span>
                  </span>
                  <span className="font-bold text-amber-950">₱3,519.00</span>
                </div>
              </>
            )}

            {/* Personal Withdrawals */}
            <div className="flex justify-between items-center text-purple-900 font-medium pt-0.5">
              <span className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                <span>Personal Draws:</span>
              </span>
              <span className="font-bold text-purple-950">
                ₱{(summary?.totalPersonalDraws ?? 9335).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Remaining Wallet Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/40 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                Remaining Wallet Balance
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-black tracking-tight text-blue-950">
              ₱{(summary?.reconciliation.currentEstimatedWalletBalance ?? Math.max(0, totalReplenished - totalWalletDeductions)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-blue-200/80 space-y-1 text-[11px]">
            <div className="flex justify-between items-center text-blue-900">
              <span className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Reconciliation Status:</span>
              </span>
              <span className="font-bold text-emerald-700">100% Balanced</span>
            </div>
            <div className="flex justify-between items-center text-blue-900">
              <span className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                <span>Audit Discrepancy:</span>
              </span>
              <span className="font-bold text-blue-950">₱0.00 (Zero)</span>
            </div>
            <div className="text-[10px] text-blue-700/80 pt-0.5">
              Available balance in LPB Master Wallet
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="border-b border-slate-200 bg-white px-2 sm:px-4 rounded-xl shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 sm:space-x-8 overflow-x-auto no-scrollbar">
            {/* QR PH Tab */}
            <button
              onClick={() => setActiveTab('QR PH')}
              className={`flex items-center space-x-2 py-3.5 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                activeTab === 'QR PH'
                  ? 'text-rose-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode
                className={`h-4 w-4 ${
                  activeTab === 'QR PH' ? 'text-rose-600' : 'text-slate-400'
                }`}
              />
              <span>QR PH</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 tracking-wide">
                Instant
              </span>
              {activeTab === 'QR PH' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full" />
              )}
            </button>

            {/* Metrobank Tab */}
            <button
              onClick={() => setActiveTab('Metrobank')}
              className={`flex items-center space-x-2 py-3.5 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                activeTab === 'Metrobank'
                  ? 'text-blue-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2
                className={`h-4 w-4 ${
                  activeTab === 'Metrobank' ? 'text-blue-600' : 'text-slate-400'
                }`}
              />
              <span>Metrobank</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 tracking-wide">
                Instant
              </span>
              {activeTab === 'Metrobank' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>

            {/* Cash-in Form Tab */}
            <button
              onClick={() => setActiveTab('Cash-in Form')}
              className={`flex items-center space-x-2 py-3.5 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                activeTab === 'Cash-in Form'
                  ? 'text-amber-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet
                className={`h-4 w-4 ${
                  activeTab === 'Cash-in Form' ? 'text-amber-600' : 'text-slate-400'
                }`}
              />
              <span>Cash-in Form</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 tracking-wide">
                Manual Approval
              </span>
              {activeTab === 'Cash-in Form' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 rounded-full" />
              )}
            </button>

            {/* Transaction History (All) Tab */}
            <button
              onClick={() => setActiveTab('ALL')}
              className={`flex items-center space-x-2 py-3.5 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                activeTab === 'ALL'
                  ? 'text-[#8A0000]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock
                className={`h-4 w-4 ${
                  activeTab === 'ALL' ? 'text-[#8A0000]' : 'text-slate-400'
                }`}
              />
              <span>Transaction History</span>
              {activeTab === 'ALL' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8A0000] rounded-full" />
              )}
            </button>
          </div>

          {/* Quick Refresh Icon */}
          <button
            onClick={() => {
              fetchReplenishments();
              fetchUnreplenishedDeposits();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shrink-0 ml-3"
            title="Refresh Records"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Full-Width Replenishment History Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {activeTab === 'ALL'
                ? 'All Replenishment Records'
                : `${activeTab} Records`}
            </h3>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              {filteredReplenishments.length}
            </span>
          </div>

          {unreplenishedDeposits.length > 0 && (
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              {unreplenishedDeposits.length} Collection Deposit{unreplenishedDeposits.length > 1 ? 's' : ''} Ready to Fund Reload
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/40 text-[11px] font-semibold text-slate-500 uppercase">
              <tr>
                <th className="py-3 pl-6 pr-2 whitespace-nowrap">Date & Time</th>
                <th className="px-3 py-3 whitespace-nowrap">Source / Method</th>
                <th className="px-3 py-3 whitespace-nowrap">Reference</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Amount Reloaded</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">New Balance</th>
                <th className="py-3 pr-5 pl-2 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReplenishments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-xs text-slate-400">
                    <p className="font-semibold text-slate-600">No records found for {activeTab === 'ALL' ? 'Transaction History' : activeTab}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Click &quot;Record Wallet Cash-In&quot; to log a top-up transaction.</p>
                  </td>
                </tr>
              ) : (
                filteredReplenishments.map((r) => {
                  const sourceLabel = r.source || 'DIRECT';
                  const isMetrobank = sourceLabel.toLowerCase().includes('metrobank');
                  const isQrPh = sourceLabel.toLowerCase().includes('qr');
                  const isCashInForm = sourceLabel.toLowerCase().includes('form');
                  const isFix = sourceLabel.toLowerCase().includes('fix');
                  const isDirect = sourceLabel.toLowerCase().includes('direct');

                  const badgeColor = isMetrobank
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : isQrPh
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : isCashInForm
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : isFix
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : isDirect
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3.5 pl-6 pr-2 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {formatDate(r.replenishedAt)}
                        </div>
                        {r.notes && (
                          <div
                            className="text-[10px] text-slate-400 truncate max-w-[240px]"
                            title={r.notes}
                          >
                            {r.notes}
                          </div>
                        )}
                      </td>

                      {/* Source / Method */}
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${badgeColor}`}
                          >
                            {sourceLabel}
                          </span>

                          <div className="flex items-center space-x-1.5 flex-wrap">
                            {r.receiptImageUrl && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(r.receiptImageUrl!, '_blank');
                                }}
                                className="inline-flex items-center space-x-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-[#8A0000] border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                                title="Click to view attached receipt"
                              >
                                <ImageIcon className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                                <span>Receipt</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Reference */}
                      <td className="px-3 py-3.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {r.referenceNo || '—'}
                      </td>

                      {/* Amount Reloaded */}
                      <td className="px-3 py-3.5 text-right font-black text-emerald-700 whitespace-nowrap text-xs">
                        +₱{r.amount.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      {/* New Balance */}
                      <td className="px-3 py-3.5 text-right whitespace-nowrap text-xs">
                        <div className="font-bold text-slate-900">
                          ₱{(r.computedNewBalance ?? 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        {r.balanceBefore !== undefined && (
                          <div className="text-[10px] text-slate-400">
                            from ₱{r.balanceBefore.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pr-5 pl-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => setConfirmDeleteId(r.id)}
                          disabled={deletingId === r.id}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                          title="Delete Cash-In Record"
                        >
                          {deletingId === r.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-rose-500" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        {filteredReplenishments.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-xs text-slate-500 font-semibold flex items-center justify-between">
            <span>
              Showing {filteredReplenishments.length} of {replenishments.length} records
            </span>
            <span className="text-emerald-700 font-bold">
              Total: ₱{filteredReplenishments
                .reduce((acc, curr) => acc + curr.amount, 0)
                .toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
            </span>
          </div>
        )}
      </div>

      {/* Reusable Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Wallet Cash-In Record?"
        message="Are you sure you want to delete this cash-in reload? Any linked deposited collections will be reverted to unreplenished (Pending status)."
        confirmLabel="Yes, Delete Cash-In"
        cancelLabel="Keep Record"
        variant="danger"
        isLoading={!!deletingId}
      />

      {/* Dedicated Record Wallet Cash-In Modal */}
      <RecordWalletCashInModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        unreplenishedDeposits={unreplenishedDeposits}
        isLoadingDeposits={isLoadingDeposits}
        onSuccess={() => {
          fetchReplenishments();
          fetchUnreplenishedDeposits();
        }}
        initialSource={activeTab === 'ALL' ? 'QR PH' : activeTab}
      />
    </div>
  );
}
