'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Image as ImageIcon, Trash2, Loader2, CheckCircle2, Clipboard } from 'lucide-react';

interface ImageDropzoneProps {
  value?: string;
  onChange: (url: string) => void;
  onClear?: () => void;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export function ImageDropzone({
  value,
  onChange,
  onClear,
  label = 'Attached Slip / Receipt Image',
  helperText = 'Click, drag & drop, or paste (Ctrl+V) image here',
  disabled = false,
  className = '',
}: ImageDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (disabled || isUploading) return;
      if (!file.type.startsWith('image/')) {
        setUploadError('Please provide a valid image file (PNG, JPG, WebP, etc.)');
        return;
      }

      // Max 10MB check
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('Image size exceeds 10MB limit.');
        return;
      }

      setIsUploading(true);
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to upload image');
        }

        const data = await res.json();
        if (data.url) {
          onChange(data.url);
        } else {
          throw new Error('Upload server did not return image URL');
        }
      } catch (err: unknown) {
        console.error('Image upload failed:', err);
        setUploadError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [disabled, isUploading, onChange]
  );

  // Global window paste listener: allows pressing Ctrl+V anywhere in the active context
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled || isUploading) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            uploadFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [disabled, isUploading, uploadFile]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
    // reset input so the same file can be re-selected if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearImage = () => {
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
    setUploadError(null);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            {label}
          </label>
          <span className="text-[10px] text-slate-400 font-medium">Drag, drop, or Ctrl+V</span>
        </div>
      )}

      {uploadError && (
        <div className="text-[11px] font-medium text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
          {uploadError}
        </div>
      )}

      {value ? (
        /* Image Preview Box */
        <div className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Uploaded receipt or slip"
              className="h-14 w-14 object-cover rounded-xl border border-slate-200 shadow-2xs bg-white shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(value, '_blank')}
              title="Click to view full image in new tab"
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-900 truncate">Image Attached</span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate font-mono mt-0.5">
                {value.split('/').pop()}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleClearImage}
              disabled={disabled || isUploading}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
              title="Remove attached image"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty Dropzone Box */
        <div
          ref={dropzoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          tabIndex={0}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 transition-all cursor-pointer select-none text-center ${
            isDragOver
              ? 'border-[#8A0000] bg-rose-50/70 ring-2 ring-[#8A0000]/20 scale-[1.01]'
              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 hover:border-slate-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center py-1 space-y-1.5">
              <Loader2 className="h-6 w-6 text-[#8A0000] animate-spin" />
              <span className="text-xs font-bold text-slate-800">Uploading image...</span>
              <span className="text-[10px] text-slate-400">Processing file attachment</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 shadow-2xs">
                {isDragOver ? (
                  <Upload className="h-4 w-4 text-[#8A0000] animate-bounce" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-slate-500" />
                )}
              </div>
              <p className="text-xs font-bold text-slate-800 pt-0.5">
                {isDragOver ? 'Release to upload image' : helperText}
              </p>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                <span>PNG, JPG, WebP up to 10MB</span>
                <span>•</span>
                <span className="inline-flex items-center space-x-0.5 font-medium text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200/80">
                  <Clipboard className="h-2.5 w-2.5 text-slate-400" />
                  <span>Ctrl + V</span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        disabled={disabled || isUploading}
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}

