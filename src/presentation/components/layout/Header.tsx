'use client';

import React from 'react';
import { UploadCloud, Lock } from 'lucide-react';

interface HeaderProps {
  pageTitle?: string;
  onOpenImport: () => void;
  onLockSession?: () => void;
}

export function Header({ pageTitle = 'Dashboard', onOpenImport, onLockSession }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Current Page Title / Breadcrumb */}
        <div className="flex items-center space-x-2.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
            Portal /
          </span>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
            {pageTitle}
          </h2>
        </div>

        {/* Action: Import Files Button & Lock Button */}
        <div className="flex items-center space-x-2.5">
          {onLockSession && (
            <button
              onClick={onLockSession}
              className="flex h-9 items-center space-x-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title="Lock Screen Now"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          )}

          <button
            onClick={onOpenImport}
            className="flex h-9 items-center space-x-2 rounded-xl bg-[#8A0000] px-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#730000] active:scale-98 cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Import Data</span>
          </button>
        </div>
      </div>
    </header>
  );
}
