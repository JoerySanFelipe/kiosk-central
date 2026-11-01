'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Lock, Delete, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface PinLockScreenProps {
  onUnlock: (label: string) => void;
  isSessionExpired?: boolean;
}

export function PinLockScreen({ onUnlock, isSessionExpired = false }: PinLockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isShake, setIsShake] = useState<boolean>(false);

  const handleSubmit = useCallback(async (codeToSubmit: string) => {
    if (codeToSubmit.length < 4 || isVerifying) return;

    setIsVerifying(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: codeToSubmit }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onUnlock(data.label || 'Authorized User');
      } else {
        setError(data.error || 'Incorrect PIN code');
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
        setPin('');
      }
    } catch {
      setError('Connection error. Please try again.');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, onUnlock]);

  const handleDigit = useCallback((digit: string) => {
    if (isVerifying) return;
    setError(null);
    setPin((prev) => {
      if (prev.length >= 8) return prev;
      const next = prev + digit;
      // Auto-submit when exactly 4 digits are entered if 4 is common, or let user type up to 6
      if (next.length === 4) {
        setTimeout(() => handleSubmit(next), 100);
      }
      return next;
    });
  }, [isVerifying, handleSubmit]);

  const handleBackspace = useCallback(() => {
    if (isVerifying) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, [isVerifying]);

  const handleClear = useCallback(() => {
    if (isVerifying) return;
    setError(null);
    setPin('');
  }, [isVerifying]);

  // Physical keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      } else if (e.key === 'Enter') {
        if (pin.length >= 4) {
          handleSubmit(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, handleDigit, handleBackspace, handleClear, handleSubmit]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4 select-none animate-in fade-in duration-300">
      <div
        className={`w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/90 p-7 shadow-2xl transition-transform ${
          isShake ? 'animate-shake' : ''
        }`}
      >
        {/* Logo & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-2 border-slate-700/80 bg-white p-1.5 shadow-lg">
            <Image
              src="/logo.png"
              alt="Kiosk Central Logo"
              width={80}
              height={80}
              priority
              className="h-full w-full object-contain"
            />
          </div>

          <h2 className="mt-4 text-lg font-black tracking-wider text-white uppercase">
            KIOSK CENTRAL
          </h2>

          <p className="mt-1 text-xs text-slate-400 font-medium">
            {isSessionExpired
              ? 'Session locked after 25 min inactivity'
              : 'Authorized Personnel Access Only'}
          </p>
        </div>

        {/* PIN Dots Indicator */}
        <div className="mt-6 flex flex-col items-center">
          <div className="flex items-center space-x-3 h-8">
            {isVerifying ? (
              <div className="flex items-center space-x-2 text-rose-500 font-bold text-xs tracking-wide">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </div>
            ) : (
              [0, 1, 2, 3].map((index) => {
                const filled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
                      filled
                        ? 'scale-110 bg-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.8)]'
                        : 'border-2 border-slate-700 bg-slate-800/80'
                    }`}
                  />
                );
              })
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-2.5 flex items-center space-x-1.5 text-xs font-semibold text-rose-400 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Keypad Grid */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isVerifying}
              onClick={() => handleDigit(digit)}
              className="flex h-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-800/60 text-xl font-bold text-white shadow-sm transition-all hover:bg-slate-700/80 hover:scale-105 active:scale-95 active:bg-rose-950/40 disabled:opacity-50 cursor-pointer"
            >
              {digit}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            disabled={isVerifying || pin.length === 0}
            onClick={handleClear}
            className="flex h-14 items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/40 text-xs font-bold uppercase tracking-wider text-slate-400 transition-all hover:bg-slate-800 hover:text-white active:scale-95 disabled:opacity-30 cursor-pointer"
          >
            Clear
          </button>

          {/* Digit 0 */}
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleDigit('0')}
            className="flex h-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-800/60 text-xl font-bold text-white shadow-sm transition-all hover:bg-slate-700/80 hover:scale-105 active:scale-95 active:bg-rose-950/40 disabled:opacity-50 cursor-pointer"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            disabled={isVerifying || pin.length === 0}
            onClick={handleBackspace}
            className="flex h-14 items-center justify-center rounded-2xl border border-slate-800/60 bg-slate-900/40 text-slate-300 transition-all hover:bg-slate-800 hover:text-rose-400 active:scale-95 disabled:opacity-30 cursor-pointer"
            title="Backspace"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>


      </div>
    </div>
  );
}

