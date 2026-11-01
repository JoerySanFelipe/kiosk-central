'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface TimelineDropdownProps {
  activePreset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'CUSTOM';
  startDateTime: string;
  endDateTime: string;
  onSelectPreset: (preset: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS') => void;
  onClear: () => void;
  onCustomChange: (start: string, end: string) => void;
}

export function TimelineDropdown({
  activePreset,
  startDateTime,
  endDateTime,
  onSelectPreset,
  onClear,
  onCustomChange,
}: TimelineDropdownProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(startDateTime);
  const [localTo, setLocalTo] = useState(endDateTime);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync inputs with parent state
  useEffect(() => {
    setLocalFrom(startDateTime);
    setLocalTo(endDateTime);
  }, [startDateTime, endDateTime]);

  // Click outside listener for custom date popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCustomOpen(false);
      }
    };
    if (isCustomOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCustomOpen]);

  const isFiltered = Boolean(startDateTime || endDateTime);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'CUSTOM') {
      setIsCustomOpen(true);
    } else if (val === 'ALL') {
      setIsCustomOpen(false);
      onClear();
    } else {
      setIsCustomOpen(false);
      onSelectPreset(val as 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS');
    }
  };

  const handleApplyCustom = () => {
    onCustomChange(localFrom, localTo);
    setIsCustomOpen(false);
  };

  const handleReset = () => {
    onClear();
    setIsCustomOpen(false);
  };

  const currentSelectValue = isFiltered
    ? activePreset === 'TODAY' || activePreset === 'YESTERDAY' || activePreset === 'LAST_7_DAYS'
      ? activePreset
      : 'CUSTOM'
    : 'ALL';

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* Native-style pill matching Category, View, Show dropdowns */}
      <div
        className={`flex items-center space-x-1 rounded-xl border px-2 py-1 transition-all ${
          isFiltered
            ? 'border-[#8A0000]/40 bg-rose-50/70 text-[#8A0000]'
            : 'border-slate-200 bg-slate-50/80 text-slate-700'
        }`}
      >
        <span className="text-[11px] font-semibold text-slate-500">Timeline:</span>
        <select
          value={currentSelectValue}
          onChange={handleSelectChange}
          className="rounded-lg bg-transparent px-0.5 py-0.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Time</option>
          <option value="TODAY">Today</option>
          <option value="YESTERDAY">Yesterday</option>
          <option value="LAST_7_DAYS">Last 7 Days</option>
          <option value="CUSTOM">Custom...</option>
        </select>

        {/* Small indicator dot when filter is active */}
        {isFiltered && (
          <button
            type="button"
            onClick={() => setIsCustomOpen((prev) => !prev)}
            className="text-[#8A0000] hover:text-[#700000] cursor-pointer ml-0.5"
            title="Edit Custom Date & Time"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block animate-pulse" />
          </button>
        )}
      </div>

      {/* Lightweight popover for Custom Date & Time Range */}
      {isCustomOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-68 rounded-xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
            <span className="text-xs font-bold text-slate-800">Custom Date & Time</span>
            <button
              type="button"
              onClick={() => setIsCustomOpen(false)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">From:</label>
              <input
                type="datetime-local"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-900 shadow-2xs focus:border-[#8A0000] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">To:</label>
              <input
                type="datetime-local"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-900 shadow-2xs focus:border-[#8A0000] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
            >
              Reset to All
            </button>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setIsCustomOpen(false)}
                className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleApplyCustom}
                disabled={!localFrom && !localTo}
                className="rounded-lg bg-[#8A0000] hover:bg-[#700000] text-white px-2.5 py-1 text-[11px] font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
