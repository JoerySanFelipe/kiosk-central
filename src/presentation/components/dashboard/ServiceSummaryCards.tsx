'use client';

import React from 'react';
import { CreditCard, Smartphone, FileSpreadsheet, Wifi } from 'lucide-react';
import { FinancialSummary } from '@/domain/types';

interface ServiceSummaryCardsProps {
  summary: FinancialSummary;
  viewMetric?: 'GROSS' | 'PROFIT' | 'CASH';
  onFilterService: (serviceType: string) => void;
  selectedService: string;
  currency?: string;
}

export function ServiceSummaryCards({
  summary,
  viewMetric = 'CASH',
  onFilterService,
  selectedService,
  currency = '₱',
}: ServiceSummaryCardsProps) {
  const cards = [
    {
      id: 'CASH_IN',
      title: 'Cash In',
      metric: summary.breakdown.cashIn,
      icon: CreditCard,
      cardBg: 'bg-rose-50/40',
      borderClass: 'border-rose-200',
      titleColor: 'text-rose-800',
      amountColor: 'text-rose-950',
      badgeBg: 'bg-rose-100',
      iconColor: 'text-rose-800',
      hoverBorder: 'hover:border-rose-400',
      selectedRing: 'border-rose-500 ring-2 ring-rose-500/20',
    },
    {
      id: 'E_LOAD',
      title: 'Load',
      metric: summary.breakdown.load,
      icon: Smartphone,
      cardBg: 'bg-amber-50/40',
      borderClass: 'border-amber-200',
      titleColor: 'text-amber-800',
      amountColor: 'text-amber-950',
      badgeBg: 'bg-amber-100',
      iconColor: 'text-amber-800',
      hoverBorder: 'hover:border-amber-400',
      selectedRing: 'border-amber-500 ring-2 ring-amber-500/20',
    },
    {
      id: 'BILLS_PAYMENT',
      title: 'Bills',
      metric: summary.breakdown.bills,
      icon: FileSpreadsheet,
      cardBg: 'bg-blue-50/40',
      borderClass: 'border-blue-200',
      titleColor: 'text-blue-800',
      amountColor: 'text-blue-950',
      badgeBg: 'bg-blue-100',
      iconColor: 'text-blue-800',
      hoverBorder: 'hover:border-blue-400',
      selectedRing: 'border-blue-500 ring-2 ring-blue-500/20',
    },
    {
      id: 'PISO_WIFI',
      title: 'Piso WiFi',
      metric: summary.breakdown.pisoWifi,
      icon: Wifi,
      cardBg: 'bg-emerald-50/40',
      borderClass: 'border-emerald-200',
      titleColor: 'text-emerald-800',
      amountColor: 'text-emerald-950',
      badgeBg: 'bg-emerald-100',
      iconColor: 'text-emerald-800',
      hoverBorder: 'hover:border-emerald-400',
      selectedRing: 'border-emerald-500 ring-2 ring-emerald-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        const isSelected = selectedService === c.id;

        // Primary display is Cash Inserted by default
        let displayValue = c.metric.cashInserted;
        let metricLabel = 'Cash Inserted';
        if (viewMetric === 'PROFIT') {
          displayValue = c.metric.netProfit;
          metricLabel = 'Net Profit';
        } else if (viewMetric === 'GROSS') {
          displayValue = c.metric.volume;
          metricLabel = 'Gross Volume';
        }

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onFilterService(isSelected ? 'ALL' : c.id)}
            className={`group relative flex flex-col justify-between rounded-2xl border p-5 text-left shadow-xs transition-all cursor-pointer hover:shadow-sm ${
              c.cardBg
            } ${c.borderClass} ${
              isSelected ? `border-2 ${c.selectedRing}` : c.hoverBorder
            }`}
          >
            {/* Top row: Title and Icon badge */}
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${c.titleColor}`}>
                  {c.title}
                </span>
                <div className="mt-1 flex items-baseline space-x-1">
                  <span className={`text-sm font-bold ${c.titleColor}`}>{currency}</span>
                  <span className={`text-2xl font-black tracking-tight ${c.amountColor}`}>
                    {displayValue.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <span className={`text-[10px] font-medium ${c.titleColor} opacity-80`}>
                  {metricLabel}
                </span>
              </div>

              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.badgeBg} ${c.iconColor} transition-transform group-hover:scale-105`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </div>

            {/* Bottom row: count & profit chip */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-3 text-[11px]">
              <span className="text-slate-600 font-medium">
                {c.metric.transactionCount} transactions
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 font-bold text-emerald-800">
                +{currency}{c.metric.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Profit
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
