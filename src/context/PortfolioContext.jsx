import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getSchemeDetails } from '../api/mfApi.js';
import {
  initDB,
  saveTransactionsToDB,
  getTransactionsFromDB,
  saveAccountsToDB,
  getAccountsFromDB,
  saveFDsToDB,
  getFDsFromDB,
  saveRDsToDB,
  getRDsFromDB,
  saveInsurancesToDB,
  getInsurancesFromDB
} from '../api/db.js';
import {
  calculateHoldings,
  calculatePortfolioSummary,
  calculateAMCBreakdown
} from '../utils/calculations.js';
import { get15DayAlertStatus } from '../utils/interestUtils.js';

const PortfolioContext = createContext(null);

const INITIAL_ACCOUNTS = [
  { id: 'acc_all', name: 'All Accounts (Combined)', broker: 'Multi-Broker', isDefault: false },
  { id: 'acc_groww', name: 'Groww Portfolio', broker: 'Groww', isDefault: true },
  { id: 'acc_zerodha', name: 'Zerodha Coin', broker: 'Zerodha', isDefault: false },
  { id: 'acc_hdfc', name: 'HDFC Bank & Demat', broker: 'HDFC Bank', isDefault: false }
];

const INITIAL_SAMPLE_TRANSACTIONS = [
  {
    id: 'tx_sbi_1',
    accountId: 'acc_groww',
    schemeCode: 125497,
    schemeName: 'SBI SMALL CAP FUND - Direct Plan - Growth',
    type: 'BUY',
    date: '15-01-2024',
    nav: 154.20,
    amount: 50000,
    units: 324.254,
    notes: 'Dip Buy - Small Cap correction'
  },
  {
    id: 'tx_ppfc_1',
    accountId: 'acc_zerodha',
    schemeCode: 122639,
    schemeName: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
    type: 'BUY',
    date: '10-02-2024',
    nav: 62.40,
    amount: 100000,
    units: 1602.564,
    notes: 'Core Equity allocation'
  }
];

const INITIAL_FDS = [
  {
    id: 'fd_1',
    accountId: 'acc_hdfc',
    bankName: 'HDFC Bank',
    title: '3-Year Tax Saver FD',
    principalAmount: 200000,
    interestRate: 7.25,
    tenureMonths: 36,
    startDate: '2023-09-01',
    maturityDate: '2026-09-01',
    maturityAmount: 247800,
    notes: 'Section 80C Tax Saving FD'
  },
  {
    id: 'fd_2',
    accountId: 'acc_hdfc',
    bankName: 'ICICI Bank',
    title: 'Short Term Wealth FD',
    principalAmount: 100000,
    interestRate: 6.9,
    tenureMonths: 12,
    startDate: '2025-08-30',
    maturityDate: '2026-08-30', // Maturing in 5 days!
    maturityAmount: 107080,
    notes: 'Maturing soon - 15-day alert test'
  }
];

const INITIAL_RDS = [
  {
    id: 'rd_1',
    accountId: 'acc_hdfc',
    bankName: 'State Bank of India',
    title: 'SBI Wealth Builder RD',
    monthlyInstallment: 10000,
    interestRate: 6.8,
    tenureMonths: 24,
    startDate: '2024-03-01',
    maturityDate: '2026-03-01',
    totalDeposited: 180000,
    maturityAmount: 258400,
    notes: 'Monthly auto-debit on 1st'
  }
];

const INITIAL_INSURANCES = [
  {
    id: 'ins_1',
    accountId: 'acc_groww',
    policyName: 'HDFC Ergo Optima Secure',
    provider: 'HDFC Ergo',
    policyType: 'Health',
    policyNumber: 'HE-902184-B',
    sumAssured: 1000000,
    premiumAmount: 14500,
    premiumFrequency: 'Yearly',
    nextDueDate: '2026-09-05', // Due in 11 days!
    notes: 'Family Floater 10L Cover'
  }
];

