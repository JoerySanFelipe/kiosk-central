'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Vault,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  Plus,
  Trash2,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { CashHarvest, HarvestAdjustmentItem, AdjustmentAction, AdjustmentTarget } from '@/domain/types';
import { ImageDropzone } from '../common/ImageDropzone';

interface RecordHarvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  machineId: string;
  machineName: string;
  expectedCash: number;
  currency?: string;
  harvest?: CashHarvest | null; // When provided, acts as Edit Mode
  onSuccess: () => void;
}

export function RecordHarvestModal({
  isOpen,
  onClose,
  machineId,
  machineName,
  expectedCash,
  currency = '₱',
  harvest = null,
  onSuccess,
}: RecordHarvestModalProps) {
  const isEditMode = Boolean(harvest);

  const [baseAmount, setBaseAmount] = useState<string>('');
  const [adjustments, setAdjustments] = useState<HarvestAdjustmentItem[]>([]);
  const [collectedBy, setCollectedBy] = useState<string>('');
  const [reportingDate, setReportingDate] = useState<string>('');
  const [harvestedAt, setHarvestedAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [slipImageUrl, setSlipImageUrl] = useState<string>('');
  const [computedExpectedCash, setComputedExpectedCash] = useState<number>(expectedCash);
  const [uncollectedCount, setUncollectedCount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const formatIdentifier = (dateStr: string) => {
    try {
      if (!dateStr) return 'Harvest-Record';
      let d: Date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
        const [year, month, day] = dateStr.trim().split('-').map(Number);
        d = new Date(year, month - 1, day);
      } else {
        d = new Date(dateStr);
      }
      const formatted = d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      return `Harvest-${formatted}`;
    } catch {
      return `Harvest-${dateStr}`;
    }
  };

  // Initialize or reset form state when opened or when harvest changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (harvest) {
        // Edit Mode Pre-population
        const d = new Date(harvest.harvestedAt);
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);

        setHarvestedAt(localIso);
        setReportingDate(harvest.reportingDate || harvest.harvestedAt.slice(0, 10));
        setBaseAmount(String(harvest.baseAmount ?? harvest.actualAmount));
        setCollectedBy(harvest.collectedBy);
        setNotes(harvest.notes || '');
        setSlipImageUrl(harvest.slipImageUrl || '');
        setComputedExpectedCash(harvest.rawExpectedAmount ?? harvest.expectedAmount);

        // Prepopulate adjustments
        if (harvest.adjustments && harvest.adjustments.length > 0) {
          setAdjustments(
            harvest.adjustments.map((a) => ({
              id: a.id || `adj_${Math.random().toString(36).substring(2, 7)}`,
              type: a.type,
              target: a.target || 'EXPECTED',
              amount: a.amount,
              description: a.description || '',
            }))
          );
        } else if (
          harvest.adjustmentType &&
          harvest.adjustmentType !== 'NONE' &&
          (harvest.adjustmentAmount || 0) > 0
        ) {
          setAdjustments([
            {
              id: `adj_${Date.now()}`,
              type: harvest.adjustmentType === 'ADD' ? 'ADD' : 'DEDUCT',
              target: 'EXPECTED',
              amount: harvest.adjustmentAmount || 0,
              description: harvest.adjustmentReason || '',
            },
          ]);
        } else {
          setAdjustments([]);
        }
      } else {
        // Create Mode Blank Form
        const now = new Date();
        const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setHarvestedAt(localIso);
        setReportingDate(localIso.slice(0, 10));
        setBaseAmount('');
        setAdjustments([]);
        setCollectedBy('');
        setNotes('');
        setSlipImageUrl('');
        setComputedExpectedCash(expectedCash);
      }
    }
  }, [isOpen, harvest, expectedCash]);

  // Recalculate expected cash dynamically if the cut-off datetime is adjusted
  useEffect(() => {
    if (!isOpen || !harvestedAt) return;

    let isMounted = true;
    const fetchCutoffCash = async () => {
      try {
        const isoTime = new Date(harvestedAt).toISOString();
        const excludeParam = harvest ? `&excludeId=${harvest.id}` : '';
        const res = await fetch(
          `/api/harvests?machineId=${machineId}&preview=true&upToTime=${isoTime}${excludeParam}`
        );
        if (res.ok && isMounted) {
          const data = await res.json();
          setComputedExpectedCash(data.expectedCash);
          setUncollectedCount(data.uncollectedCount);
        }
      } catch (e) {
        console.error('Failed to preview cut-off cash', e);
      }
    };

    fetchCutoffCash();
    return () => {
      isMounted = false;
    };
  }, [isOpen, machineId, harvestedAt, harvest]);

  if (!isOpen) return null;

  // Add a new adjustment row (defaults to EXPECTED target)
  const addAdjustmentRow = (type: AdjustmentAction, target: AdjustmentTarget = 'EXPECTED') => {
    setAdjustments((prev) => [
      ...prev,
      {
        id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        target,
        amount: 0,
        description: '',
      },
    ]);
  };

  // Update specific adjustment row
  const updateAdjustmentRow = (
    id: string,
    field: 'type' | 'target' | 'amount' | 'description',
    value: any
  ) => {
    setAdjustments((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Remove adjustment row
  const removeAdjustmentRow = (id: string) => {
    setAdjustments((prev) => prev.filter((item) => item.id !== id));
  };

  // Live Math calculations
  const parsedBase = baseAmount.trim() === '' ? null : Number(baseAmount);

  let expectedDelta = 0;
  let physicalDelta = 0;
  let totalAdded = 0;
  let totalDeducted = 0;

  adjustments.forEach((a) => {
    const amt = Number(a.amount) || 0;
    const target = a.target || 'EXPECTED';
    if (a.type === 'ADD') {
      totalAdded += amt;
      if (target === 'EXPECTED') expectedDelta += amt;
      else physicalDelta += amt;
    } else {
      totalDeducted += amt;
      if (target === 'EXPECTED') expectedDelta -= amt;
      else physicalDelta -= amt;
    }
  });

  const adjustedExpectedCash = Math.max(0, Math.round((computedExpectedCash + expectedDelta) * 100) / 100);

  let netActualAmount: number | null = null;
  if (parsedBase !== null && !isNaN(parsedBase)) {
    netActualAmount = Math.max(0, Math.round((parsedBase + physicalDelta) * 100) / 100);
  }

  const variance =
    netActualAmount !== null
      ? Math.round((netActualAmount - adjustedExpectedCash) * 100) / 100
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedBase === null || isNaN(parsedBase) || parsedBase < 0) {
      setError('Please enter a valid physical cash counted amount.');
      return;
    }

    // Validate adjustments
    for (let i = 0; i < adjustments.length; i++) {
      const a = adjustments[i];
      if (Number(a.amount) < 0 || isNaN(Number(a.amount))) {
        setError(`Adjustment line #${i + 1} has an invalid amount.`);
        return;
      }
      if (Number(a.amount) > 0 && !a.description.trim()) {
        setError(
          `Please provide a reason / description for adjustment line #${i + 1} (${
            a.type === 'ADD' ? '+ Add' : '- Deduct'
          } ${currency}${Number(a.amount).toFixed(2)}).`
        );
        return;
      }
    }

    if (!collectedBy.trim()) {
      setError('Collector name is required.');
      return;
    }

    if (netActualAmount === null) {
      setError('Invalid final net harvested amount.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      machineId,
      baseAmount: parsedBase,
      adjustments: adjustments
        .filter((a) => Number(a.amount) > 0 || a.description.trim())
        .map((a) => ({
          id: a.id,
          type: a.type,
          target: a.target || 'EXPECTED',
          amount: Math.round(Number(a.amount) * 100) / 100,
          description: a.description.trim(),
        })),
      actualAmount: netActualAmount,
      collectedBy: collectedBy.trim(),
      harvestedAt: harvestedAt ? new Date(harvestedAt).toISOString() : new Date().toISOString(),
      reportingDate: reportingDate || null,
      reportName: formatIdentifier(reportingDate || harvestedAt),
      slipImageUrl: slipImageUrl.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      const url = isEditMode ? `/api/harvests/${harvest!.id}` : '/api/harvests';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditMode ? { ...payload, id: harvest!.id } : payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save cash harvest');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/80 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8A0000]/10 text-[#8A0000]">
              <Vault className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isEditMode ? 'Edit Cash Harvest Record' : 'Record Cash Harvest'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">Terminal: {machineName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {error && (
            <div className="flex items-center space-x-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Expected Cash in Machine Box (System Records) Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Expected Cash in Machine Box (System Records)
              </span>
              {uncollectedCount > 0 && (
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {uncollectedCount} transactions
                </span>
              )}
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {currency}
              {computedExpectedCash.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Accumulated physical insertions up to selected collection date & time
            </p>
          </div>

          {/* 2. Reporting Date & Collector Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reporting Date <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="date"
                  required
                  value={reportingDate}
                  onChange={(e) => setReportingDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-semibold text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none cursor-pointer"
                />
              </div>
              <div className="mt-1 flex items-center space-x-1.5">
                <span className="text-[10px] text-slate-400">Record ID:</span>
                <span className="inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200 font-mono">
                  {formatIdentifier(reportingDate || harvestedAt)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Collector / Staff Name <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Staff Name"
                  value={collectedBy}
                  onChange={(e) => setCollectedBy(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder-slate-300 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Harvest Cut-Off Date & Time */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Harvest Cut-off Date & Time
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="datetime-local"
                required
                value={harvestedAt}
                onChange={(e) => setHarvestedAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Transactions up to this exact cutoff time are cleared and accounted for in this harvest statement.
            </p>
          </div>

          {/* 3. Physical Cash Counted (₱) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Physical Cash Counted ({currency}) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                {currency}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-8 pr-4 text-sm font-bold text-slate-900 placeholder-slate-300 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Actual physical bills and coins counted from cash box and coin hopper.
            </p>
          </div>

          {/* 4. Adjustments (Add / Deduct) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                <span>Adjustments (Add / Deduct)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => addAdjustmentRow('ADD', 'EXPECTED')}
                  className="inline-flex items-center space-x-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Cash</span>
                </button>
                <button
                  type="button"
                  onClick={() => addAdjustmentRow('DEDUCT', 'EXPECTED')}
                  className="inline-flex items-center space-x-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>Deduct Item</span>
                </button>
              </div>
            </div>

            {/* Adjustments List */}
            {adjustments.length === 0 ? (
              <div className="text-center py-4 px-3 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400">
                <p className="text-xs">No adjustments added for this harvest.</p>
                <p className="text-[10px] mt-0.5 text-slate-400">
                  Click &quot;+ Add Cash&quot; or &quot;+ Deduct Item&quot; for aberya, coin refunds, or expenses. Defaults to adjusting Vault Expectation.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {adjustments.map((adj) => {
                  const isAdd = adj.type === 'ADD';
                  const isExpected = (adj.target || 'EXPECTED') === 'EXPECTED';

                  return (
                    <div
                      key={adj.id}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs animate-in fade-in duration-100"
                    >
                      {/* Target Selector (Vault Expectation vs Physical Cash) */}
                      <button
                        type="button"
                        onClick={() =>
                          updateAdjustmentRow(adj.id, 'target', isExpected ? 'PHYSICAL' : 'EXPECTED')
                        }
                        className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          isExpected
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                        title="Click to toggle whether adjustment applies to Expected Vault Cash or Physical Counted Cash"
                      >
                        {isExpected ? 'Vault Expectation' : 'Physical Cash'}
                      </button>

                      {/* Type Toggle Pill */}
                      <button
                        type="button"
                        onClick={() =>
                          updateAdjustmentRow(adj.id, 'type', isAdd ? 'DEDUCT' : 'ADD')
                        }
                        className={`shrink-0 inline-flex items-center justify-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          isAdd
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                        title="Click to toggle between Add and Deduct"
                      >
                        {isAdd ? (
                          <>
                            <ArrowUpRight className="h-3 w-3" />
                            <span>+ ADD</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="h-3 w-3" />
                            <span>- DEDUCT</span>
                          </>
                        )}
                      </button>

                      {/* Amount Input */}
                      <div className="relative w-full sm:w-28 shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          {currency}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={adj.amount === 0 ? '' : adj.amount}
                          onChange={(e) =>
                            updateAdjustmentRow(
                              adj.id,
                              'amount',
                              e.target.value === '' ? 0 : Number(e.target.value)
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-6 pr-2 text-xs font-bold text-slate-900 focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
                        />
                      </div>

                      {/* Description Input */}
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder={
                            isAdd
                              ? 'Reason (e.g. Returned change fund, emergency coin top-up)'
                              : 'Reason (e.g. Jammed coin refund, fare, repair allowance)'
                          }
                          value={adj.description}
                          onChange={(e) =>
                            updateAdjustmentRow(adj.id, 'description', e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-medium text-slate-800 placeholder-slate-300 focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeAdjustmentRow(adj.id)}
                        className="p-1.5 rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer shrink-0 self-end sm:self-center"
                        title="Delete adjustment row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}

                {/* Adjustments Summary Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-semibold text-slate-600 px-1">
                  <div className="flex items-center space-x-3">
                    {totalAdded > 0 && (
                      <span className="text-emerald-700">
                        Total Added: <span className="font-bold">+{currency}{totalAdded.toFixed(2)}</span>
                      </span>
                    )}
                    {totalDeducted > 0 && (
                      <span className="text-rose-700">
                        Total Deducted: <span className="font-bold">-{currency}{totalDeducted.toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Target: <span className="font-semibold text-slate-700">Vault Expectation (Default)</span> or <span className="font-semibold text-indigo-700">Physical Cash</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 5. Physical Counted (Base) & Net Cash Calculation Summary */}
          {parsedBase !== null && netActualAmount !== null && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
              {/* Expected Vault Cash Row */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Expected Cash in Machine Box:</span>
                <div className="text-right">
                  <span className="font-bold text-slate-800">
                    {currency}{adjustedExpectedCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  {expectedDelta !== 0 && (
                    <span className="text-[10px] text-slate-400 block">
                      (Raw System: {currency}{computedExpectedCash.toFixed(2)} {expectedDelta > 0 ? '+' : ''}{currency}{expectedDelta.toFixed(2)})
                    </span>
                  )}
                </div>
              </div>

              {/* Physical Counted Base Row */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Physical Counted (Base):</span>
                <div className="text-right">
                  <span className="font-bold text-slate-800">
                    {currency}{parsedBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  {physicalDelta !== 0 && (
                    <span className="text-[10px] text-slate-400 block">
                      (Adjusted Physical: {currency}{netActualAmount.toFixed(2)})
                    </span>
                  )}
                </div>
              </div>

              {/* Adjustments Breakdown */}
              {adjustments.length > 0 && (
                <div className="space-y-1.5 pb-2 border-b border-slate-100 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Adjustment Breakdown ({adjustments.length} item{adjustments.length > 1 ? 's' : ''}):
                  </span>
                  {adjustments.map((a, i) => (
                    <div key={a.id || i} className="flex items-center justify-between text-[11px] pl-1">
                      <div className="flex items-center space-x-1.5 truncate max-w-[280px]">
                        <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                          (a.target || 'EXPECTED') === 'EXPECTED'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {(a.target || 'EXPECTED') === 'EXPECTED' ? 'Vault' : 'Cash'}
                        </span>
                        <span className="text-slate-600 truncate">
                          {a.description || '(No description)'}
                        </span>
                      </div>
                      <span
                        className={`font-bold shrink-0 ml-2 ${
                          a.type === 'ADD' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {a.type === 'ADD' ? '+' : '-'}
                        {currency}
                        {(Number(a.amount) || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Final Net Harvested Cash */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Final Net Harvested Cash:
                </span>
                <span
                  className={`text-xl font-black ${
                    variance === null || variance === 0
                      ? 'text-emerald-600'
                      : variance < 0
                      ? 'text-rose-600'
                      : 'text-amber-600'
                  }`}
                >
                  {currency}
                  {netActualAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Variance Indicator */}
              {variance !== null && (
                <div
                  className={`rounded-xl p-3 flex items-start space-x-2.5 text-xs border ${
                    variance === 0
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : variance < 0
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  {variance === 0 ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertTriangle
                      className={`h-4 w-4 shrink-0 mt-0.5 ${
                        variance < 0 ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-bold">
                      {variance === 0
                        ? 'Balanced with System (₱0.00)'
                        : variance < 0
                        ? `Shortage: -${currency}${Math.abs(variance).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}`
                        : `Overage: +${currency}${variance.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}`}
                    </div>
                    <div className="text-[10px] opacity-75 mt-0.5">
                      {variance === 0
                        ? 'Net cash collected strictly matches adjusted vault expectation.'
                        : variance < 0
                        ? 'Net cash collected is less than adjusted vault expectation.'
                        : 'Net cash collected exceeds adjusted vault expectation.'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Collection Proof / Breakdown Slip Photo Attachment */}
          <ImageDropzone
            value={slipImageUrl}
            onChange={setSlipImageUrl}
            onClear={() => setSlipImageUrl('')}
            label="Collection Proof / Breakdown Slip Photo (Optional)"
            helperText="Click, drag & drop, or paste (Ctrl+V) Coins Out tally slip"
          />

          {/* 7. General Notes (Optional) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              General Notes (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <textarea
                rows={2}
                placeholder="e.g. Cleaned bill acceptor, heavy coin weight..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder-slate-300 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none resize-none"
              />
            </div>
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
                  <span>Saving Harvest...</span>
                </>
              ) : isEditMode ? (
                <span>Update & Save Changes</span>
              ) : (
                <span>Confirm & Save Harvest</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
