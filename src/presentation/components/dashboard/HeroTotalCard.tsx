'use client';

import React from 'react';
import { Banknote, Coins, TrendingUp, Clock, Download } from 'lucide-react';
import { FinancialSummary } from '@/domain/types';

interface HeroTotalCardProps {
  summary: FinancialSummary;
  viewMetric?: 'CASH' | 'PROFIT' | 'GROSS';
  onChangeViewMetric?: (metric: 'CASH' | 'PROFIT' | 'GROSS') => void;
  selectedService: string;
  onSelectService: (service: string) => void;
  currency?: string;
  timeRange?: string;
  onChangeTimeRange?: (range: string) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (start: string, end: string) => void;
  onExport?: () => void;
  showCashInVault?: boolean;
  theme?: 'crimson' | 'clean';
}

export function HeroTotalCard({
  summary,
  viewMetric = 'CASH',
  onChangeViewMetric,
  selectedService,
  onSelectService,
  currency = '₱',
  timeRange = 'ALL',
  onChangeTimeRange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  onExport,
  theme = 'crimson',
}: HeroTotalCardProps) {
  // Compute numbers based on selected service
  let currentInsertedCash = summary.totalInsertedCash;
  let currentNetProfit = summary.totalNetProfit;
  let currentGrossVolume = summary.totalGrossVolume;
  let currentTxCount = summary.totalTransactionsCount;

  if (selectedService === 'CASH_IN') {
    currentInsertedCash = summary.breakdown.cashIn.cashInserted;
    currentNetProfit = summary.breakdown.cashIn.netProfit;
    currentGrossVolume = summary.breakdown.cashIn.volume;
    currentTxCount = summary.breakdown.cashIn.transactionCount;
  } else if (selectedService === 'E_LOAD') {
    currentInsertedCash = summary.breakdown.load.cashInserted;
    currentNetProfit = summary.breakdown.load.netProfit;
    currentGrossVolume = summary.breakdown.load.volume;
    currentTxCount = summary.breakdown.load.transactionCount;
  } else if (selectedService === 'BILLS_PAYMENT') {
    currentInsertedCash = summary.breakdown.bills.cashInserted;
    currentNetProfit = summary.breakdown.bills.netProfit;
    currentGrossVolume = summary.breakdown.bills.volume;
    currentTxCount = summary.breakdown.bills.transactionCount;
  } else if (selectedService === 'PISO_WIFI') {
    currentInsertedCash = summary.breakdown.pisoWifi.cashInserted;
    currentNetProfit = summary.breakdown.pisoWifi.netProfit;
    currentGrossVolume = summary.breakdown.pisoWifi.volume;
    currentTxCount = summary.breakdown.pisoWifi.transactionCount;
  }

  // Active metric determination
  let displayAmount = currentInsertedCash;
  let titleLabel = 'Total Cash Inserted';
  let subLabel = `${currentTxCount} consolidated customer transactions`;

  if (viewMetric === 'PROFIT') {
    displayAmount = currentNetProfit;
    titleLabel = 'Total Net Profit';
    subLabel = 'Transaction Fee minus Provider Service Charge (+ Piso WiFi)';
  } else if (viewMetric === 'GROSS') {
    displayAmount = currentGrossVolume;
    titleLabel = 'Total Gross Volume';
    subLabel = `${currentTxCount} transactions processed`;
  }

  const services = [
    { id: 'ALL', label: 'All Services' },
    { id: 'CASH_IN', label: 'Cash-In' },
    { id: 'E_LOAD', label: 'Load' },
    { id: 'BILLS_PAYMENT', label: 'Bills' },
    { id: 'PISO_WIFI', label: 'Piso WiFi' },
  ];

  const isClean = theme === 'clean';

  return (
    <div
      className={
        isClean
          ? 'relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 text-slate-900 shadow-xs md:p-7'
          : 'crimson-gradient relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-6 text-white shadow-lg md:p-7'
      }
    >
      {/* Background ambient lighting */}
      {isClean ? (
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl" />
      ) : (
        <>
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-black/20 blur-2xl" />
        </>
      )}

      {/* Top Header: Toggle Switcher & Timeline / Export Controls */}
      <div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          {/* Toggle Switcher Button Group */}
          {onChangeViewMetric && (
            <div
              className={`inline-flex shrink-0 rounded-xl p-1 backdrop-blur-xs ${
                isClean ? 'bg-emerald-100/80 border border-emerald-200' : 'bg-black/25'
              }`}
            >
              <button
                type="button"
                onClick={() => onChangeViewMetric('CASH')}
                className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  viewMetric === 'CASH'
                    ? isClean
                      ? 'bg-white text-emerald-950 shadow-xs font-bold'
                      : 'bg-white text-[#8A0000] shadow-sm'
                    : isClean
                    ? 'text-emerald-800/80 hover:text-emerald-950'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Banknote className="h-3.5 w-3.5 shrink-0" />
                <span>Total Inserted</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeViewMetric('PROFIT')}
                className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  viewMetric === 'PROFIT'
                    ? isClean
                      ? 'bg-white text-emerald-950 shadow-xs font-bold'
                      : 'bg-white text-[#8A0000] shadow-sm'
                    : isClean
                    ? 'text-emerald-800/80 hover:text-emerald-950'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Coins className="h-3.5 w-3.5 shrink-0" />
                <span>Net Profit</span>
              </button>

              <button
                type="button"
                onClick={() => onChangeViewMetric('GROSS')}
                className={`flex items-center space-x-1.5 rounded-lg px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
                  viewMetric === 'GROSS'
                    ? isClean
                      ? 'bg-white text-emerald-950 shadow-xs font-bold'
                      : 'bg-white text-[#8A0000] shadow-sm'
                    : isClean
                    ? 'text-emerald-800/80 hover:text-emerald-950'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                <span>Gross Sales</span>
              </button>
            </div>
          )}

          {/* Timeline Dropdown & Export Button */}
          <div className="flex shrink-0 items-center space-x-1.5 sm:space-x-2">
            {onChangeTimeRange && (
              <div className="relative flex items-center">
                <Clock
                  className={`pointer-events-none absolute left-2.5 h-3.5 w-3.5 z-10 ${
                    isClean ? 'text-emerald-700' : 'text-red-600'
                  }`}
                />
                <select
                  value={timeRange || 'ALL'}
                  onChange={(e) => onChangeTimeRange(e.target.value)}
                  className={`h-7 sm:h-7.5 rounded-lg sm:rounded-xl pl-7.5 pr-2.5 text-[11px] sm:text-xs font-bold shadow-xs transition-all focus:outline-none cursor-pointer ${
                    isClean
                      ? 'bg-white border border-emerald-200 text-emerald-950'
                      : 'bg-white text-[#8A0000]'
                  }`}
                >
                  <option value="ALL" className="text-slate-900 font-medium">All Time</option>
                  <option value="TODAY" className="text-slate-900 font-medium">Today</option>
                  <option value="YESTERDAY" className="text-slate-900 font-medium">Yesterday</option>
                  <option value="LAST_7_DAYS" className="text-slate-900 font-medium">Last 7 Days</option>
                  <option value="LAST_30_DAYS" className="text-slate-900 font-medium">Last 30 Days</option>
                  <option value="THIS_MONTH" className="text-slate-900 font-medium">This Month</option>
                  <option value="CUSTOM" className="text-slate-900 font-medium">Custom Range</option>
                </select>
              </div>
            )}

            {onExport && (
              <button
                type="button"
                onClick={onExport}
                title="Export Transactions to CSV"
                className={`flex h-7 sm:h-7.5 items-center space-x-1.5 rounded-lg sm:rounded-xl px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${
                  isClean
                    ? 'bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-100/60'
                    : 'bg-white/20 text-white backdrop-blur-xs hover:bg-white hover:text-[#8A0000]'
                }`}
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Picker when Custom Range is active */}
        {timeRange === 'CUSTOM' && (
          <div
            className={`relative z-10 mt-2.5 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-xs backdrop-blur-xs border ${
              isClean
                ? 'bg-white/80 border-emerald-200 text-slate-800'
                : 'bg-black/30 border-white/10 text-white'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isClean ? 'text-emerald-800' : 'text-white/70'
                }`}
              >
                From:
              </span>
              <input
                type="date"
                value={customStartDate || ''}
                onChange={(e) => onCustomDateChange?.(e.target.value, customEndDate || '')}
                className={`rounded-lg px-2 py-1 text-xs font-medium focus:outline-none cursor-pointer ${
                  isClean
                    ? 'border border-emerald-200 bg-white text-slate-900'
                    : 'bg-white/20 text-white placeholder-white/50 focus:bg-white focus:text-slate-900'
                }`}
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isClean ? 'text-emerald-800' : 'text-white/70'
                }`}
              >
                To:
              </span>
              <input
                type="date"
                value={customEndDate || ''}
                onChange={(e) => onCustomDateChange?.(customStartDate || '', e.target.value)}
                className={`rounded-lg px-2 py-1 text-xs font-medium focus:outline-none cursor-pointer ${
                  isClean
                    ? 'border border-emerald-200 bg-white text-slate-900'
                    : 'bg-white/20 text-white placeholder-white/50 focus:bg-white focus:text-slate-900'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Display Area */}
      <div className="relative z-10 my-4">
        <div
          className={`text-[11px] font-bold uppercase tracking-wider ${
            isClean ? 'text-emerald-800' : 'text-white/75 font-medium'
          }`}
        >
          {titleLabel}
        </div>
        <div className="mt-1 flex items-baseline space-x-1.5">
          <span
            className={`text-2xl font-semibold ${
              isClean ? 'text-emerald-700' : 'opacity-90'
            }`}
          >
            {viewMetric === 'PROFIT' && displayAmount > 0 ? `+${currency}` : currency}
          </span>
          <span
            className={`text-3xl font-black tracking-tight sm:text-4xl ${
              isClean ? 'text-emerald-950' : 'font-extrabold text-white'
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
            isClean ? 'text-emerald-700/90 font-medium' : 'text-white/70'
          }`}
        >
          {subLabel}
        </div>
      </div>

      {/* Bottom Service Filter Pills */}
      <div
        className={`relative z-10 flex flex-wrap gap-1.5 border-t pt-3.5 ${
          isClean ? 'border-emerald-200/80' : 'border-white/15'
        }`}
      >
        {services.map((svc) => {
          const isSelected = selectedService === svc.id;
          return (
            <button
              key={svc.id}
              type="button"
              onClick={() => onSelectService(svc.id)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                isSelected
                  ? isClean
                    ? 'bg-emerald-900 text-white shadow-xs ring-1 ring-emerald-900/50'
                    : 'bg-white text-[#8A0000] shadow-sm ring-1 ring-white/50'
                  : isClean
                  ? 'bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-100/60'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {svc.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