export function PortfolioProvider({ children }) {
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [activeAccountId, setActiveAccountId] = useState('acc_all');
  const [entityFilter, setEntityFilter] = useState('ALL'); // 'ALL' | 'MF' | 'FDRD' | 'INSURANCE'
  
  const [transactions, setTransactions] = useState([]);
  const [fds, setFds] = useState([]);
  const [rds, setRds] = useState([]);
  const [insurances, setInsurances] = useState([]);

  const [schemeDetailsMap, setSchemeDetailsMap] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const [selectedSchemeCode, setSelectedSchemeCode] = useState(null);
  const [selectedAMCFilter, setSelectedAMCFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'mf' | 'fdrd' | 'insurance' | 'settings'
  const [toastMessage, setToastMessage] = useState(null);

  // Monitor network online/offline state
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize IndexedDB on startup
  useEffect(() => {
    async function loadFromDB() {
      await initDB();
      
      const dbTxs = await getTransactionsFromDB();
      if (dbTxs && dbTxs.length > 0) setTransactions(dbTxs);
      else { setTransactions(INITIAL_SAMPLE_TRANSACTIONS); saveTransactionsToDB(INITIAL_SAMPLE_TRANSACTIONS); }

      const dbAccs = await getAccountsFromDB();
      if (dbAccs && dbAccs.length > 0) setAccounts(dbAccs);
      else { saveAccountsToDB(INITIAL_ACCOUNTS); }

      const dbFds = await getFDsFromDB();
      if (dbFds && dbFds.length > 0) setFds(dbFds);
      else { setFds(INITIAL_FDS); saveFDsToDB(INITIAL_FDS); }

      const dbRds = await getRDsFromDB();
      if (dbRds && dbRds.length > 0) setRds(dbRds);
      else { setRds(INITIAL_RDS); saveRDsToDB(INITIAL_RDS); }

      const dbIns = await getInsurancesFromDB();
      if (dbIns && dbIns.length > 0) setInsurances(dbIns);
      else { setInsurances(INITIAL_INSURANCES); saveInsurancesToDB(INITIAL_INSURANCES); }
    }
    loadFromDB();
  }, []);

  // Save changes to IndexedDB
  useEffect(() => { if (transactions.length > 0) saveTransactionsToDB(transactions); }, [transactions]);
  useEffect(() => { if (accounts.length > 0) saveAccountsToDB(accounts); }, [accounts]);
  useEffect(() => { if (fds.length > 0) saveFDsToDB(fds); }, [fds]);
  useEffect(() => { if (rds.length > 0) saveRDsToDB(rds); }, [rds]);
  useEffect(() => { if (insurances.length > 0) saveInsurancesToDB(insurances); }, [insurances]);

  // Refresh scheme details from IndexedDB or Network
  const refreshSchemeDetails = useCallback(async (forceSync = false) => {
    const uniqueCodes = [...new Set(transactions.map(t => t.schemeCode))];
    if (uniqueCodes.length === 0) {
      setSchemeDetailsMap({});
      return;
    }

    if (forceSync) setIsSyncing(true);
    setLoadingDetails(true);

    const fetchedMap = {};
    await Promise.all(
      uniqueCodes.map(async (code) => {
        const details = await getSchemeDetails(code, forceSync);
        if (details) fetchedMap[code] = details;
      })
    );

    setSchemeDetailsMap(prevMap => {
      const prevKeys = Object.keys(prevMap);
      const newKeys = Object.keys(fetchedMap);
      if (prevKeys.length !== newKeys.length) return { ...prevMap, ...fetchedMap };

      let changed = false;
      for (const k of newKeys) {
        if (prevMap[k] !== fetchedMap[k]) {
          changed = true;
          break;
        }
      }
      return changed ? { ...prevMap, ...fetchedMap } : prevMap;
    });

    setLoadingDetails(false);
    if (forceSync) setIsSyncing(false);
  }, [transactions]);

  useEffect(() => {
    refreshSchemeDetails(false);
  }, [refreshSchemeDetails]);

  // Sync Live Data action
  const syncLiveData = async () => {
    if (isOffline) {
      showToast('Offline Mode: Connect to internet to sync live NAVs', 'info');
      return;
    }
    showToast('Syncing live NAVs from api.mfapi.in...', 'info');
    await refreshSchemeDetails(true);
    showToast('Portfolio NAVs updated & cached in IndexedDB!');
  };

  // Toast notification
  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter transactions by active account
  const filteredTransactions = useMemo(() => {
    if (activeAccountId === 'acc_all') return transactions;
    return transactions.filter(t => t.accountId === activeAccountId || (!t.accountId && activeAccountId === 'acc_groww'));
  }, [transactions, activeAccountId]);

  // Filter FDs, RDs, Insurances by active account
  const filteredFds = useMemo(() => {
    if (activeAccountId === 'acc_all') return fds;
    return fds.filter(f => f.accountId === activeAccountId);
  }, [fds, activeAccountId]);

  const filteredRds = useMemo(() => {
    if (activeAccountId === 'acc_all') return rds;
    return rds.filter(r => r.accountId === activeAccountId);
  }, [rds, activeAccountId]);

  const filteredInsurances = useMemo(() => {
    if (activeAccountId === 'acc_all') return insurances;
    return insurances.filter(i => i.accountId === activeAccountId);
  }, [insurances, activeAccountId]);

  // Compute MF holdings & summary
  const holdings = useMemo(() => {
    const rawHoldings = calculateHoldings(filteredTransactions, schemeDetailsMap);
    if (selectedAMCFilter === 'ALL') return rawHoldings;
    return rawHoldings.filter(h => h.fundHouse === selectedAMCFilter);
  }, [filteredTransactions, schemeDetailsMap, selectedAMCFilter]);

  const summary = useMemo(() => {
    return calculatePortfolioSummary(holdings);
  }, [holdings]);

  // AMC Breakdown Analysis
  const amcBreakdown = useMemo(() => {
    const allHoldings = calculateHoldings(filteredTransactions, schemeDetailsMap);
    return calculateAMCBreakdown(allHoldings);
  }, [filteredTransactions, schemeDetailsMap]);

  // 15-DAY MATURITY & RENEWAL ALERTS DETECTOR
  const upcomingAlerts = useMemo(() => {
    const alerts = [];

    // FDs maturing within 15 days
    filteredFds.forEach(f => {
      const status = get15DayAlertStatus(f.maturityDate);
      if (status.isWithin15Days) {
        alerts.push({
          id: `alert_fd_${f.id}`,
          entityType: 'FD',
          title: f.title,
          bankName: f.bankName || 'Bank',
          targetDate: f.maturityDate,
          daysLeft: status.daysLeft,
          isMatured: status.isMatured,
          amount: f.maturityAmount || f.principalAmount
        });
      }
    });

    // RDs maturing within 15 days
    filteredRds.forEach(r => {
      const status = get15DayAlertStatus(r.maturityDate);
      if (status.isWithin15Days) {
        alerts.push({
          id: `alert_rd_${r.id}`,
          entityType: 'RD',
          title: r.title,
          bankName: r.bankName || 'Bank',
          targetDate: r.maturityDate,
          daysLeft: status.daysLeft,
          isMatured: status.isMatured,
          amount: r.maturityAmount || r.totalDeposited
        });
      }
    });

    // Insurances with premium due within 15 days
    filteredInsurances.forEach(i => {
      const status = get15DayAlertStatus(i.nextDueDate);
      if (status.isWithin15Days) {
        alerts.push({
          id: `alert_ins_${i.id}`,
          entityType: 'INSURANCE',
          title: i.policyName,
          provider: i.provider || 'Insurer',
          targetDate: i.nextDueDate,
          daysLeft: status.daysLeft,
          isOverdue: status.isMatured,
          amount: i.premiumAmount
        });
      }
    });

    return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [filteredFds, filteredRds, filteredInsurances]);

  // Unified Multi-Entity Wealth Summary
  const globalWealthSummary = useMemo(() => {
    const mfValuation = summary.totalValuation || 0;
    const fdValuation = filteredFds.reduce((acc, f) => acc + parseFloat(f.principalAmount || 0), 0);
    const rdValuation = filteredRds.reduce((acc, r) => acc + parseFloat(r.totalDeposited || (r.monthlyInstallment * 12) || 0), 0);
    const insuranceCover = filteredInsurances.reduce((acc, i) => acc + parseFloat(i.sumAssured || 0), 0);
    const totalNetWorth = mfValuation + fdValuation + rdValuation;

    return {
      mfValuation,
      fdValuation,
      rdValuation,
      insuranceCover,
      totalNetWorth
    };
  }, [summary, filteredFds, filteredRds, filteredInsurances]);

  // Entity CRUD actions
  const addTransaction = (txData) => {
    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      accountId: txData.accountId || (activeAccountId !== 'acc_all' ? activeAccountId : 'acc_groww'),
      ...txData,
      schemeCode: parseInt(txData.schemeCode, 10),
      amount: parseFloat(txData.amount),
      nav: parseFloat(txData.nav),
      units: parseFloat(txData.units)
    };
    setTransactions(prev => [newTx, ...prev]);
    showToast(`Added ${newTx.type} record for ${newTx.schemeName}`);
  };

  const editTransaction = (updatedTx) => {
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
    showToast('Transaction updated');
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    showToast('Transaction removed', 'info');
  };

  // FD CRUD
  const addFD = (fdData) => {
    const newFD = {
      id: `fd_${Date.now()}`,
      accountId: fdData.accountId || (activeAccountId !== 'acc_all' ? activeAccountId : 'acc_hdfc'),
      ...fdData
    };
    setFds(prev => [newFD, ...prev]);
    showToast(`Recorded FD "${newFD.title}"`);
  };

  const editFD = (updatedFD) => {
    setFds(prev => prev.map(f => f.id === updatedFD.id ? updatedFD : f));
    showToast(`Updated FD "${updatedFD.title}"`);
  };

  const deleteFD = (id) => {
    setFds(prev => prev.filter(f => f.id !== id));
    showToast('FD removed', 'info');
  };

  // RD CRUD
  const addRD = (rdData) => {
    const newRD = {
      id: `rd_${Date.now()}`,
      accountId: rdData.accountId || (activeAccountId !== 'acc_all' ? activeAccountId : 'acc_hdfc'),
      ...rdData
    };
    setRds(prev => [newRD, ...prev]);
    showToast(`Recorded RD "${newRD.title}"`);
  };

  const editRD = (updatedRD) => {
    setRds(prev => prev.map(r => r.id === updatedRD.id ? updatedRD : r));
    showToast(`Updated RD "${updatedRD.title}"`);
  };

  const deleteRD = (id) => {
    setRds(prev => prev.filter(r => r.id !== id));
    showToast('RD removed', 'info');
  };

  // Insurance CRUD
  const addInsurance = (insData) => {
    const newIns = {
      id: `ins_${Date.now()}`,
      accountId: insData.accountId || (activeAccountId !== 'acc_all' ? activeAccountId : 'acc_groww'),
      ...insData
    };
    setInsurances(prev => [newIns, ...prev]);
    showToast(`Recorded Policy "${newIns.policyName}"`);
  };

  const editInsurance = (updatedIns) => {
    setInsurances(prev => prev.map(i => i.id === updatedIns.id ? updatedIns : i));
    showToast(`Updated Policy "${updatedIns.policyName}"`);
  };

  const deleteInsurance = (id) => {
    setInsurances(prev => prev.filter(i => i.id !== id));
    showToast('Insurance Policy removed', 'info');
  };

  // Account Management CRUD
  const addAccount = (name, broker) => {
    const newAcc = {
      id: `acc_${Date.now()}`,
      name,
      broker: broker || 'Custom',
      isDefault: false
    };
    setAccounts(prev => [...prev, newAcc]);
    setActiveAccountId(newAcc.id);
    showToast(`Created Master Account "${name}"`);
    return newAcc;
  };

  const editAccount = (id, name, broker) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, name, broker } : a));
    showToast('Account updated');
  };

  const deleteAccount = (id) => {
    if (id === 'acc_all' || id === 'acc_groww') {
      showToast('Cannot delete default account', 'error');
      return;
    }
    setAccounts(prev => prev.filter(a => a.id !== id));
    if (activeAccountId === id) setActiveAccountId('acc_all');
    showToast('Account removed', 'info');
  };

  const clearAllData = () => {
    setTransactions([]);
    setFds([]);
    setRds([]);
    setInsurances([]);
    setSchemeDetailsMap({});
    showToast('All wealth records cleared', 'info');
  };

  const loadSampleData = () => {
    setTransactions(INITIAL_SAMPLE_TRANSACTIONS);
    setFds(INITIAL_FDS);
    setRds(INITIAL_RDS);
    setInsurances(INITIAL_INSURANCES);
    saveTransactionsToDB(INITIAL_SAMPLE_TRANSACTIONS);
    saveFDsToDB(INITIAL_FDS);
    saveRDsToDB(INITIAL_RDS);
    saveInsurancesToDB(INITIAL_INSURANCES);
    showToast('Sample wealth portfolio restored!');
  };

  const exportData = () => {
    const payload = { accounts, transactions, fds, rds, insurances };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Wealth_Portfolio_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Portfolio backup exported to JSON');
  };

  const importData = (importedData) => {
    if (importedData && typeof importedData === 'object') {
      if (Array.isArray(importedData.transactions)) setTransactions(importedData.transactions);
      if (Array.isArray(importedData.fds)) setFds(importedData.fds);
      if (Array.isArray(importedData.rds)) setRds(importedData.rds);
      if (Array.isArray(importedData.insurances)) setInsurances(importedData.insurances);
      if (Array.isArray(importedData.accounts)) setAccounts(importedData.accounts);
      showToast('Imported wealth portfolio backup cleanly');
    } else {
      showToast('Invalid JSON file format', 'error');
    }
  };

  return (
    <PortfolioContext.Provider
      value={{
        accounts,
        activeAccountId,
        setActiveAccountId,
        entityFilter,
        setEntityFilter,
        addAccount,
        editAccount,
        deleteAccount,
        transactions: filteredTransactions,
        allTransactions: transactions,
        fds: filteredFds,
        rds: filteredRds,
        insurances: filteredInsurances,
        upcomingAlerts,
        globalWealthSummary,
        addTransaction,
        editTransaction,
        deleteTransaction,
        addFD,
        editFD,
        deleteFD,
        addRD,
        editRD,
        deleteRD,
        addInsurance,
        editInsurance,
        deleteInsurance,
        holdings,
        summary,
        amcBreakdown,
        schemeDetailsMap,
        loadingDetails,
        isSyncing,
        isOffline,
        selectedSchemeCode,
        setSelectedSchemeCode,
        selectedAMCFilter,
        setSelectedAMCFilter,
        activeTab,
        setActiveTab,
        toastMessage,
        showToast,
        syncLiveData,
        clearAllData,
        loadSampleData,
        exportData,
        importData
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error('usePortfolio must be used within PortfolioProvider');
  return context;
}
