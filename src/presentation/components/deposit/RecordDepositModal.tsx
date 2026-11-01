'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Banknote,
  Save,
  CheckSquare,
  Square,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { CashHarvest, DepositType, DepositedCollection } from '@/domain/types';
import { ImageDropzone } from '../common/ImageDropzone';

interface RecordDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  onSuccess: (newDeposit: DepositedCollection) => void;
}

export function RecordDepositModal({
  isOpen,
  onClose,
  currency = '₱',
  onSuccess,
}: RecordDepositModalProps) {
  const [depositType, setDepositType] = useState<DepositType>('BANK_DEPOSIT');
  const [depositDate, setDepositDate] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [depositedBy, setDepositedBy] = useState<string>('');
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Pending harvests state
  const [pendingHarvests, setPendingHarvests] = useState<CashHarvest[]>([]);
  const [selectedHarvestIds, setSelectedHarvestIds] = useState<string[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState<boolean>(true);

  // Financial values
  const [actualAmount, setActualAmount] = useState<string>('');

  // Slip upload state
  const [slipImageUrl, setSlipImageUrl] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize date to current local datetime
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setDepositDate(now.toISOString().slice(0, 16));
      setReferenceNo('');
      setDepositedBy('');
      setReceivedBy('');
      setNotes('');
      setActualAmount('');
      setSlipImageUrl('');
      setFormError(null);

      // Fetch pending harvests
      setIsLoadingPending(true);
      fetch('/api/deposits?pending=true')
        .then((res) => res.json())
        .then((data) => {
          const list: CashHarvest[] = data.pendingHarvests || [];
          setPendingHarvests(list);
          // By default select all pending harvests
          const allIds = list.map((h) => h.id);
          setSelectedHarvestIds(allIds);
          const totalSum = list.reduce((sum, h) => sum + Number(h.actualAmount || 0), 0);
          setActualAmount(totalSum > 0 ? String(totalSum) : '');
        })
        .catch((err) => {
          console.error('Failed to load pending harvests', err);
        })
        .finally(() => {
          setIsLoadingPending(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle single harvest selection
  const toggleHarvest = (id: string) => {
    let nextIds: string[];
    if (selectedHarvestIds.includes(id)) {
      nextIds = selectedHarvestIds.filter((item) => item !== id);
    } else {
      nextIds = [...selectedHarvestIds, id];
    }
    setSelectedHarvestIds(nextIds);

    // Recompute sum
    const sum = pendingHarvests
      .filter((h) => nextIds.includes(h.id))
      .reduce((acc, h) => acc + Number(h.actualAmount || 0), 0);
    setActualAmount(sum > 0 ? String(sum) : '');
  };

  // Toggle all
  const toggleSelectAll = () => {
    if (selectedHarvestIds.length === pendingHarvests.length) {
      setSelectedHarvestIds([]);
      setActualAmount('');
    } else {
      const allIds = pendingHarvests.map((h) => h.id);
      setSelectedHarvestIds(allIds);
      const sum = pendingHarvests.reduce((acc, h) => acc + Number(h.actualAmount || 0), 0);
      setActualAmount(sum > 0 ? String(sum) : '');
    }
  };

  // Expected amount from selected harvests
  const expectedAmount = pendingHarvests
    .filter((h) => selectedHarvestIds.includes(h.id))
    .reduce((acc, h) => acc + Number(h.actualAmount || 0), 0);

  const numActual = Number(actualAmount) || 0;
  const variance = Math.round((numActual - expectedAmount) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (numActual <= 0) {
      setFormError('Please enter a valid deposit amount greater than 0.');
      return;
    }

    if (!depositedBy.trim()) {
      setFormError('Please enter the name of the staff who performed the deposit / handover.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositDate: depositDate ? new Date(depositDate).toISOString() : new Date().toISOString(),
          depositType,
          referenceNo: referenceNo.trim() || undefined,
          harvestIds: selectedHarvestIds,
          actualAmount: numActual,
          depositedBy: depositedBy.trim(),
          receivedBy: receivedBy.trim() || undefined,
          slipImageUrl: slipImageUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record deposit');
      }

      const result = await res.json();
      onSuccess(result.deposit);
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error recording deposit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/90">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8A0000]/10 text-[#8A0000]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Record Deposited Collection</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {formError && (
            <div className="flex items-center space-x-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Deposit Type Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Deposit Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDepositType('BANK_DEPOSIT')}
                className={`flex items-center justify-center space-x-2 rounded-xl border py-2.5 px-3 transition-all cursor-pointer ${
                  depositType === 'BANK_DEPOSIT'
                    ? 'border-[#8A0000] bg-rose-50/70 text-[#8A0000] font-bold ring-1 ring-[#8A0000]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold'
                }`}
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="text-xs">Bank Deposit</span>
              </button>

              <button
                type="button"
                onClick={() => setDepositType('CASH_HANDOVER')}
                className={`flex items-center justify-center space-x-2 rounded-xl border py-2.5 px-3 transition-all cursor-pointer ${
                  depositType === 'CASH_HANDOVER'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 font-bold ring-1 ring-emerald-600'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold'
                }`}
              >
                <Banknote className="h-4 w-4 shrink-0" />
                <span className="text-xs">Cash Handover</span>
              </button>
            </div>
          </div>

          {/* 2. Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Deposit Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Reference / Slip Number
              </label>
              <input
                type="text"
                placeholder="e.g. Validation Ref #, Transfer ID"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
              />
            </div>
          </div>

          {/* 3. Pending Harvests Checklist Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Select Harvest Collections to Deposit ({selectedHarvestIds.length} of {pendingHarvests.length})
              </label>
              {pendingHarvests.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[11px] font-semibold text-[#8A0000] hover:underline cursor-pointer"
                >
                  {selectedHarvestIds.length === pendingHarvests.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 max-h-48 overflow-y-auto space-y-1.5">
              {isLoadingPending ? (
                <p className="text-center py-4 text-slate-400 text-xs">Loading un-deposited collections...</p>
              ) : pendingHarvests.length === 0 ? (
                <p className="text-center py-4 text-slate-400 text-xs">
                  No pending cash harvests found. All collections are already deposited.
                </p>
              ) : (
                pendingHarvests.map((h) => {
                  const isChecked = selectedHarvestIds.includes(h.id);
                  return (
                    <div
                      key={h.id}
                      onClick={() => toggleHarvest(h.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isChecked
                          ? 'border-[#8A0000]/40 bg-white shadow-2xs'
                          : 'border-slate-200 bg-white/70 hover:bg-white opacity-80'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-[#8A0000]" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            {h.reportName || `Harvest-${h.harvestedAt.slice(0, 10)}`}
                            <span className="ml-1.5 font-normal text-slate-500">({h.machineName || 'Vendo'})</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Cutoff: {formatDate(h.harvestedAt)} • Collector: {h.collectedBy}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-slate-900 block text-xs">
                          {currency}{h.actualAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        {h.adjustmentType && h.adjustmentType !== 'NONE' && (h.adjustmentAmount || 0) > 0 && (
                          <span className="text-[9px] text-slate-500 block">
                            Adj: {h.adjustmentType === 'ADD' ? '+' : '-'}{currency}{(h.adjustmentAmount || 0).toFixed(2)}
                          </span>
                        )}
                        {h.variance !== 0 && (
                          <span className="text-[9px] text-amber-600 block">
                            Var: {h.variance > 0 ? '+' : ''}{currency}{h.variance.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. Actual Amount & Variance Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Actual Deposited / Handed Amount ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
              />
            </div>

            {/* Live Variance Indicator */}
            <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
              variance === 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : variance < 0
                ? 'border-rose-200 bg-rose-50 text-rose-900'
                : 'border-blue-200 bg-blue-50 text-blue-900'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                  Deposit Variance
                </span>
                <span className="font-bold text-xs">
                  {variance === 0
                    ? 'Balanced (100% Matched)'
                    : variance < 0
                    ? `-${currency}${Math.abs(variance).toFixed(2)} (Shortage)`
                    : `+${currency}${variance.toFixed(2)} (Overage)`}
                </span>
              </div>
              <span className="text-[10px] opacity-75">
                Expected: {currency}{expectedAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* 5. Deposit Slip Image Upload */}
          <ImageDropzone
            value={slipImageUrl}
            onChange={setSlipImageUrl}
            onClear={() => setSlipImageUrl('')}
            label="Deposit Slip / Proof Attachment"
            helperText="Click, drag & drop, or paste (Ctrl+V) deposit slip photo"
          />

          {/* 6. Deposited By & Received By */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Deposited By (Staff Name)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Maria Santos"
                value={depositedBy}
                onChange={(e) => setDepositedBy(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirmed / Received By (Owner)
              </label>
              <input
                type="text"
                placeholder="e.g. Owner"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
              />
            </div>
          </div>

          {/* 7. Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Audit Notes & Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 3-day consolidated harvest from Weekend collections, short ₱50 coins..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 rounded-xl bg-[#8A0000] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#730000] active:scale-95 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>Recording Deposit...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Record Deposit</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

