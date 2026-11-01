'use client';

import React, { useState, useEffect } from 'react';
import { Transaction, TransactionStatus } from '@/domain/types';
import { X, Edit3, AlertCircle, Save, ChevronDown, ChevronUp, UserCheck, Loader2 } from 'lucide-react';

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  currency?: string;
  onSuccess: (updated: Transaction) => void;
}

export function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  currency = '₱',
  onSuccess,
}: EditTransactionModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [fee, setFee] = useState<string>('');
  const [insertedAmount, setInsertedAmount] = useState<string>('');
  const [status, setStatus] = useState<TransactionStatus>('SUCCEEDED');
  const [customerName, setCustomerName] = useState<string>('');
  const [accountOrPhone, setAccountOrPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isPersonalDraw, setIsPersonalDraw] = useState<boolean>(false);
  const [oldBalance, setOldBalance] = useState<string>('');
  const [newBalance, setNewBalance] = useState<string>('');
  const [customWalletDeduction, setCustomWalletDeduction] = useState<string>('');
  const [customNetProfit, setCustomNetProfit] = useState<string>('');
  const [transactionTime, setTransactionTime] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transaction && isOpen) {
      setAmount(String(transaction.amount));
      setFee(String(transaction.fee));
      setInsertedAmount(String(transaction.insertedAmount));
      setStatus(transaction.status);
      setCustomerName(transaction.customerName || '');
      setAccountOrPhone(transaction.accountOrPhone || '');
      setNotes(transaction.notes || '');
      setIsPersonalDraw(Boolean(transaction.isPersonalDraw));
      setOldBalance(transaction.oldBalance !== null && transaction.oldBalance !== undefined ? String(transaction.oldBalance) : '');
      setNewBalance(transaction.newBalance !== null && transaction.newBalance !== undefined ? String(transaction.newBalance) : '');
      setCustomWalletDeduction(String(transaction.walletDeduction));
      setCustomNetProfit(String(transaction.netProfit));
      setTransactionTime(transaction.transactionTime || '');
      setError(null);
    }
  }, [transaction, isOpen]);

  if (!isOpen || !transaction) return null;

  // Live preview calculations
  const numAmount = Number(amount) || 0;
  const numFee = Number(fee) || 0;
  const numInserted = Number(insertedAmount) || 0;
  const numOldBal = oldBalance.trim() !== '' ? Number(oldBalance) : null;
  const numNewBal = newBalance.trim() !== '' ? Number(newBalance) : null;

  let computedWalletDeduction = 0;
  if (transaction.serviceType === 'PISO_WIFI') {
    computedWalletDeduction = 0;
  } else if (numOldBal !== null && numNewBal !== null) {
    computedWalletDeduction = Math.max(0, numOldBal - numNewBal);
  } else {
    computedWalletDeduction = numAmount;
  }

  // Net Profit: if personal draw, it's 0 (not a kiosk loss); else inserted - deduction
  const computedNetProfit = isPersonalDraw
    ? 0
    : transaction.serviceType === 'PISO_WIFI'
    ? numInserted
    : Math.round((numInserted - computedWalletDeduction) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        amount: numAmount,
        fee: numFee,
        insertedAmount: numInserted,
        status,
        customerName: customerName.trim() || null,
        accountOrPhone: accountOrPhone.trim() || null,
        notes: notes.trim() || null,
        isPersonalDraw,
      };

      if (numOldBal !== null) payload.oldBalance = numOldBal;
      if (numNewBal !== null) payload.newBalance = numNewBal;
      if (transactionTime.trim()) payload.transactionTime = transactionTime.trim();

      // Only pass overrides if user explicitly entered them in the advanced section
      if (showAdvanced) {
        if (customWalletDeduction.trim() !== '') {
          payload.walletDeduction = Number(customWalletDeduction);
        }
        if (customNetProfit.trim() !== '') {
          payload.netProfit = Number(customNetProfit);
        }
      }

      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update transaction');
      }

      const result = await res.json();
      onSuccess(result.transaction);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error updating transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white/95 backdrop-blur-xs">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8A0000]/10 text-[#8A0000]">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Edit & Balance Transaction</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Ref: {transaction.referenceNo || transaction.id}
              </p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="flex items-center space-x-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-800 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Personal Withdrawal / Owner Draw Flag */}
          <div className={`rounded-xl border p-3.5 transition-all ${
            isPersonalDraw 
              ? 'border-purple-300 bg-purple-50/90 shadow-2xs' 
              : 'border-slate-200 bg-slate-50/60'
          }`}>
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPersonalDraw}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsPersonalDraw(checked);
                  if (checked) {
                    setInsertedAmount('0');
                  }
                }}
                className="mt-0.5 h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-purple-950">
                    Mark as Personal Withdrawal / Owner Draw
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-purple-200 text-purple-800">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Owner Transfer
                  </span>
                </div>
                <p className="text-[10px] text-purple-700 leading-relaxed">
                  Direct wallet withdrawal performed outside the kiosk (e.g. online LPB app). Sets Cash Inserted to {currency}0.00 and excludes this from machine operating loss (Net Profit = {currency}0.00).
                </p>
              </div>
            </label>
          </div>

          {/* Financials Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Inserted Cash ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={insertedAmount}
                onChange={(e) => setInsertedAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
              />
              <span className="text-[9px] text-slate-400">Physical cash in hopper</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Amount ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
              />
              <span className="text-[9px] text-slate-400">Requested face value</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Transaction Fee ({currency})
              </label>
              <input
                type="number"
                step="0.01"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
              />
              <span className="text-[9px] text-slate-400">Convenience fee</span>
            </div>
          </div>

          {/* Calculated Profit Preview Card */}
          <div className={`flex items-center justify-between rounded-xl border p-3 ${
            isPersonalDraw
              ? 'border-purple-200 bg-purple-50 text-purple-900'
              : computedNetProfit >= 0
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
              : 'border-rose-200 bg-rose-50/70 text-rose-900'
          }`}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                {isPersonalDraw ? 'Owner Draw Accounting' : 'Calculated Net Profit'}
              </span>
              <div className="text-base font-extrabold">
                {isPersonalDraw
                  ? `${currency}0.00 (Owner Equity Draw)`
                  : computedNetProfit >= 0
                  ? `+${currency}${computedNetProfit.toFixed(2)}`
                  : `-${currency}${Math.abs(computedNetProfit).toFixed(2)}`}
              </div>
            </div>
            <div className="text-right text-[10px] opacity-80">
              Wallet Deduction: {currency}{computedWalletDeduction.toFixed(2)}
            </div>
          </div>

          {/* Status & Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TransactionStatus)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
              >
                <option value="SUCCEEDED">SUCCEEDED</option>
                <option value="FAILED">FAILED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone / Account Number
              </label>
              <input
                type="text"
                value={accountOrPhone}
                onChange={(e) => setAccountOrPhone(e.target.value)}
                placeholder="09..."
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
              />
            </div>
          </div>

          {/* Customer Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Customer Name / Recipient
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Owner Personal, Juan Dela Cruz"
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 shadow-2xs focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
            />
          </div>

          {/* Advanced Ledger Override Toggle */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <span>Advanced Ledger & Manual Balancing Overrides</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAdvanced && (
              <div className="p-4 bg-white space-y-3 border-t border-slate-200 animate-in fade-in duration-100">
                <p className="text-[10px] text-slate-500">
                  Override master wallet balances and exact ledger deductions to resolve discrepancies outside system automation.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Starting Wallet Balance ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={oldBalance}
                      onChange={(e) => setOldBalance(e.target.value)}
                      placeholder="e.g. 50000.00"
                      className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Ending Wallet Balance ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      placeholder="e.g. 45000.00"
                      className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Custom Wallet Deduction ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={customWalletDeduction}
                      onChange={(e) => setCustomWalletDeduction(e.target.value)}
                      placeholder={String(computedWalletDeduction)}
                      className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
                    />
                    <span className="text-[9px] text-slate-400">Manual deduction override</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Custom Net Profit ({currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={customNetProfit}
                      onChange={(e) => setCustomNetProfit(e.target.value)}
                      placeholder={String(computedNetProfit)}
                      className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono"
                    />
                    <span className="text-[9px] text-slate-400">Manual profit override</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Transaction Timestamp (ISO / Date)
                  </label>
                  <input
                    type="text"
                    value={transactionTime}
                    onChange={(e) => setTransactionTime(e.target.value)}
                    placeholder="YYYY-MM-DDTHH:mm:ss.sssZ"
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs font-mono text-slate-700"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Audit Notes & Reason for Adjustment
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Owner personal withdrawal via LPB app, balanced manually..."
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
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 shrink-0" />
                  <span>Save & Balance</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
