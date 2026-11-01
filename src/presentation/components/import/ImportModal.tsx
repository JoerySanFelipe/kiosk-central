'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Machine } from '@/domain/types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  selectedMachineId: string;
  onSuccess: () => void;
}

interface IngestionReport {
  summary: {
    total: number;
    inserted: number;
    updated: number;
    skipped: number;
  };
  files: Array<{
    fileName: string;
    detectedService: string;
    total: number;
    inserted: number;
    updated: number;
    skipped: number;
  }>;
}

export function ImportModal({
  isOpen,
  onClose,
  machines,
  selectedMachineId,
  onSuccess,
}: ImportModalProps) {
  const [machineId, setMachineId] = useState(
    selectedMachineId === 'ALL' ? (machines[0]?.id || 'm1') : selectedMachineId
  );
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [report, setReport] = useState<IngestionReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const dropped = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...dropped]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);
    setReport(null);

    const formData = new FormData();
    formData.append('machineId', machineId);
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setReport(data);
      setFiles([]);
      onSuccess();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unknown error during upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between bg-[#8A0000] px-6 py-4 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <UploadCloud className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Import Transaction Files</h2>
              <p className="text-xs text-white/80">
                Piso WiFi CSV, Cash In, Load, & Bills Payment Excel (.xlsx)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Machine Assignment Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Select Destination Kiosk Machine:
            </label>
            <select
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-colors focus:border-[#8A0000] focus:ring-1 focus:ring-[#8A0000] focus:outline-none"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.location ? `(${m.location})` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              *Transactions will be attributed to this machine for cash box tracking. Digital wallet balance is pooled centrally.
            </p>
          </div>

          {/* File Dropzone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Drop or Select Files (Multiple files supported):
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center transition-colors hover:border-[#8A0000] hover:bg-rose-50/20"
            >
              <FileSpreadsheet className="h-10 w-10 text-slate-400" />
              <div className="mt-2 text-xs font-semibold text-slate-700">
                Click to browse or drag and drop files here
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                Accepts .xlsx (LPB Kiosk) and .csv (Piso WiFi)
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* File Queue List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">
                Queued Files ({files.length}):
              </div>
              <div className="max-h-36 space-y-1.5 overflow-y-auto">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileSpreadsheet className="h-4 w-4 text-[#8A0000] shrink-0" />
                      <span className="truncate font-medium text-slate-800">
                        {f.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        ({(f.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Notice */}
          {errorMessage && (
            <div className="flex items-center space-x-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Ingestion Report / Audit Log */}
          {report && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Files Successfully Processed!</span>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white p-2 shadow-xs">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Newly Added</div>
                  <div className="text-base font-extrabold text-emerald-700">
                    +{report.summary.inserted}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-2 shadow-xs">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Skipped (Duplicate)</div>
                  <div className="text-base font-extrabold text-slate-600">
                    {report.summary.skipped}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-2 shadow-xs">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Processed</div>
                  <div className="text-base font-extrabold text-slate-900">
                    {report.summary.total}
                  </div>
                </div>
              </div>
              <div className="mt-2.5 flex items-center space-x-1.5 text-[11px] text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>100% Protected against double-counting. Sales data preserved.</span>
              </div>
            </div>
          )}

          {/* Deduplication Guarantee Badge */}
          <div className="flex items-start space-x-2 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 border border-slate-200">
            <ShieldCheck className="h-4 w-4 text-[#8A0000] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">Idempotency Guarantee:</span> Repeatedly importing identical transaction histories will never double-count your revenue.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {report ? 'Done' : 'Cancel'}
          </button>

          {files.length > 0 && !report && (
            <button
              disabled={isUploading}
              onClick={handleUpload}
              className="flex items-center space-x-2 rounded-xl bg-[#8A0000] px-5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#730000] disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>Process {files.length} Files</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
