'use client';

import React from 'react';
import { X, ExternalLink, Calendar, User, FileText, CheckCircle2 } from 'lucide-react';
import { DepositedCollection } from '@/domain/types';

interface DepositSlipViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  deposit: DepositedCollection | null;
  currency?: string;
}

export function DepositSlipViewerModal({
  isOpen,
  onClose,
  deposit,
  currency = '₱',
}: DepositSlipViewerModalProps) {
  const [fullDeposit, setFullDeposit] = React.useState<DepositedCollection | null>(deposit);

  React.useEffect(() => {
    if (deposit && isOpen) {
      setFullDeposit(deposit);
      fetch(`/api/deposits/${deposit.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && !data.error) {
            setFullDeposit(data);
          }
        })
        .catch((e) => console.error('Failed to load full deposit details', e));
    }
  }, [deposit, isOpen]);

  if (!isOpen || !deposit) return null;

  const current = fullDeposit || deposit;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span>Deposit Slip & Verification Receipt</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                current.depositType === 'BANK_DEPOSIT'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {current.depositType === 'BANK_DEPOSIT' ? 'Bank Deposit' : 'Cash Handover'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Ref: {current.referenceNo || current.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Metadata pill grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Deposited Date</span>
              <span className="font-semibold text-slate-800">{formatDate(current.depositDate)}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Amount Deposited</span>
              <span className="font-bold text-slate-900 whitespace-nowrap">
                {currency}{current.actualAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Variance</span>
              <span className={`font-bold whitespace-nowrap ${
                current.variance === 0
                  ? 'text-emerald-700'
                  : current.variance < 0
                  ? 'text-rose-600'
                  : 'text-blue-700'
              }`}>
                {current.variance === 0
                  ? 'Balanced'
                  : `${current.variance > 0 ? '+' : ''}${currency}${current.variance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Staff in Charge</span>
              <span className="font-semibold text-slate-800">{current.depositedBy}</span>
            </div>
          </div>

          {/* Deposit Slip Image View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
              <span>Attached Deposit Slip Proof:</span>
              {current.slipImageUrl && (
                <a
                  href={current.slipImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 text-[11px] text-[#8A0000] hover:underline"
                >
                  <span>Open Full Image</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100/70 p-2 min-h-[260px] overflow-hidden">
              {current.slipImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.slipImageUrl}
                  alt="Deposit Slip Proof"
                  className="max-h-[460px] w-auto rounded-lg object-contain shadow-xs"
                />
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <FileText className="h-8 w-8 mx-auto opacity-50" />
                  <p className="text-xs">No deposit slip image attached for this record.</p>
                </div>
              )}
            </div>
          </div>

          {/* Linked Harvest Collections Breakdown */}
          {current.linkedHarvests && current.linkedHarvests.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 block">
                Linked Harvest Collections ({current.linkedHarvests.length}):
              </span>
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs">
                {current.linkedHarvests.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-2.5 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        {h.reportName || `Harvest-${h.harvestedAt.slice(0, 10)}`}
                        <span className="ml-1.5 font-normal text-slate-500">({h.machineName || 'Vendo'})</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Cutoff: {formatDate(h.harvestedAt)} • Collector: {h.collectedBy}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block">
                        {currency}{h.actualAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      {h.adjustmentType && h.adjustmentType !== 'NONE' && (h.adjustmentAmount || 0) > 0 && (
                        <span className="text-[9px] text-slate-500 block">
                          Adj: {h.adjustmentType === 'ADD' ? '+' : '-'}{currency}{(h.adjustmentAmount || 0).toFixed(2)}
                        </span>
                      )}
                      {h.variance !== 0 && (
                        <span className="text-[9px] text-slate-400 block">
                          Var: {h.variance > 0 ? '+' : ''}{currency}{h.variance.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Notes */}
          {current.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-700">
              <span className="font-bold block text-slate-900 mb-1">Audit Notes:</span>
              <p className="text-slate-600 leading-relaxed">{current.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}

