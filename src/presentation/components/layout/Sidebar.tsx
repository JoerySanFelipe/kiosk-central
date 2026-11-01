'use client';

import React from 'react';
import Image from 'next/image';
import { LayoutDashboard, Settings, Server, Wallet, Clock, Building2, UserMinus, Scale } from 'lucide-react';
import { Machine } from '@/domain/types';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  machines: Machine[];
  selectedMachineId?: string;
  onSelectMachinePage: (machineId: string) => void;
  lastImportAt?: string | null;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  machines,
  selectedMachineId,
  onSelectMachinePage,
  lastImportAt,
}: SidebarProps) {
  const formatLastUpdate = (isoStr?: string | null) => {
    if (!isoStr) return 'No imports recorded';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <aside className="hidden sticky top-0 h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex z-30">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="relative h-9 w-9 overflow-hidden rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs shrink-0">
            <Image
              src="/logo.png"
              alt="Kiosk Central"
              width={36}
              height={36}
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <span className="block text-sm font-black tracking-wide text-slate-900 leading-tight">
              KIOSK CENTRAL
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Management Portal
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 space-y-4 px-3.5 py-3 overflow-y-auto">
        {/* Compact Last Data Update Indicator */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-[11px]">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-700">Updated:</span>
          </div>
          <span className="text-[11px] font-medium text-slate-500 truncate max-w-[120px]" title={lastImportAt || undefined}>
            {formatLastUpdate(lastImportAt)}
          </span>
        </div>

        {/* Overview Section */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Overview
          </div>
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#8A0000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className={`h-4 w-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-slate-400'}`} />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Dynamic Kiosk Machines Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <span>Kiosk Machines</span>
            {machines.length > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                {machines.length}
              </span>
            )}
          </div>
          {machines.map((m) => {
            const isMachineActive = activeTab === `machine_${m.id}`;
            return (
              <button
                key={m.id}
                onClick={() => onSelectMachinePage(m.id)}
                className={`flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                  isMachineActive
                    ? 'bg-[#8A0000] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                }`}
              >
                <Server className={`h-4 w-4 ${isMachineActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{m.name}</span>
              </button>
            );
          })}
        </div>

        {/* Financial Section */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Financial & Audit
          </div>
          <button
            onClick={() => onSelectTab('sales_audit')}
            className={`flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'sales_audit'
                ? 'bg-[#8A0000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
            }`}
          >
            <Scale className={`h-4 w-4 ${activeTab === 'sales_audit' ? 'text-white' : 'text-slate-400'}`} />
            <span>Sales Audit</span>
          </button>
          <button
            onClick={() => onSelectTab('deposited_collection')}
            className={`flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'deposited_collection'
                ? 'bg-[#8A0000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
            }`}
          >
            <Building2 className={`h-4 w-4 ${activeTab === 'deposited_collection' ? 'text-white' : 'text-slate-400'}`} />
            <span>Deposited Collection</span>
          </button>
          <button
            onClick={() => onSelectTab('wallet_cash_in')}
            className={`flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'wallet_cash_in'
                ? 'bg-[#8A0000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
            }`}
          >
            <Wallet className={`h-4 w-4 ${activeTab === 'wallet_cash_in' ? 'text-white' : 'text-slate-400'}`} />
            <span>Wallet Cash-In</span>
          </button>
          <button
            onClick={() => onSelectTab('personal_withdrawals')}
            className={`flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'personal_withdrawals'
                ? 'bg-[#8A0000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
            }`}
          >
            <UserMinus className={`h-4 w-4 ${activeTab === 'personal_withdrawals' ? 'text-white' : 'text-slate-400'}`} />
            <span>Personal Withdrawals</span>
          </button>
        </div>

        {/* System Section */}
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            System
          </div>
          <button
            onClick={() => onSelectTab('settings')}
            className={`flex w-full items-center space-x-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#8A0000] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
            }`}
          >
            <Settings className={`h-4 w-4 ${activeTab === 'settings' ? 'text-white' : 'text-slate-400'}`} />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
