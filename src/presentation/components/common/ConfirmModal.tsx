'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, Check, X, Loader2, Save } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'Please confirm to proceed with this action.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmModalProps) {
  // ESC key support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const isPrimary = variant === 'primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center space-x-3.5">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                isDanger
                  ? 'bg-rose-50 text-rose-600 border border-rose-100'
                  : isPrimary
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}
            >
              {isDanger ? (
                <Trash2 className="h-5 w-5" />
              ) : isPrimary ? (
                <Save className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {title}
              </h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2.5 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-98 transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`flex items-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm active:scale-98 transition-all disabled:opacity-60 cursor-pointer ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700'
                : isPrimary
                ? 'bg-[#8A0000] hover:bg-[#730000]'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {isDanger ? <Trash2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

