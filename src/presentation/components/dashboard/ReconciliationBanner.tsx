'use client';

import React from 'react';
import { Vault, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { FinancialSummary } from '@/domain/types';

interface ReconciliationBannerProps {
  summary: FinancialSummary;
  currency?: string;
}

export function ReconciliationBanner({ summary, currency = '₱' }: ReconciliationBannerProps) {
  const cashToCollect = summary.reconciliation.physicalCashToCollect;
  const walletDeduction = summary.reconciliation.walletReplenishmentNeeded;
  const netEarnings = summary.totalNetProfit;
  const estimatedBalance = summary.reconciliation.currentEstimatedWalletBalance;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        {/* Left: Section Header */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#8A0000]">
            <Vault className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Cash & Master Wallet Reconciliation
            </h3>
            <p className="text-xs text-slate-500">
              Physical cash collected in terminal vs LPB Master Wallet deductions
            </p>
          </div>
        </div>

        {/* Right: Reconciliation status badge */}
        <div className="flex items-center space-x-2">
          {estimatedBalance !== undefined ? (
            <div className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              <span className="font-medium">Master Wallet Last Balance:</span>
              <span className="font-bold text-slate-900">
                {currency}{estimatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* 3 Metric Pillars */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Pillar 1: Cash to Collect */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Physical Cash in Machine</span>
            <span className="text-[10px] font-semibold text-slate-400">Total In</span>
          </div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {currency}{cashToCollect.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Total cash to collect from hopper and bill acceptor
          </p>
        </div>

        {/* Pillar 2: Wallet Replenishment */}
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5">
          <div className="flex items-center justify-between text-xs text-amber-800">
            <span className="font-semibold">Wallet Replenishment</span>
            <ArrowRightLeft className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="mt-1 text-lg font-bold text-amber-900">
            {currency}{walletDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-0.5 text-[11px] text-amber-700">
            {summary.reconciliation.personalDrawsDeduction && summary.reconciliation.personalDrawsDeduction > 0
              ? `Kiosk reload: ${currency}${(summary.reconciliation.kioskReplenishmentNeeded ?? (walletDeduction - summary.reconciliation.personalDrawsDeduction)).toLocaleString('en-US', { minimumFractionDigits: 2 })} (+${currency}${summary.reconciliation.personalDrawsDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })} owner draw)`
              : 'Amount required to reload into master wallet'}
          </p>
        </div>

        {/* Pillar 3: Net Profit */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
          <div className="flex items-center justify-between text-xs text-emerald-800">
            <span className="font-semibold">Net Profit (Take-Home)</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 text-lg font-bold text-emerald-800">
            +{currency}{netEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-0.5 text-[11px] text-emerald-700">
            Cash collected minus kiosk replenishment (pure earnings)
          </p>
        </div>
      </div>
    </div>
  );
}
