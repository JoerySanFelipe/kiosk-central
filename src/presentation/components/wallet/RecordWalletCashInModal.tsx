'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Building2,
  Wallet,
  Banknote,
  DollarSign,
  Calendar,
  Hash,
  FileText,
  Save,
  AlertCircle,
  Loader2,
  RefreshCw,
  Check,
} from 'lucide-react';
import { DepositedCollection } from '@/domain/types';
import { ImageDropzone } from '../common/ImageDropzone';

interface RecordWalletCashInModalProps {
  isOpen: boolean;
  onClose: () => void;
  unreplenishedDeposits: DepositedCollection[];
  isLoadingDeposits: boolean;
  onSuccess: () => void;
  initialSource?: string;
}

type FundingMethod = 'QR PH' | 'Metrobank' | 'Cash-in Form' | 'DEALER_DIRECT' | 'OTHER';

export function RecordWalletCashInModal({
  isOpen,
  onClose,
  unreplenishedDeposits,
  isLoadingDeposits,
  onSuccess,
  initialSource = 'QR PH',
}: RecordWalletCashInModalProps) {
  const getNowLocalDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [source, setSource] = useState<FundingMethod>('QR PH');
  const [amount, setAmount] = useState('');
  const [replenishedAt, setReplenishedAt] = useState<string>(getNowLocalDateTime);
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptImageUrl, setReceiptImageUrl] = useState('');
  const [selectedDepositIds, setSelectedDepositIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setSource(
        initialSource === 'Metrobank' || initialSource === 'Cash-in Form'
          ? initialSource
          : 'QR PH'
      );
      setAmount('');
      setReplenishedAt(getNowLocalDateTime());
      setReferenceNo('');
      setNotes('');
      setReceiptImageUrl('');
      setSelectedDepositIds([]);
      setFormError(null);
    }
  }, [isOpen, initialSource]);

  if (!isOpen) return null;

  const toggleDepositSelection = (deposit: DepositedCollection) => {
    const exists = selectedDepositIds.includes(deposit.id);
    const next = exists
      ? selectedDepositIds.filter((id) => id !== deposit.id)
      : [...selectedDepositIds, deposit.id];

    setSelectedDepositIds(next);

    // Auto calculate amount from selected deposits
    if (next.length > 0) {
      const selected = unreplenishedDeposits.filter((d) => next.includes(d.id));
      const sum = selected.reduce((acc, d) => acc + d.actualAmount, 0);
      setAmount(sum.toFixed(2));

      // Auto populate reference no if empty
      const refs = selected.map((d) => d.referenceNo).filter(Boolean);
      if (refs.length > 0 && !referenceNo) {
        setReferenceNo(refs.join(', '));
      }

      // Auto suggest source
      if (selected.every((d) => d.depositType === 'BANK_DEPOSIT')) {
        setSource('Metrobank');
      } else if (selected.every((d) => d.depositType === 'CASH_HANDOVER')) {
        setSource('DEALER_DIRECT');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid cash-in amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch('/api/wallet-replenishments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          source,
          referenceNo: referenceNo.trim() || undefined,
          receiptImageUrl: receiptImageUrl.trim() || undefined,
          replenishedAt: replenishedAt
            ? new Date(replenishedAt).toISOString()
            : new Date().toISOString(),
          notes: notes.trim() || undefined,
          linkedDepositIds:
            selectedDepositIds.length > 0 ? selectedDepositIds : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to record wallet cash-in');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error recording cash-in');
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-[#8A0000] border border-red-100">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Record Wallet Cash-In
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Method Selector Tabs - Styled exactly as requested */}
        <div className="border-b border-slate-200 bg-white px-6">
          <div className="flex items-center space-x-6 overflow-x-auto no-scrollbar">
            {/* QR PH Tab */}
            <button
              type="button"
              onClick={() => setSource('QR PH')}
              className={`flex items-center space-x-2 py-3.5 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                source === 'QR PH'
                  ? 'text-rose-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode
                className={`h-4 w-4 ${
                  source === 'QR PH' ? 'text-rose-600' : 'text-slate-400'
                }`}
              />
              <span>QR PH</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 tracking-wide">
                Instant
              </span>
              {source === 'QR PH' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-600 rounded-full" />
              )}
            </button>

            {/* Metrobank Tab */}
            <button
              type="button"
              onClick={() => setSource('Metrobank')}
              className={`flex items-center space-x-2 py-3.5 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                source === 'Metrobank'
                  ? 'text-blue-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2
                className={`h-4 w-4 ${
                  source === 'Metrobank' ? 'text-blue-600' : 'text-slate-400'
                }`}
              />
              <span>Metrobank</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 tracking-wide">
                Instant
              </span>
              {source === 'Metrobank' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>

            {/* Cash-in Form Tab */}
            <button
              type="button"
              onClick={() => setSource('Cash-in Form')}
              className={`flex items-center space-x-2 py-3.5 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                source === 'Cash-in Form'
                  ? 'text-amber-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet
                className={`h-4 w-4 ${
                  source === 'Cash-in Form' ? 'text-amber-600' : 'text-slate-400'
                }`}
              />
              <span>Cash-in Form</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 tracking-wide">
                Manual Approval
              </span>
              {source === 'Cash-in Form' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 rounded-full" />
              )}
            </button>

            {/* Direct / Other */}
            <button
              type="button"
              onClick={() => setSource('DEALER_DIRECT')}
              className={`flex items-center space-x-2 py-3.5 text-xs font-bold transition-all relative whitespace-nowrap cursor-pointer ${
                source === 'DEALER_DIRECT' || source === 'OTHER'
                  ? 'text-slate-900'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Banknote
                className={`h-4 w-4 ${
                  source === 'DEALER_DIRECT' || source === 'OTHER'
                    ? 'text-slate-800'
                    : 'text-slate-400'
                }`}
              />
              <span>Direct / Other</span>
              {source === 'DEALER_DIRECT' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {formError && (
            <div className="flex items-center space-x-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Smart Linking: Source from Deposited Collections */}
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-emerald-700 shrink-0" />
                <span className="text-xs font-bold text-emerald-950">
                  Fund from Deposited Collections
                </span>
              </div>
              {unreplenishedDeposits.length > 0 ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 shrink-0">
                  {unreplenishedDeposits.length} Pending
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">None pending</span>
              )}
            </div>

            {isLoadingDeposits ? (
              <div className="py-3 text-center text-xs text-slate-400 flex items-center justify-center space-x-2">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Loading available deposits...</span>
              </div>
            ) : unreplenishedDeposits.length === 0 ? (
              <div className="rounded-lg bg-white/60 p-2.5 text-center text-[11px] text-slate-400 italic">
                All deposited collections are currently replenished. You can enter a custom reload amount below.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {unreplenishedDeposits.map((dep) => {
                  const isSelected = selectedDepositIds.includes(dep.id);
                  return (
                    <div
                      key={dep.id}
                      onClick={() => toggleDepositSelection(dep)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-100/70 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 overflow-hidden pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                        <div className="truncate">
                          <div className="font-bold text-slate-900 truncate text-xs">
                            {dep.referenceNo || 'No Reference No.'}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {formatDate(dep.depositDate)} • {dep.depositedBy}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-extrabold text-emerald-700 text-xs">
                        ₱{dep.actualAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Amount & Date Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reload Amount (₱) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-8 pr-3.5 text-sm font-bold text-slate-900 focus:border-[#8A0000] focus:bg-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Cash-In Date & Time *
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={replenishedAt}
                  onChange={(e) => setReplenishedAt(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-[#8A0000] focus:bg-white focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Reference & Custom Method (if Direct/Other) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reference / Trace Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 206164 or Trace ID"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-[#8A0000] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {source === 'DEALER_DIRECT' || source === 'OTHER' ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Specific Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as FundingMethod)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-[#8A0000] focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="DEALER_DIRECT">Direct Cash Handover</option>
                  <option value="OTHER">Other Bank / Transfer</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Selected Channel
                </label>
                <div className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-2.5 text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>{source}</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    {source === 'Cash-in Form' ? 'Requires Approval' : 'Instant Crediting'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Universal ImageDropzone with Drag-and-Drop & Ctrl+V Paste */}
          <div>
            <ImageDropzone
              value={receiptImageUrl}
              onChange={setReceiptImageUrl}
              onClear={() => setReceiptImageUrl('')}
              label="Receipt / Proof Photo (Optional)"
              helperText="Click, drag & drop, or paste (Ctrl+V) receipt photo"
            />
          </div>

          {/* Notes / Remarks */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Notes / Remarks
            </label>
            <input
              type="text"
              placeholder="Optional remarks (e.g. fee notes, branch details)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-[#8A0000] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !amount}
            className="flex items-center space-x-2 rounded-xl bg-[#8A0000] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#730000] active:scale-98 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Recording Cash-In...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Cash-In Record</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

