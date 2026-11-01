'use client';

import React, { useState, useEffect } from 'react';
import { Server, Coins, Plus, Edit2, CheckCircle, Save, X, ShieldCheck, KeyRound, Trash2, Download, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { Machine } from '@/domain/types';
import { ConfirmModal } from '@/presentation/components/common/ConfirmModal';

interface SettingsViewProps {
  machines: Machine[];
  onRefreshMachines: () => void;
  currency: string;
  onCurrencyChange: (newCurrency: string) => void;
}

export function SettingsView({
  machines,
  onRefreshMachines,
  currency,
  onCurrencyChange,
}: SettingsViewProps) {
  // Add Machine form state
  const [newMachineName, setNewMachineName] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [newMachineLocation, setNewMachineLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Machine state
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Currency state
  const [selectedCurrency, setSelectedCurrency] = useState(currency || '₱');
  const [currencySaveSuccess, setCurrencySaveSuccess] = useState(false);

  // Security & Access PINs state
  const [pins, setPins] = useState<Array<{ id: string; label: string; isActive: boolean; createdAt: string }>>([]);
  const [isLoadingPins, setIsLoadingPins] = useState(false);
  const [newPinLabel, setNewPinLabel] = useState('');
  const [newPinCode, setNewPinCode] = useState('');
  const [confirmPinCode, setConfirmPinCode] = useState('');
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [pinToDelete, setPinToDelete] = useState<{ id: string; label: string } | null>(null);
  const [isDeletingPin, setIsDeletingPin] = useState(false);

  const fetchPins = async () => {
    setIsLoadingPins(true);
    try {
      const res = await fetch('/api/auth/pins');
      if (res.ok) {
        const data = await res.json();
        setPins(data.pins || []);
      }
    } catch (e) {
      console.error('Failed to load pins', e);
    } finally {
      setIsLoadingPins(false);
    }
  };

  useEffect(() => {
    fetchPins();
  }, []);

  const handleAddPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(null);

    if (!newPinLabel.trim()) {
      setPinError('Please enter a role or label for this PIN (e.g. Staff Cashier).');
      return;
    }

    if (newPinCode.length < 4 || newPinCode.length > 8 || !/^\d+$/.test(newPinCode)) {
      setPinError('PIN code must be between 4 and 8 numeric digits.');
      return;
    }

    if (newPinCode !== confirmPinCode) {
      setPinError('PIN codes do not match.');
      return;
    }

    setIsAddingPin(true);
    try {
      const res = await fetch('/api/auth/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newPinLabel.trim(), pin: newPinCode.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPinSuccess(`New PIN for "${newPinLabel.trim()}" created successfully!`);
        setNewPinLabel('');
        setNewPinCode('');
        setConfirmPinCode('');
        fetchPins();
      } else {
        setPinError(data.error || 'Failed to create PIN');
      }
    } catch {
      setPinError('Network error while creating PIN');
    } finally {
      setIsAddingPin(false);
    }
  };

  const handleTogglePin = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/auth/pins/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        fetchPins();
      }
    } catch (e) {
      console.error('Failed to toggle pin', e);
    }
  };

  const handleConfirmDeletePin = async () => {
    if (!pinToDelete) return;
    setIsDeletingPin(true);
    try {
      const res = await fetch(`/api/auth/pins/${pinToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPinToDelete(null);
        fetchPins();
      } else {
        alert(data.error || 'Failed to delete PIN');
      }
    } catch {
      alert('Error deleting PIN');
    } finally {
      setIsDeletingPin(false);
    }
  };

  useEffect(() => {
    setSelectedCurrency(currency);
  }, [currency]);

  const handleStartEdit = (m: Machine) => {
    setEditingMachineId(m.id);
    setEditName(m.name);
    setEditContact(m.contactNumber || '');
    setEditLocation(m.location || '');
  };

  const handleCancelEdit = () => {
    setEditingMachineId(null);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;

    setIsUpdating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/machines', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: editName.trim(),
          contactNumber: editContact.trim() || undefined,
          location: editLocation.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update machine details');
      }

      setEditingMachineId(null);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      onRefreshMachines();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error updating machine');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachineName.trim()) return;

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMachineName.trim(),
          contactNumber: newContactNumber.trim() || undefined,
          location: newMachineLocation.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create machine');
      }

      setNewMachineName('');
      setNewContactNumber('');
      setNewMachineLocation('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefreshMachines();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error adding machine');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCurrency = async (sym: string) => {
    setSelectedCurrency(sym);
    onCurrencyChange(sym);

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: sym }),
      });
      setCurrencySaveSuccess(true);
      setTimeout(() => setCurrencySaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save currency', e);
    }
  };

  const currencyOptions = [
    { label: 'Philippine Peso', symbol: '₱' },
    { label: 'US Dollar', symbol: '$' },
    { label: 'Euro', symbol: '€' },
    { label: 'British Pound', symbol: '£' },
    { label: 'Japanese Yen', symbol: '¥' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Settings
        </h2>
        <p className="text-xs text-slate-500">
          Manage kiosk terminals, contact information, and currency preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: Machine Terminals Management */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#8A0000]">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Kiosk Terminals
              </h3>
              <p className="text-xs text-slate-500">
                View and edit machine details, contacts, and branch locations
              </p>
            </div>
          </div>

          {updateSuccess && (
            <div className="mt-3 flex items-center space-x-1.5 text-xs text-emerald-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <CheckCircle className="h-4 w-4" />
              <span>Machine updated successfully! Side nav refreshed.</span>
            </div>
          )}

          {/* Machine List */}
          <div className="mt-4 space-y-3">
            {machines.map((m) => {
              const isEditing = editingMachineId === m.id;

              if (isEditing) {
                return (
                  <div
                    key={m.id}
                    className="rounded-xl border-2 border-[#8A0000]/30 bg-rose-50/10 p-4 space-y-3"
                  >
                    <div className="text-xs font-bold text-[#8A0000]">
                      Edit Machine Details:
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">
                          Machine Name *
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Machine Name"
                          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold focus:border-[#8A0000] focus:outline-none"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase">
                            Contact Number
                          </label>
                          <input
                            type="text"
                            value={editContact}
                            onChange={(e) => setEditContact(e.target.value)}
                            placeholder="e.g. 09171234567"
                            className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-[#8A0000] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase">
                            Location
                          </label>
                          <input
                            type="text"
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                            placeholder="e.g. Market Branch"
                            className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs focus:border-[#8A0000] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isUpdating || !editName.trim()}
                        onClick={() => handleSaveEdit(m.id)}
                        className="flex items-center space-x-1.5 rounded-lg bg-[#8A0000] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#730000] disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      {m.name} {m.isDefault ? '(Default)' : ''}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Contact: <span className="font-medium text-slate-700">{m.contactNumber || 'None'}</span> | Location: <span className="font-medium text-slate-700">{m.location || 'Not set'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleStartEdit(m)}
                    className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:border-[#8A0000] hover:text-[#8A0000]"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add New Machine Form */}
          <form onSubmit={handleAddMachine} className="mt-5 border-t border-slate-100 pt-4 space-y-3">
            <div className="text-xs font-bold text-slate-700">
              Add New Machine Terminal
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Machine Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vendo 3"
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-[#8A0000] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Contact Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 09170000000"
                  value={newContactNumber}
                  onChange={(e) => setNewContactNumber(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-[#8A0000] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plaza Branch"
                  value={newMachineLocation}
                  onChange={(e) => setNewMachineLocation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-[#8A0000] focus:outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-xs text-rose-600">{errorMsg}</div>
            )}
            {saveSuccess && (
              <div className="flex items-center space-x-1 text-xs text-emerald-600">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Machine added successfully! Appears in side nav.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving || !newMachineName.trim()}
              className="flex items-center space-x-1.5 rounded-xl bg-[#8A0000] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[#730000] disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Saving...' : 'Add Machine'}</span>
            </button>
          </form>
        </div>

        {/* Card 2: Currency Format Configuration */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#8A0000]">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Currency Format
              </h3>
              <p className="text-xs text-slate-500">
                Select the currency symbol used across all financial summaries
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="text-xs font-bold text-slate-700">
              Select Active Currency:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currencyOptions.map((opt) => {
                const isSelected = selectedCurrency === opt.symbol;
                return (
                  <button
                    key={opt.symbol}
                    type="button"
                    onClick={() => handleSaveCurrency(opt.symbol)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[#8A0000] bg-rose-50/20 ring-1 ring-[#8A0000]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Symbol: <span className="font-bold text-slate-800">{opt.symbol}</span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-[#8A0000]">
                      {opt.symbol}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Currency Symbol input */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Custom Currency Symbol:
              </label>
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type="text"
                  maxLength={5}
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  placeholder="e.g. ₱, $, €"
                  className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-bold focus:border-[#8A0000] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleSaveCurrency(selectedCurrency)}
                  className="rounded-xl bg-[#8A0000] px-4 py-2 text-xs font-semibold text-white hover:bg-[#730000]"
                >
                  Apply Symbol
                </button>
              </div>
            </div>

            {currencySaveSuccess && (
              <div className="flex items-center space-x-1.5 text-xs text-emerald-600">
                <CheckCircle className="h-4 w-4" />
                <span>Currency format updated successfully across all views!</span>
              </div>
            )}

            {/* Live Preview Box */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Live Display Preview
              </div>
              <div className="mt-1 flex items-baseline space-x-1.5">
                <span className="text-sm font-bold text-slate-500">{selectedCurrency}</span>
                <span className="text-2xl font-extrabold text-slate-900">
                  86,534.53
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                All sales cards, vault counters, and transaction fees reflect this format.
              </p>
            </div>
          </div>
        </div>

        {/* Security & Access PINs Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Security & Access PIN Codes
                </h3>
                <p className="text-xs text-slate-500">
                  Manage authorized series of PIN codes to access the system and handle auto-lock
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center space-x-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <span>25-Min Inactivity Auto-Lock Active</span>
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* PIN List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Active Access PINs ({pins.length})
                </span>
                <button
                  type="button"
                  onClick={fetchPins}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center space-x-1"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingPins ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-slate-50/30">
                {pins.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <KeyRound className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                          <span>{p.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {p.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          ID: {p.id} • Created {new Date(p.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePin(p.id, p.isActive)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-colors ${
                          p.isActive
                            ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPinToDelete({ id: p.id, label: p.label })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete PIN"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New PIN Form */}
            <form onSubmit={handleAddPin} className="rounded-xl border border-rose-100 bg-rose-50/20 p-5 space-y-4">
              <div className="flex items-center space-x-2 text-rose-950 font-bold text-xs uppercase tracking-wide">
                <Plus className="h-4 w-4 text-[#8A0000]" />
                <span>Add Series / New Access PIN</span>
              </div>

              {pinError && (
                <div className="flex items-center space-x-2 text-xs text-rose-700 bg-rose-100/70 p-2.5 rounded-lg font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              {pinSuccess && (
                <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-100/70 p-2.5 rounded-lg font-medium">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{pinSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    Role / Label:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Staff Cashier"
                    value={newPinLabel}
                    onChange={(e) => setNewPinLabel(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-[#8A0000] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    PIN Code (4-8 Digits):
                  </label>
                  <input
                    type="password"
                    maxLength={8}
                    required
                    placeholder="••••"
                    value={newPinCode}
                    onChange={(e) => setNewPinCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono tracking-widest focus:border-[#8A0000] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase">
                    Confirm PIN:
                  </label>
                  <input
                    type="password"
                    maxLength={8}
                    required
                    placeholder="••••"
                    value={confirmPinCode}
                    onChange={(e) => setConfirmPinCode(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono tracking-widest focus:border-[#8A0000] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isAddingPin}
                  className="flex items-center space-x-2 rounded-xl bg-[#8A0000] px-4 py-2 text-xs font-bold text-white hover:bg-[#730000] disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isAddingPin ? 'Creating PIN...' : 'Save New PIN'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Database & Production Backup Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 p-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-800">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Database & Production Backup
                </h3>
                <p className="text-xs text-slate-500">
                  Export snapshot of your complete Cloud Firestore database for offline safekeeping
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Cloud Firestore Snapshot (.json)
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Contains all 100% reconciled transactions, cash harvests, and bank deposit records.
              </div>
            </div>

            <a
              href="/api/settings/backup"
              download
              className="inline-flex items-center justify-center space-x-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Download Database Backup</span>
            </a>
          </div>
        </div>
      </div>

      {/* Reusable Confirm Delete PIN Modal */}
      <ConfirmModal
        isOpen={!!pinToDelete}
        onClose={() => setPinToDelete(null)}
        onConfirm={handleConfirmDeletePin}
        title="Delete Access PIN?"
        message={`Are you sure you want to delete the PIN code for "${pinToDelete?.label}"? Personnel using this PIN will no longer be able to unlock the system.`}
        confirmLabel="Yes, Delete PIN"
        cancelLabel="Keep PIN"
        variant="danger"
        isLoading={isDeletingPin}
      />
    </div>
  );
}
