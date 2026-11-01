'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';

interface ExportDropdownProps {
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExportingExcel?: boolean;
  isExportingPdf?: boolean;
}

export function ExportDropdown({
  onExportExcel,
  onExportPdf,
  isExportingExcel = false,
  isExportingPdf = false,
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isBusy = isExportingExcel || isExportingPdf;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isBusy}
        className="flex items-center space-x-1 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700 transition-colors shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
        title="Export Reports"
      >
        {isBusy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8A0000]" />
        ) : (
          <Download className="h-3.5 w-3.5 text-slate-600" />
        )}
        <span>{isExportingExcel ? 'Excel...' : isExportingPdf ? 'PDF...' : 'Export'}</span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-0.5">
            Format
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onExportExcel();
            }}
            disabled={isBusy}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onExportPdf();
            }}
            disabled={isBusy}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-[#8A0000] transition-colors cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5 text-[#8A0000] shrink-0" />
            <span>PDF (.pdf)</span>
          </button>
        </div>
      )}
    </div>
  );
}
