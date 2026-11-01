'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/presentation/components/layout/Sidebar';
import { Header } from '@/presentation/components/layout/Header';
import { HeroTotalCard } from '@/presentation/components/dashboard/HeroTotalCard';
import { WalletBalanceCard } from '@/presentation/components/dashboard/WalletBalanceCard';
import { ServiceSummaryCards } from '@/presentation/components/dashboard/ServiceSummaryCards';
import { TransactionsTable } from '@/presentation/components/dashboard/TransactionsTable';
import { SettingsView } from '@/presentation/components/settings/SettingsView';
import { DepositedCollectionView } from '@/presentation/components/deposit/DepositedCollectionView';
import { WalletCashInView } from '@/presentation/components/wallet/WalletCashInView';
import { PersonalWithdrawalsView } from '@/presentation/components/financial/PersonalWithdrawalsView';
import { ImportModal } from '@/presentation/components/import/ImportModal';
import { MachineDashboardView } from '@/presentation/components/machine/MachineDashboardView';
import { EditTransactionModal } from '@/presentation/components/dashboard/EditTransactionModal';
import { PinLockScreen } from '@/presentation/components/auth/PinLockScreen';
import { Machine, FinancialSummary, Transaction } from '@/domain/types';

const defaultSummary: FinancialSummary = {
  totalGrossVolume: 0,
  totalInsertedCash: 0,
  totalWalletDeduction: 0,
  totalNetProfit: 0,
  totalTransactionsCount: 0,
  breakdown: {
    cashIn: { serviceType: 'CASH_IN', label: 'Cash In', volume: 0, netProfit: 0, cashInserted: 0, walletDeduction: 0, transactionCount: 0 },
    load: { serviceType: 'E_LOAD', label: 'Load', volume: 0, netProfit: 0, cashInserted: 0, walletDeduction: 0, transactionCount: 0 },
    bills: { serviceType: 'BILLS_PAYMENT', label: 'Bills', volume: 0, netProfit: 0, cashInserted: 0, walletDeduction: 0, transactionCount: 0 },
    pisoWifi: { serviceType: 'PISO_WIFI', label: 'Piso WiFi', volume: 0, netProfit: 0, cashInserted: 0, walletDeduction: 0, transactionCount: 0 },
  },
  reconciliation: {
    physicalCashToCollect: 0,
    walletReplenishmentNeeded: 0,
  },
  lastImportAt: null,
};

