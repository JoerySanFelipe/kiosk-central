'use client';

import React, { useState } from 'react';
import { CashHarvest } from '@/domain/types';
import {
  Calendar,
  Trash2,
  Pencil,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Image as ImageIcon,
} from 'lucide-react';
import { ConfirmModal } from '@/presentation/components/common/ConfirmModal';

interface HarvestHistoryTableProps {
  harvests: CashHarvest[];
  isLoading?: boolean;
  currency?: string;
  onViewDetails?: (harvest: CashHarvest) => void;
  onEditHarvest?: (harvest: CashHarvest) => void;
  onDeleteHarvest?: (id: string) => void;
  timelineControl?: React.ReactNode;
}

export function HarvestHistoryTable({
  harvests,
  isLoading,
  currency = '₱',
  onViewDetails,
  onEditHarvest,
  onDeleteHarvest,
  timelineControl,
}: HarvestHistoryTableProps) {
  const [harvestToDelete, setHarvestToDelete] = useState<CashHarvest | null>(null);

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

  const hasActions = Boolean(onViewDetails || onEditHarvest || onDeleteHarvest);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-white">
        <div>
          <h4 className="text-sm font-bold tracking-wide text-[#8A0000]">
            Collection History
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Past coin box and bill acceptor harvest records with full audit trail
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs font-semibold text-slate-500">
          {timelineControl && <div>{timelineControl}</div>}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-1">
            Total Collections: <span className="font-bold text-slate-800">{harvests.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 pl-6 pr-3">Harvest Record / Cutoff</th>
              <th className="px-4 py-3">Expected Cash</th>
              <th className="px-4 py-3">Actual Collected</th>
              <th className="px-4 py-3">Variance</th>
              {hasActions && (
                <th className="py-3 pr-6 pl-2 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={`harvest-loading-${i}`} className="animate-pulse">
                  <td className="py-3.5 pl-6 pr-3">
                    <div className="h-3.5 w-28 bg-slate-200 rounded mb-1.5"></div>
                    <div className="h-3 w-16 bg-slate-200 rounded-full"></div>
                  </td>
                  <td className="px-4 py-3.5"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-3.5"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                  <td className="px-4 py-3.5"><div className="h-4 w-24 bg-slate-200 rounded-full"></div></td>
                  {hasActions && (
                    <td className="py-3.5 pr-6 pl-2 text-right"><div className="h-6 w-16 bg-slate-200 rounded ml-auto"></div></td>
                  )}
                </tr>
              ))
            ) : harvests.length === 0 ? (
              <tr>
                <td colSpan={hasActions ? 5 : 4} className="py-10 text-center text-slate-400">
                  No cash harvests recorded yet for this terminal. Use &quot;Record Cash Harvest&quot; when collecting money from the vault.
                </td>
              </tr>
            ) : (
              harvests.map((h) => {
                const isBalanced = h.variance === 0;
                const isShortage = h.variance < 0;

                return (
                  <tr key={h.id} className="transition-colors hover:bg-slate-50/70">
                    {/* Collection Record & Cutoff */}
                    <td className="py-3.5 pl-6 pr-3 align-middle">
                      <div className="font-bold text-slate-900 text-xs tracking-tight">
                        {h.reportName || `Harvest-${h.harvestedAt.slice(0, 10)}`}
                      </div>
                      <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5 font-medium">
                        <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>Cutoff: {formatDate(h.harvestedAt)}</span>
                      </div>
                      <div className="mt-1 flex items-center space-x-1.5 flex-wrap">
                        {h.isDeposited ? (
                          <span className="inline-flex items-center space-x-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <span>Deposited</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                            <span>Pending Deposit</span>
                          </span>
                        )}
                        {h.slipImageUrl && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(h.slipImageUrl!, '_blank');
                            }}
                            className="inline-flex items-center space-x-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Click to open attached tally slip photo"
                          >
                            <ImageIcon className="h-2.5 w-2.5 mr-0.5" />
                            <span>Slip Photo</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Expected Cash */}
                    <td className="px-4 py-3.5 align-middle font-semibold text-slate-700">
                      {formatMoney(h.expectedAmount)}
                    </td>

                    {/* Actual Collected (Amount only) */}
                    <td className="px-4 py-3.5 align-middle font-bold text-slate-900 text-sm">
                      {formatMoney(h.actualAmount)}
                    </td>

                    {/* Variance */}
                    <td className="px-4 py-3.5 align-middle">
                      {isBalanced ? (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Balanced (₱0.00)</span>
                        </span>
                      ) : isShortage ? (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200/60">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Shortage (-{formatMoney(Math.abs(h.variance))})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200/60">
                          <ArrowUpRight className="h-3 w-3" />
                          <span>Overage (+{formatMoney(h.variance)})</span>
                        </span>
                      )}
                    </td>

                    {/* Action Buttons (View Details, Edit & Delete) */}
                    {hasActions && (
                      <td className="py-3.5 pr-6 pl-2 align-middle text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {onViewDetails && (
                            <button
                              onClick={() => onViewDetails(h)}
                              className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs active:scale-95 cursor-pointer"
                              title="View Collection Details & Covered Transactions"
                            >
                              <Eye className="h-3.5 w-3.5 text-[#8A0000]" />
                              <span>Details</span>
                            </button>
                          )}
                          {onEditHarvest && (
                            <button
                              onClick={() => onEditHarvest(h)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                              title="Edit cash harvest record"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {onDeleteHarvest && (
                            <button
                              onClick={() => setHarvestToDelete(h)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete harvest record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reusable Confirmation Modal */}
      <ConfirmModal
        isOpen={!!harvestToDelete}
        onClose={() => setHarvestToDelete(null)}
        onConfirm={() => {
          if (harvestToDelete && onDeleteHarvest) {
            onDeleteHarvest(harvestToDelete.id);
            setHarvestToDelete(null);
          }
        }}
        title="Delete Cash Harvest Record?"
        message={
          harvestToDelete?.isDeposited
            ? 'This harvest is already linked to a recorded deposit. Deleting it will recalculate and reduce the deposit expected amount.'
            : 'Are you sure you want to delete this cash harvest record? This will restore the machine uncollected cash vault.'
        }
        confirmLabel="Yes, Delete Harvest"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
