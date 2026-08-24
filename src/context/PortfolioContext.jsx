import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getSchemeDetails } from '../api/mfApi.js';
import {
  initDB,
  saveTransactionsToDB,
  getTransactionsFromDB,
  saveAccountsToDB,
  getAccountsFromDB
} from '../api/db.js';
import {
  calculateHoldings,
  calculatePortfolioSummary,
  calculateAMCBreakdown
} from '../utils/calculations.js';

const PortfolioContext = createContext(null);

const INITIAL_ACCOUNTS = [
  { id: 'acc_all', name: 'All Accounts (Combined)', broker: 'Multi-Broker', isDefault: false },
  { id: 'acc_groww', name: 'Groww Portfolio', broker: 'Groww', isDefault: true },
  { id: 'acc_zerodha', name: 'Zerodha Coin', broker: 'Zerodha', isDefault: false },
  { id: 'acc_kuvera', name: 'Kuvera / Direct', broker: 'Kuvera', isDefault: false }
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
    id: 'tx_sbi_2',
    accountId: 'acc_groww',
    schemeCode: 125497,
    schemeName: 'SBI SMALL CAP FUND - Direct Plan - Growth',
    type: 'BUY',
    date: '10-06-2024',
    nav: 172.50,
    amount: 30000,
    units: 173.913,
    notes: 'Monthly SIP top-up'
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
  },
  {
    id: 'tx_hdfc_1',
    accountId: 'acc_zerodha',
    schemeCode: 100119,
    schemeName: 'HDFC Balanced Advantage Fund - Direct Plan - Growth',
    type: 'BUY',
    date: '20-03-2024',
    nav: 385.10,
    amount: 75000,
    units: 194.755,
    notes: 'Hybrid fund position'
  },
  {
    id: 'tx_nippon_1',
    accountId: 'acc_kuvera',
    schemeCode: 120594,
    schemeName: 'Nippon India Small Cap Fund - Direct Plan - Growth',
    type: 'BUY',
    date: '05-04-2024',
    nav: 145.80,
    amount: 40000,
    units: 274.348,
    notes: 'Dip buy after market pullback'
  }
];

export function PortfolioProvider({ children }) {
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [activeAccountId, setActiveAccountId] = useState('acc_all');
  const [transactions, setTransactions] = useState([]);
  
  const [schemeDetailsMap, setSchemeDetailsMap] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const [selectedSchemeCode, setSelectedSchemeCode] = useState(null);
  const [selectedAMCFilter, setSelectedAMCFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'amc' | 'dipAnalyzer' | 'transactions'
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
      if (dbTxs && dbTxs.length > 0) {
        setTransactions(dbTxs);
      } else {
        setTransactions(INITIAL_SAMPLE_TRANSACTIONS);
        saveTransactionsToDB(INITIAL_SAMPLE_TRANSACTIONS);
      }

      const dbAccs = await getAccountsFromDB();
      if (dbAccs && dbAccs.length > 0) {
        setAccounts(dbAccs);
      } else {
        saveAccountsToDB(INITIAL_ACCOUNTS);
      }
    }
    loadFromDB();
  }, []);

  // Save changes to IndexedDB
  useEffect(() => {
    if (transactions.length > 0) {
      saveTransactionsToDB(transactions);
    }
  }, [transactions]);

  useEffect(() => {
    if (accounts.length > 0) {
      saveAccountsToDB(accounts);
    }
  }, [accounts]);

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
        if (details) {
          fetchedMap[code] = details;
        }
      })
    );

    setSchemeDetailsMap(prevMap => {
      // Avoid triggering re-renders if scheme data has not changed
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

  // Compute holdings & portfolio summary for filtered transactions
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

  // Transaction CRUD handlers
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
    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? {
      ...updatedTx,
      schemeCode: parseInt(updatedTx.schemeCode, 10),
      amount: parseFloat(updatedTx.amount),
      nav: parseFloat(updatedTx.nav),
      units: parseFloat(updatedTx.units)
    } : t));
    showToast('Transaction updated');
  };

  const deleteTransaction = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    showToast('Transaction removed', 'info');
  };

  const addAccount = (accountName, broker) => {
    const newAcc = {
      id: `acc_${Date.now()}`,
      name: accountName,
      broker: broker || 'Other',
      isDefault: false
    };
    setAccounts(prev => [...prev, newAcc]);
    setActiveAccountId(newAcc.id);
    showToast(`Created account "${accountName}"`);
  };

  const clearPortfolio = () => {
    setTransactions([]);
    setSchemeDetailsMap({});
    showToast('Portfolio cleared', 'info');
  };

  const loadSampleData = () => {
    setTransactions(INITIAL_SAMPLE_TRANSACTIONS);
    saveTransactionsToDB(INITIAL_SAMPLE_TRANSACTIONS);
    showToast('Sample portfolio restored!');
  };

  const exportData = () => {
    const payload = { accounts, transactions };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `MF_Portfolio_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Portfolio exported to JSON');
  };

  const importData = (importedData) => {
    if (Array.isArray(importedData)) {
      setTransactions(importedData);
      showToast(`Imported ${importedData.length} transactions`);
    } else if (importedData && Array.isArray(importedData.transactions)) {
      setTransactions(importedData.transactions);
      if (Array.isArray(importedData.accounts)) setAccounts(importedData.accounts);
      showToast(`Imported portfolio backup cleanly`);
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
        addAccount,
        transactions: filteredTransactions,
        allTransactions: transactions,
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
        addTransaction,
        editTransaction,
        deleteTransaction,
        syncLiveData,
        clearPortfolio,
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
