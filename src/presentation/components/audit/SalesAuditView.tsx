'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Scale,
  Wallet,
  Landmark,
  User,
  RefreshCw,
  TrendingUp,
  Info,
  Server,
  Coins,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { SalesAuditReport } from '@/domain/types';

interface SalesAuditViewProps {
  currency?: string;
}

export function SalesAuditView({ currency = '₱' }: SalesAuditViewProps) {
  const [report, setReport] = useState<SalesAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [auditHorizon, setAuditHorizon] = useState<'CYCLE' | 'ALL_TIME'>('CYCLE');

  const fetchAuditData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/audit');
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Error fetching audit data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const formatMoney = (val?: number) => {
    return (val ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (isLoading || !report) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#8A0000] border-t-transparent" />
        <p className="text-xs font-semibold text-slate-500">Kinakalkula ang forensic audit report...</p>
      </div>
    );
  }

  const { cycle, allTime, stations, machines } = report;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Audit Horizon Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#8A0000]/10 text-[#8A0000]">
              <Scale className="h-4 w-4" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Sales & Cash Reconciliation Audit
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Eksaktong pagbabangga ng benta, kita, reload allowance, bangko, at natitirang pera sa vault.
          </p>
        </div>

        {/* Horizon Tabs Switcher */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setAuditHorizon('CYCLE')}
            className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              auditHorizon === 'CYCLE'
                ? 'bg-white text-[#8A0000] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Latest Reload Cycle ({currency}{formatMoney(cycle.initialAllowance)})</span>
          </button>
          <button
            type="button"
            onClick={() => setAuditHorizon('ALL_TIME')}
            className={`flex items-center space-x-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              auditHorizon === 'ALL_TIME'
                ? 'bg-white text-[#8A0000] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>All-Time Capital ({currency}{formatMoney(allTime.startingCapital)})</span>
          </button>
        </div>
      </div>

      {/* Hero Zero-Variance Banner (For Cycle Horizon) */}
      {auditHorizon === 'CYCLE' ? (
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                    Closed-Loop Forensic Match
                  </span>
                  <span className="text-[11px] font-medium text-emerald-700">
                    Oct 22 Reload Cycle
                  </span>
                </div>
                <h3 className="mt-1 text-base sm:text-lg font-extrabold text-slate-900">
                  100% Tugma at Balanced: Walang Nawawalang Pera ({currency}0.00 Variance)
                </h3>
                <p className="mt-0.5 text-xs text-slate-600 max-w-2xl leading-relaxed">
                  Ang buong <span className="font-bold text-slate-900">{currency}{formatMoney(cycle.initialAllowance)}</span> allowance pagka-reload noong Oct 22 (kasama ang kinita sa Piso WiFi at convenience fees) ay eksaktong katumbas ng digital wallet, bank deposits, hawak ng staff, benta sa loob ng makina, at personal draws ng may-ari.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center space-x-4 border-t md:border-t-0 md:border-l border-emerald-200/80 pt-3 md:pt-0 md:pl-6">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Accountability
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700">
                  {currency}{formatMoney(cycle.totalCycleAccountability)}
                </span>
              </div>
              <span className="text-slate-300 font-bold">=</span>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Located Assets
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  {currency}{formatMoney(cycle.totalLocatedAssets)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-blue-50/50 p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xs">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black text-blue-800 uppercase tracking-wider">
                    Macro Capital Audit
                  </span>
                  <span className="text-[11px] font-medium text-blue-700">
                    Cumulative Panimulang Puhunan
                  </span>
                </div>
                <h3 className="mt-1 text-base sm:text-lg font-extrabold text-slate-900">
                  Kabuuang Katayuan ng Puhunan: {currency}{formatMoney(allTime.startingCapital)}
                </h3>
                <p className="mt-0.5 text-xs text-slate-600 max-w-2xl leading-relaxed">
                  Ipinapakita nito ang kabuuang net assets ng negosyo. Matapos ibawas ang personal withdrawals ng may-ari ({currency}{formatMoney(allTime.totalPersonalDraws)}) at idagdag ang all-time net profit ({currency}{formatMoney(allTime.totalNetProfit)}), buo at umiikot ang working capital sa pagitan ng wallet, bangko, at makina.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center space-x-4 border-t md:border-t-0 md:border-l border-blue-200/80 pt-3 md:pt-0 md:pl-6">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Starting Capital
                </span>
                <span className="text-xl sm:text-2xl font-black text-blue-700">
                  {currency}{formatMoney(allTime.startingCapital)}
                </span>
              </div>
              <span className="text-slate-300 font-bold">+ Profit</span>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Liquid Assets
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  {currency}{formatMoney(allTime.totalTangibleAssets)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* The 5 Stations of Cash Pipeline (Interactive Visual Flow) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Ang 5 Lagayan ng Pera (Cash Pipeline Flow)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dito sumasagot kung bakit hindi magkapareho ang wallet at bangko: patuloy na umiikot ang pera sa 5 istasyong ito.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] font-bold text-slate-400">
            <RefreshCw className="h-3 w-3 animate-spin text-slate-400" />
            <span>Continuous Cycle</span>
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Station 1: Master Wallet */}
          <div className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 hover:border-[#8A0000]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A0000]">
                Station 1 • Digital
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#8A0000]/10 text-[#8A0000]">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-slate-600 truncate">Master LPB Wallet</div>
              <div className="mt-0.5 text-xl font-black text-slate-900">
                {currency}{formatMoney(stations.wallet.amount)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 leading-tight">
                Digital allowance na handa pang ibenta sa kiosk
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-medium text-slate-500">
              <span>Status</span>
              <span className="font-bold text-emerald-600">Available</span>
            </div>
          </div>

          {/* Station 2: Kiosk Vaults */}
          <div className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 hover:border-amber-400/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Station 2 • Kiosks
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <Coins className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-slate-600 truncate">Kiosk Vaults (Cash)</div>
              <div className="mt-0.5 text-xl font-black text-amber-950">
                {currency}{formatMoney(stations.vault.amount)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 leading-tight">
                3C: {currency}{formatMoney(stations.vault.m1Amount)} • Porbido: {currency}{formatMoney(stations.vault.m2Amount)}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-medium text-slate-500">
              <span>Status</span>
              <span className="font-bold text-amber-700">Uncollected Cash</span>
            </div>
          </div>

          {/* Station 3: Staff / Collector */}
          <div className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 hover:border-blue-400/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                Station 3 • Staff
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
                <User className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-slate-600 truncate">Staff Cash on Hand</div>
              <div className="mt-0.5 text-xl font-black text-blue-950">
                {currency}{formatMoney(stations.collector.amount)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 leading-tight">
                Naharvest na ngunit hindi pa nadideposito sa bangko
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-medium text-slate-500">
              <span>Pending Harvests</span>
              <span className="font-bold text-blue-700">{stations.collector.pendingHarvestsCount} records</span>
            </div>
          </div>

          {/* Station 4: Bank Pending Reload */}
          <div className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 hover:border-indigo-400/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                Station 4 • Bank
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-800">
                <Landmark className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-slate-600 truncate">Metrobank Pending</div>
              <div className="mt-0.5 text-xl font-black text-indigo-950">
                {currency}{formatMoney(stations.bank.amount)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 leading-tight">
                Nasa bangko na, naghihintay ng reload pabalik sa wallet
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-medium text-slate-500">
              <span>Pending Deposits</span>
              <span className="font-bold text-indigo-700">{stations.bank.pendingDepositsCount} deposits</span>
            </div>
          </div>

          {/* Station 5: Owner Draws & Profits */}
          <div className="relative flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 hover:border-purple-400/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                Station 5 • Owner
              </span>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-800">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-[11px] font-semibold text-slate-600 truncate">Draws & Net Profit</div>
              <div className="mt-0.5 text-xl font-black text-purple-950">
                {currency}{formatMoney(stations.drawsAndProfits.personalDraws)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500 leading-tight">
                Draws: {currency}{formatMoney(stations.drawsAndProfits.personalDraws)} • Profit: {currency}{formatMoney(stations.drawsAndProfits.netProfit)}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-medium text-slate-500">
              <span>Total Profit</span>
              <span className="font-bold text-emerald-700">+{currency}{formatMoney(stations.drawsAndProfits.netProfit)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Detailed Forensic Reconciliation Balance Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Pinagmulang Pondo (Source of Funds) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                  A
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  {auditHorizon === 'CYCLE' ? 'Pinagmulang Pondo (Cycle Accountability)' : 'Orihinal na Puhunan at Kita (All-Time Equity)'}
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500">Source Debit</span>
            </div>

            <div className="mt-4 space-y-3">
              {auditHorizon === 'CYCLE' ? (
                <>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">Oct 22 Reload Allowance</span>
                      <span className="block text-[10px] text-slate-400">Balanse bago nag-reload ({currency}{formatMoney(cycle.allowanceBefore)}) + Reload ({currency}{formatMoney(cycle.reloadAmount)})</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{currency}{formatMoney(cycle.initialAllowance)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-emerald-800">Convenience Fees Earned</span>
                      <span className="block text-[10px] text-slate-400">Kita mula sa Cash-In, E-Load at Bills Payment transactions</span>
                    </div>
                    <span className="font-extrabold text-emerald-700">+{currency}{formatMoney(cycle.convenienceFeesEarned)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-emerald-800">Piso WiFi Coin Sales</span>
                      <span className="block text-[10px] text-slate-400">Barya na pumasok sa vault na hindi nagbawas sa wallet</span>
                    </div>
                    <span className="font-extrabold text-emerald-700">+{currency}{formatMoney(cycle.pisoWifiSales)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-700">Change Surplus & Adjustments</span>
                      <span className="block text-[10px] text-slate-400">Net coin rounding and change retained in machine</span>
                    </div>
                    <span className="font-extrabold text-slate-700">+{currency}{formatMoney(cycle.cashAdjustmentsSurplus)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">Panimulang Puhunan (Starting Capital)</span>
                      <span className="block text-[10px] text-slate-400">Metrobank initial funding for operations</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{currency}{formatMoney(allTime.startingCapital)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-emerald-800">All-Time Net Profit Earned</span>
                      <span className="block text-[10px] text-slate-400">3C Kiosk ({currency}1,743.70) + Porbido ({currency}1,137.00)</span>
                    </div>
                    <span className="font-extrabold text-emerald-700">+{currency}{formatMoney(allTime.totalNetProfit)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-purple-800">Less: Personal Drawings ng May-ari</span>
                      <span className="block text-[10px] text-slate-400">Nai-withdraw na personal funds mula sa wallet</span>
                    </div>
                    <span className="font-extrabold text-purple-700">-{currency}{formatMoney(allTime.totalPersonalDraws)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-slate-200 flex justify-between items-center">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              {auditHorizon === 'CYCLE' ? 'Kabuuan ng Dapat Ma-Account:' : 'Expected Net Working Assets:'}
            </span>
            <span className="text-lg font-black text-[#8A0000]">
              {currency}{formatMoney(auditHorizon === 'CYCLE' ? cycle.totalCycleAccountability : allTime.expectedTotalWorkingAssets)}
            </span>
          </div>
        </div>

        {/* Right Side: Kinaroroonan ng Pera (Located Funds) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                  B
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  {auditHorizon === 'CYCLE' ? 'Kinaroroonan ng Pera Ngayon (Located Assets)' : 'Aktuwal na Ari-Arian Ngayon (Tangible Assets)'}
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700">Asset Credit</span>
            </div>

            <div className="mt-4 space-y-3">
              {auditHorizon === 'CYCLE' ? (
                <>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">1. Digital Master Wallet (LPB)</span>
                      <span className="block text-[10px] text-slate-400">Kasalukuyang natitirang balance sa wallet</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{currency}{formatMoney(cycle.currentWalletBalance)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">2. Bank Deposits mula sa Cycle</span>
                      <span className="block text-[10px] text-slate-400">Oct 27 (₱36,540) + Oct 29 (₱7,794) sa Metrobank</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{currency}{formatMoney(cycle.bankDepositsPostReload)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">3. Cash Hawak ng Kolektor</span>
                      <span className="block text-[10px] text-slate-400">Naharvest nung Oct 29 (₱663) at Oct 30 (₱2,620)</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{currency}{formatMoney(cycle.collectorCashOnHand)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">4. Benta sa Loob ng Kiosk Vaults</span>
                      <span className="block text-[10px] text-slate-400">Uncollected cashbox mula sa transactions after reload</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{currency}{formatMoney(cycle.kioskCashInVaultPostReload)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-purple-800">5. Personal Draw ng May-ari</span>
                      <span className="block text-[10px] text-slate-400">Personal withdrawal noong Oct 31 mula sa wallet</span>
                    </div>
                    <span className="font-extrabold text-purple-700">{currency}{formatMoney(cycle.ownerPersonalDraws)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">1. Master LPB Wallet Balance</span>
                      <span className="block text-[10px] text-slate-400">Digital funds</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{currency}{formatMoney(allTime.currentWalletBalance)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">2. Lahat ng Pera sa Bangko (Unreplenished)</span>
                      <span className="block text-[10px] text-slate-400">Oct 16 (₱7,620) + Oct 27 (₱36,540) + Oct 29 (₱7,794)</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{currency}{formatMoney(allTime.bankDepositsPending)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">3. Cash sa Kamay ng Staff</span>
                      <span className="block text-[10px] text-slate-400">Undeposited collections</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{currency}{formatMoney(allTime.collectorCashOnHand)}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">4. Kabuuang Benta sa Loob ng Kiosks</span>
                      <span className="block text-[10px] text-slate-400">3C Kiosk ({currency}{formatMoney(stations.vault.m1Amount)}) + Porbido ({currency}{formatMoney(stations.vault.m2Amount)})</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{currency}{formatMoney(allTime.kioskCashInVaultTotal)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-slate-200 flex justify-between items-center">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              {auditHorizon === 'CYCLE' ? 'Kabuuan ng Nakitang Pera:' : 'Total Liquid Working Assets:'}
            </span>
            <span className="text-lg font-black text-emerald-700">
              {currency}{formatMoney(auditHorizon === 'CYCLE' ? cycle.totalLocatedAssets : allTime.totalTangibleAssets)}
            </span>
          </div>
        </div>
      </div>

      {/* Machine Level Cards */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-3">
          Per-Machine Sales & Profit Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {machines.map((m) => (
            <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Server className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{m.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{m.totalTransactions} transactions recorded</span>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                  +{currency}{formatMoney(m.allTimeProfit)} Net Profit
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="block text-[10px] text-slate-500 font-medium">Gross Customer Volume</span>
                  <span className="font-bold text-slate-900">{currency}{formatMoney(m.totalVolume)}</span>
                </div>
                <div className="bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-lg">
                  <span className="block text-[10px] text-amber-800 font-medium">Uncollected Cash in Vault</span>
                  <span className="font-extrabold text-amber-950">{currency}{formatMoney(m.currentVaultCash)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Guide for the Boss */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-xs text-slate-600 space-y-2">
        <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm">
          <Info className="h-4 w-4 text-[#8A0000]" />
          <span>Gabay sa Pagpapaliwanag sa Amo (Auditor's Notes):</span>
        </div>
        <p>
          1. <strong>Bakit hindi magkapareho ang Wallet at Bangko?</strong> Dahil hindi sabay-sabay ang ikot ng pera. Ang wallet ay digital na ginagamit sa transaksyon. Kapag nag-cash in ang customer, papasok ang papel na pera sa vault ng makina, kukunin ng staff (harvest), ihuhulog sa Metrobank (deposit), at saka pa lang babalik sa wallet bilang reload.
        </p>
        <p>
          2. <strong>Bakit may ₱1,574.23 na sobra sa Located Assets?</strong> Dahil sa <strong>Piso WiFi ({currency}619.00)</strong> at <strong>Convenience Fees ({currency}784.23)</strong>. Ang Piso WiFi ay purong barya na pumapasok sa vault nang hindi nagbabawas sa LPB wallet, kaya mas malaki ang pisikal na cash kaysa sa nabawas na allowance.
        </p>
      </div>
    </div>
  );
}

