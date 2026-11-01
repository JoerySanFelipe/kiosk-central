'use client';

import React, { useState } from 'react';
import { Wallet, History, ArrowDownRight, Layers } from 'lucide-react';

interface WalletBalanceCardProps {
  balance: number;
  totalDeductions: number;
  personalDraws?: number;
  currency?: string;
  onGoToWalletCashIn: () => void;
}

export function WalletBalanceCard({
  balance,
  totalDeductions,
  personalDraws,
  currency = '₱',
  onGoToWalletCashIn,
}: WalletBalanceCardProps) {
  const [walletMetric, setWalletMetric] = useState<'BALANCE' | 'DEDUCTIONS'>('BALANCE');

  const pureTransactionsDeduction =
    personalDraws !== undefined && personalDraws > 0
      ? Math.max(0, totalDeductions - personalDraws)
      : totalDeductions;

  const displayAmount = walletMetric === 'BALANCE' ? balance : pureTransactionsDeduction;
  const titleLabel =
    walletMetric === 'BALANCE'
      ? 'Master Wallet Remaining Balance'
      : 'Total Wallet Used (Transactions + Service Fees)';
  const subLabel =
    walletMetric === 'BALANCE'
      ? 'Available operational funds for Cash-In, E-Load & Bills'
      : personalDraws !== undefined && personalDraws > 0
      ? `Plus ₱${personalDraws.toLocaleString('en-US', { minimumFractionDigits: 2 })} owner personal draw`
      : 'Cumulative deductions for all fulfilled customer transactions';

  return (
    <div className="crimson-gradient relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-6 text-white shadow-lg md:p-7">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-black/20 blur-xl" />

      {/* Header: Toggle Switcher */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="inline-flex shrink-0 rounded-xl bg-black/25 p-1 backdrop-blur-xs">
          <button
            type="button"
            onClick={() => setWalletMetric('BALANCE')}
            className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              walletMetric === 'BALANCE'
                ? 'bg-white text-[#8A0000] shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span>Remaining Balance</span>
          </button>

          <button
            type="button"
            onClick={() => setWalletMetric('DEDUCTIONS')}
            className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              walletMetric === 'DEDUCTIONS'
                ? 'bg-white text-[#8A0000] shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
            <span>Total Used</span>
          </button>
        </div>

        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white tracking-wide">
          LPB Wallet
        </span>
      </div>

      {/* Main Big Display Area */}
      <div className="relative z-10 my-4">
        <div className="text-[11px] font-medium text-white/75">
          {titleLabel}
        </div>
        <div className="mt-1 flex items-baseline space-x-1.5">
          <span className="text-2xl font-semibold opacity-90">{currency}</span>
          <span className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {displayAmount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="mt-1 text-xs text-white/70">
          {subLabel}
        </div>
      </div>

      {/* Bottom Footer: Quick Action & Note */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-3.5">
        <div className="flex items-center space-x-1.5 text-[11px] text-white/80">
          <Layers className="h-3.5 w-3.5 opacity-70" />
          <span>
            {walletMetric === 'BALANCE'
              ? `Deductions: ${currency}${pureTransactionsDeduction.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : `Balance: ${currency}${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          </span>
        </div>
        <button
          type="button"
          onClick={onGoToWalletCashIn}
          className="flex items-center space-x-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-[#8A0000] shadow-sm transition-all hover:bg-slate-100 active:scale-95 cursor-pointer"
        >
          <History className="h-3.5 w-3.5" />
          <span>Wallet Cash-In</span>
        </button>
      </div>
    </div>
  );
}