export default function App() {
  const [activeTab, setActiveTabState] = useState<string>('dashboard');

  // Security & Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);
  const [authRole, setAuthRole] = useState<string>('Owner');
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Inactivity timeout: 25 minutes (1,500,000 ms)
  const INACTIVITY_TIMEOUT_MS = 25 * 60 * 1000;

  // Check persisted session on initial client load
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('kc_auth_status');
      const lastActive = localStorage.getItem('kc_last_active');
      const savedRole = localStorage.getItem('kc_auth_role') || 'Owner';

      if (savedAuth === 'true' && lastActive) {
        const elapsed = Date.now() - parseInt(lastActive, 10);
        if (elapsed < INACTIVITY_TIMEOUT_MS) {
          setIsAuthenticated(true);
          setAuthRole(savedRole);
          localStorage.setItem('kc_last_active', Date.now().toString());
        } else {
          // Expired after 25 min inactivity
          setIsAuthenticated(false);
          setIsSessionExpired(true);
          localStorage.removeItem('kc_auth_status');
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [INACTIVITY_TIMEOUT_MS]);

  // Track user activity to reset 25-minute idle timer
  useEffect(() => {
    if (!isAuthenticated) return;

    const resetTimer = () => {
      localStorage.setItem('kc_last_active', Date.now().toString());
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    // Check periodically if 25 minutes elapsed without activity
    const interval = setInterval(() => {
      const lastActive = localStorage.getItem('kc_last_active');
      if (lastActive) {
        const elapsed = Date.now() - parseInt(lastActive, 10);
        if (elapsed >= INACTIVITY_TIMEOUT_MS) {
          setIsAuthenticated(false);
          setIsSessionExpired(true);
          localStorage.removeItem('kc_auth_status');
        }
      }
    }, 15000); // Check every 15 seconds

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      clearInterval(interval);
    };
  }, [isAuthenticated, INACTIVITY_TIMEOUT_MS]);

  const handleUnlock = (role: string) => {
    setIsAuthenticated(true);
    setIsSessionExpired(false);
    setAuthRole(role);
    localStorage.setItem('kc_auth_status', 'true');
    localStorage.setItem('kc_auth_role', role);
    localStorage.setItem('kc_last_active', Date.now().toString());
  };

  const handleManualLock = () => {
    setIsAuthenticated(false);
    setIsSessionExpired(false);
    localStorage.removeItem('kc_auth_status');
  };

  // Load persisted tab from URL search param or localStorage on initial client mount
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTab = urlParams.get('tab');
      const savedTab = localStorage.getItem('kiosk_central_active_tab');
      const initialTab = urlTab || savedTab;
      if (initialTab) {
        setActiveTabState(initialTab);
        if (!urlTab) {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('tab', initialTab);
          window.history.replaceState(null, '', currentUrl.toString());
        }
      }
    } catch {
      // Ignore in restricted environments
    }
  }, []);

  // Sync tab changes to URL and localStorage
  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('kiosk_central_active_tab', tab);
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', tab);
      window.history.replaceState(null, '', currentUrl.toString());
    } catch {
      // Ignore
    }
  }, []);

  // Support browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTab = urlParams.get('tab') || 'dashboard';
        setActiveTabState(urlTab);
      } catch {
        // Ignore
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [currency, setCurrency] = useState<string>('₱');
  const [summary, setSummary] = useState<FinancialSummary>(defaultSummary);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [timeRange, setTimeRange] = useState<string>('ALL');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [viewMetric, setViewMetric] = useState<'CASH' | 'PROFIT' | 'GROSS'>('CASH');
  const [selectedService, setSelectedService] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [transactionCategory, setTransactionCategory] = useState<string>('ALL');
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active machine if a machine page is selected
  const activeMachineId = activeTab.startsWith('machine_')
    ? activeTab.replace('machine_', '')
    : undefined;

  const currentMachine = machines.find((m) => m.id === activeMachineId);

  // Determine current Page Title for Header
  let pageTitle = 'Dashboard';
  if (currentMachine) {
    pageTitle = `${currentMachine.name} (Terminal Dashboard)`;
  } else if (activeTab === 'deposited_collection') {
    pageTitle = 'Deposited Collection & Handover';
  } else if (activeTab === 'wallet_cash_in') {
    pageTitle = 'Wallet Cash-In';
  } else if (activeTab === 'personal_withdrawals') {
    pageTitle = 'Personal Withdrawals';
  } else if (activeTab === 'settings') {
    pageTitle = 'Settings';
  }

  // Fetch machines list
  const fetchMachines = useCallback(async () => {
    try {
      const res = await fetch('/api/machines');
      if (res.ok) {
        const data = await res.json();
        setMachines(data);
      }
    } catch (e) {
      console.error('Failed to load machines', e);
    }
  }, []);

  // Fetch currency settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.currency) setCurrency(data.currency);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }, []);

  // Fetch financial summary
  const fetchSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeMachineId) params.append('machineId', activeMachineId);
      if (timeRange && timeRange !== 'ALL') params.append('timeRange', timeRange);
      if (timeRange === 'CUSTOM') {
        if (customStartDate) params.append('startDate', customStartDate);
        if (customEndDate) params.append('endDate', customEndDate);
      }

      const url = `/api/stats${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error('Failed to load stats', e);
    }
  }, [activeMachineId, timeRange, customStartDate, customEndDate]);

  // Fetch paginated transactions
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (activeMachineId) params.append('machineId', activeMachineId);
      if (selectedService !== 'ALL') params.append('serviceType', selectedService);
      if (transactionCategory && transactionCategory !== 'ALL') params.append('category', transactionCategory);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (timeRange && timeRange !== 'ALL') params.append('timeRange', timeRange);
      if (timeRange === 'CUSTOM') {
        if (customStartDate) params.append('startDate', customStartDate);
        if (customEndDate) params.append('endDate', customEndDate);
      }

      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTotalCount(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load transactions', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeMachineId, selectedService, transactionCategory, searchTerm, page, pageSize, timeRange, customStartDate, customEndDate]);

  // Client-side CSV export of currently filtered transaction records
  const handleExportCSV = useCallback(async () => {
    try {
      // Fetch all transactions matching current filters
      const params = new URLSearchParams({
        page: '1',
        pageSize: '10000',
      });
      if (activeMachineId) params.append('machineId', activeMachineId);
      if (selectedService !== 'ALL') params.append('serviceType', selectedService);
      if (transactionCategory && transactionCategory !== 'ALL') params.append('category', transactionCategory);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (timeRange && timeRange !== 'ALL') params.append('timeRange', timeRange);
      if (timeRange === 'CUSTOM') {
        if (customStartDate) params.append('startDate', customStartDate);
        if (customEndDate) params.append('endDate', customEndDate);
      }

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      const exportList: Transaction[] = data.transactions || transactions;

      if (exportList.length === 0) {
        alert('No transactions found to export.');
        return;
      }

      const headers = [
        'ID',
        'Date & Time',
        'Machine',
        'Service',
        'Reference No',
        'Account / Phone',
        'Customer',
        'Provider / Biller',
        'Amount',
        'Fee',
        'Cash in Vault',
        'Wallet Deduction',
        'Net Profit',
        'Status',
      ];

      const csvRows = exportList.map((t) => [
        `"${t.id}"`,
        `"${t.transactionTime}"`,
        `"${t.machineName || 'Main Vendo'}"`,
        `"${t.serviceType}"`,
        `"${t.referenceNo || ''}"`,
        `"${t.accountOrPhone || ''}"`,
        `"${t.customerName || ''}"`,
        `"${t.providerOrBiller || ''}"`,
        t.amount,
        t.fee,
        t.insertedAmount,
        t.walletDeduction,
        t.netProfit,
        `"${t.status}"`,
      ]);

      const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `kiosk_central_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to export transactions', e);
    }
  }, [activeMachineId, selectedService, searchTerm, timeRange, customStartDate, customEndDate, transactions]);

  useEffect(() => {
    fetchMachines();
    fetchSettings();
  }, [fetchMachines, fetchSettings]);

  useEffect(() => {
    fetchSummary();
    fetchTransactions();
  }, [fetchSummary, fetchTransactions]);

  const handleImportSuccess = () => {
    fetchSummary();
    fetchTransactions();
  };

  const isDashboardOrMachine = activeTab === 'dashboard' || activeTab.startsWith('machine_');

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar with Subtitle, Last Data Update Indicator, Machines List, Wallet Cash-In, and Settings */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setPage(1);
        }}
        machines={machines}
        onSelectMachinePage={(machineId) => {
          setActiveTab(`machine_${machineId}`);
          setPage(1);
        }}
        lastImportAt={summary.lastImportAt}
      />

      {/* Main Content Area: Independent Smooth Scroll */}
      <div className="flex flex-1 flex-col h-screen overflow-y-auto overflow-x-hidden">
        {/* Header without duplicate KIOSK CENTRAL brand, shows clean page title & Import button */}
        <Header
          pageTitle={pageTitle}
          onOpenImport={() => setIsImportOpen(true)}
          onLockSession={handleManualLock}
        />

        <main className="flex-1 py-6">
          <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
            {currentMachine ? (
              <MachineDashboardView
                machine={currentMachine}
                currency={currency}
                onRefreshParentSummary={fetchSummary}
              />
            ) : activeTab === 'dashboard' ? (
              <>
                {/* Twin Red Hero Cards: Symmetrical, Identical Height */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-stretch">
                  <div className="lg:col-span-7 flex flex-col">
                    <HeroTotalCard
                      summary={summary}
                      viewMetric={viewMetric}
                      onChangeViewMetric={setViewMetric}
                      selectedService={selectedService}
                      onSelectService={(svc) => {
                        setSelectedService(svc);
                        setPage(1);
                      }}
                      currency={currency}
                      timeRange={timeRange}
                      onChangeTimeRange={(range) => {
                        setTimeRange(range);
                        setPage(1);
                      }}
                      customStartDate={customStartDate}
                      customEndDate={customEndDate}
                      onCustomDateChange={(start, end) => {
                        setCustomStartDate(start);
                        setCustomEndDate(end);
                        setPage(1);
                      }}
                      onExport={handleExportCSV}
                      showCashInVault={false}
                    />
                  </div>
                  <div className="lg:col-span-5 flex flex-col">
                    <WalletBalanceCard
                      balance={summary.reconciliation.currentEstimatedWalletBalance ?? 0}
                      totalDeductions={summary.totalWalletDeduction}
                      personalDraws={summary.totalPersonalDraws}
                      currency={currency}
                      onGoToWalletCashIn={() => setActiveTab('wallet_cash_in')}
                    />
                  </div>
                </div>

                {/* 4-in-1 Services Breakdown Cards (Cash In, Load, Bills, Piso WiFi) */}
                <ServiceSummaryCards
                  summary={summary}
                  viewMetric={viewMetric}
                  selectedService={selectedService}
                  onFilterService={(svc) => {
                    setSelectedService(svc);
                    setPage(1);
                  }}
                  currency={currency}
                />

                {/* Transactions Table for consolidated view with integrated search */}
                <TransactionsTable
                  transactions={transactions}
                  total={totalCount}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  category={transactionCategory}
                  onCategoryChange={(cat) => {
                    setTransactionCategory(cat);
                    setPage(1);
                  }}
                  isLoading={isLoading}
                  currency={currency}
                  searchTerm={searchTerm}
                  onSearchChange={(val) => {
                    setSearchTerm(val);
                    setPage(1);
                  }}
                  onEditTransaction={(t) => setEditingTransaction(t)}
                />
              </>
            ) : activeTab === 'deposited_collection' ? (
              <DepositedCollectionView currency={currency} />
            ) : activeTab === 'wallet_cash_in' ? (
              <WalletCashInView
                totalWalletDeductions={summary.totalWalletDeduction}
                summary={summary}
              />
            ) : activeTab === 'personal_withdrawals' ? (
              <PersonalWithdrawalsView
                key={refreshKey}
                currency={currency}
                onEditTransaction={(t) => setEditingTransaction(t)}
              />
            ) : (
              <SettingsView
                machines={machines}
                onRefreshMachines={fetchMachines}
                currency={currency}
                onCurrencyChange={setCurrency}
              />
            )}
          </div>
        </main>
      </div>

      {/* Edit / Balance Transaction Modal */}
      <EditTransactionModal
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        currency={currency}
        onSuccess={() => {
          fetchSummary();
          fetchTransactions();
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Import & Ingestion Modal */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        machines={machines}
        selectedMachineId={activeMachineId || 'm1'}
        onSuccess={handleImportSuccess}
      />

      {/* PIN Code Security Lock Screen */}
      {!isAuthenticated && !isCheckingAuth && (
        <PinLockScreen
          onUnlock={handleUnlock}
          isSessionExpired={isSessionExpired}
        />
      )}
    </div>
  );
}
