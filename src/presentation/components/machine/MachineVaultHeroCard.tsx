'use client';

import React, { useState } from 'react';
import { Vault, History, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { MachineVaultSummary, FinancialSummary } from '@/domain/types';

interface MachineVaultHeroCardProps {
  vaultSummary: MachineVaultSummary | null;
  machineSummary: FinancialSummary | null;
  currency?: string;
  onRecordHarvest?: () => void;
  theme?: 'crimson' | 'clean';
}

export function MachineVaultHeroCard({
  vaultSummary,
  machineSummary,
  currency = '₱',
  theme = 'clean',
}: MachineVaultHeroCardProps) {
  const [metric, setMetric] = useState<'VAULT' | 'HARVEST' | 'DRAINED'>('VAULT');

  const currentCashInVault = vaultSummary?.currentCashInVault ?? 0;
  const uncollectedCount = vaultSummary?.uncollectedTransactionsCount ?? 0;
  const lastHarvestAmount = vaultSummary?.lastHarvest?.actualAmount ?? 0;
  const totalDrained = machineSummary?.totalWalletDeduction ?? 0;

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  let displayAmount = currentCashInVault;
  let titleLabel = 'Uncollected Cash in Box';
  let subLabel = `${uncollectedCount} transactions waiting for harvest`;

  if (metric === 'HARVEST') {
    displayAmount = lastHarvestAmount;
    titleLabel = 'Last Cash Harvest';
    subLabel = vaultSummary?.lastHarvest
      ? `${formatDate(vaultSummary.lastHarvest.harvestedAt)} by ${vaultSummary.lastHarvest.collectedBy}`
      : 'No previous collection recorded';
  } else if (metric === 'DRAINED') {
    displayAmount = totalDrained;
    titleLabel = 'Master Wallet Used by Machine';
    subLabel = 'Cumulative funds deducted from LPB master wallet';
  }

  const isClean = theme === 'clean';

  return (
    <div
      className={
        isClean
          ? 'relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40 p-6 text-slate-900 shadow-xs md:p-7'
          : 'crimson-gradient relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-6 text-white shadow-lg md:p-7'
      }
    >
      {/* Background ambient lighting */}
      {isClean ? (
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-amber-100/50 blur-2xl" />
      ) : (
        <>
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-black/20 blur-xl" />
        </>
      )}

      {/* Header: Toggle Switcher */}
      <div className="relative z-10 flex items-center justify-between">
        <div
          className={`inline-flex shrink-0 rounded-xl p-1 backdrop-blur-xs ${
            isClean ? 'bg-amber-100/80 border border-amber-200' : 'bg-black/25'
          }`}
        >
          <button
            type="button"
            onClick={() => setMetric('VAULT')}
            className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              metric === 'VAULT'
                ? isClean
                  ? 'bg-white text-amber-950 shadow-xs font-bold'
                  : 'bg-white text-[#8A0000] shadow-sm'
                : isClean
                ? 'text-amber-800/80 hover:text-amber-950'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Vault className="h-3.5 w-3.5 shrink-0" />
            <span>Uncollected Cash</span>
          </button>

          <button
            type="button"
            onClick={() => setMetric('HARVEST')}
            className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              metric === 'HARVEST'
                ? isClean
                  ? 'bg-white text-amber-950 shadow-xs font-bold'
                  : 'bg-white text-[#8A0000] shadow-sm'
                : isClean
                ? 'text-amber-800/80 hover:text-amber-950'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5 shrink-0" />
            <span>Last Harvest</span>
          </button>

          <button
            type="button"
            onClick={() => setMetric('DRAINED')}
            className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
              metric === 'DRAINED'
                ? isClean
                  ? 'bg-white text-amber-950 shadow-xs font-bold'
                  : 'bg-white text-[#8A0000] shadow-sm'
                : isClean
                ? 'text-amber-800/80 hover:text-amber-950'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
            <span>Wallet Used</span>
          </button>
        </div>
      </div>

      {/* Main Big Display Area */}
      <div className="relative z-10 my-4">
        <div
          className={`text-[11px] font-bold uppercase tracking-wider ${
            isClean ? 'text-amber-800' : 'text-white/75 font-medium'
          }`}
        >
          {titleLabel}
        </div>
        <div className="mt-1 flex items-baseline space-x-1.5">
          <span
            className={`text-2xl font-semibold ${
              isClean ? 'text-amber-700' : 'opacity-90'
            }`}
          >
            {currency}
          </span>
          <span
            className={`text-3xl font-black tracking-tight sm:text-4xl ${
              isClean ? 'text-amber-950' : 'font-extrabold text-white'
            }`}
          >
            {displayAmount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div
          className={`mt-1 text-xs ${
            isClean ? 'text-amber-700/90 font-medium' : 'text-white/70'
          }`}
        >
          {subLabel}
        </div>
      </div>

      {/* Bottom Footer: Status Info */}
      <div
        className={`relative z-10 flex items-center justify-between border-t pt-3.5 ${
          isClean ? 'border-amber-200/80' : 'border-white/15'
        }`}
      >
        <div
          className={`flex items-center space-x-1.5 text-[11px] ${
            isClean ? 'text-amber-800 font-medium' : 'text-white/80'
          }`}
        >
          <CheckCircle2
            className={`h-3.5 w-3.5 ${
              isClean ? 'text-amber-600' : 'text-emerald-300 opacity-80'
            }`}
          />
          <span>
            {metric === 'VAULT' && currentCashInVault > 0
              ? 'Physical cash in machine box waiting for harvest'
              : metric === 'HARVEST'
              ? 'Verified collection record'
              : 'Terminal wallet consumption'}
          </span>
        </div>
        <div
          className={`text-[11px] font-bold ${
            isClean ? 'text-amber-950' : 'text-white/90'
          }`}
        >
          {metric === 'VAULT'
            ? `Box: ${currency}${currentCashInVault.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            : metric === 'HARVEST'
            ? `Last: ${currency}${lastHarvestAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            : `Drained: ${currency}${totalDrained.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        </div>
      </div>
    </div>
  );
}
