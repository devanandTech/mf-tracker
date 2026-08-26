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
  getInsurancesFromDB,
  clearAllStoresInDB
} from '../api/db.js';
import {
  calculateHoldings,
  calculatePortfolioSummary,
  calculateAMCBreakdown
} from '../utils/calculations.js';
import { get15DayAlertStatus } from '../utils/interestUtils.js';
import { encryptData, decryptData } from '../utils/cryptoUtils.js';

const PortfolioContext = createContext(null);

const DEFAULT_ACCOUNTS = [
  { id: 'acc_all', name: 'All Accounts (Combined)', broker: 'Multi-Broker', isDefault: true }
];

const INITIAL_SAMPLE_TRANSACTIONS = [];
const INITIAL_FDS = [];
const INITIAL_RDS = [];
const INITIAL_INSURANCES = [];

export function PortfolioProvider({ children }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
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
      setTransactions(dbTxs || []);

      const dbAccs = await getAccountsFromDB();
      if (dbAccs && dbAccs.length > 0) {
        setAccounts(dbAccs);
      } else {
        setAccounts(DEFAULT_ACCOUNTS);
        await saveAccountsToDB(DEFAULT_ACCOUNTS);
      }

      const dbFds = await getFDsFromDB();
      setFds(dbFds || []);

      const dbRds = await getRDsFromDB();
      setRds(dbRds || []);

      const dbIns = await getInsurancesFromDB();
      setInsurances(dbIns || []);

      setIsLoaded(true);
    }
    loadFromDB();
  }, []);

  // Save changes to IndexedDB ONLY after DB loading completes (prevents race condition)
  useEffect(() => { if (isLoaded) saveTransactionsToDB(transactions); }, [transactions, isLoaded]);
  useEffect(() => { if (isLoaded && accounts.length > 0) saveAccountsToDB(accounts); }, [accounts, isLoaded]);
  useEffect(() => { if (isLoaded) saveFDsToDB(fds); }, [fds, isLoaded]);
  useEffect(() => { if (isLoaded) saveRDsToDB(rds); }, [rds, isLoaded]);
  useEffect(() => { if (isLoaded) saveInsurancesToDB(insurances); }, [insurances, isLoaded]);

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
    const defaultAccId = accounts.find(a => a.id !== 'acc_all')?.id || 'acc_all';
    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      accountId: txData.accountId || (activeAccountId !== 'acc_all' ? activeAccountId : defaultAccId),
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
    const defaultAccId = accounts.find(a => a.id !== 'acc_all')?.id || 'acc_all';
    const newFD = {
      id: `fd_${Date.now()}`,
      accountId: fdData.accountId || (activeAccountId !== 'acc_all' ? activeAccountId : defaultAccId),
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
    const defaultAccId = accounts.find(a => a.id !== 'acc_all')?.id || 'acc_all';
    const newRD = {
      id: `rd_${Date.now()}`,
      accountId: rdData.accountId || (activeAccountId !== 'acc_all' ? activeAccountId : defaultAccId),
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
    const defaultAccId = accounts.find(a => a.id !== 'acc_all')?.id || 'acc_all';
    const newIns = {
      id: `ins_${Date.now()}`,
      accountId: insData.accountId || (activeAccountId !== 'acc_all' ? activeAccountId : defaultAccId),
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
    if (id === 'acc_all') {
      showToast('Cannot delete default system account', 'error');
      return;
    }
    setAccounts(prev => prev.filter(a => a.id !== id));
    if (activeAccountId === id) setActiveAccountId('acc_all');
    showToast('Account removed', 'info');
  };

  const clearAllData = async () => {
    await clearAllStoresInDB();
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

  const exportData = async (customPassphrase = null) => {
    const payload = { accounts, transactions, fds, rds, insurances };
    const rawJson = JSON.stringify(payload, null, 2);

    let finalContent = rawJson;
    let isEncryptedFile = false;

    // Handle React SyntheticEvent objects when passed from onClick={exportData}
    let pass = (typeof customPassphrase === 'string')
      ? customPassphrase
      : window.prompt("Security Lock: Enter an Encryption Password to secure your backup file (Or leave empty for standard unencrypted JSON):");

    if (pass && typeof pass === 'string' && pass.trim()) {
      try {
        finalContent = await encryptData(rawJson, pass.trim());
        isEncryptedFile = true;
        showToast('Backup encrypted with AES-256!', 'success');
      } catch (err) {
        showToast('Encryption failed: ' + err.message, 'error');
        return;
      }
    }

    // Use Blob and URL.createObjectURL to ensure Android Chrome saves file with exact .json extension
    const blob = new Blob([finalContent], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", blobUrl);
    const prefix = isEncryptedFile ? 'Encrypted_Wealth_Portfolio' : 'Wealth_Portfolio_Backup';
    const filename = `${prefix}_${new Date().toISOString().split('T')[0]}.json`;
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    setTimeout(() => {
      downloadAnchor.remove();
      URL.revokeObjectURL(blobUrl);
    }, 1000);
    
    if (!isEncryptedFile) {
      showToast('Standard unencrypted portfolio backup exported');
    }
  };

  const importData = async (fileInputData, customPassphrase = null) => {
    let jsonContent = fileInputData;
    const initialPass = (typeof customPassphrase === 'string') ? customPassphrase : null;

    // Handle string inputs (parse JSON or decrypt)
    if (typeof fileInputData === 'string') {
      try {
        const parsedObj = JSON.parse(fileInputData);
        if (parsedObj && parsedObj.isEncrypted) {
          const pass = initialPass !== null
            ? initialPass
            : window.prompt("Encrypted File Detected: Enter Decryption Key / Password:");

          if (!pass || typeof pass !== 'string' || !pass.trim()) {
            showToast('Decryption cancelled', 'info');
            return;
          }

          const decryptedStr = await decryptData(fileInputData, pass.trim());
          jsonContent = JSON.parse(decryptedStr);
          showToast('File decrypted successfully!', 'success');
        } else {
          jsonContent = parsedObj;
        }
      } catch (err) {
        showToast('Import Error: ' + err.message, 'error');
        return;
      }
    } else if (fileInputData && fileInputData.isEncrypted) {
      const pass = initialPass !== null
        ? initialPass
        : window.prompt("Encrypted File Detected: Enter Decryption Key / Password:");

      if (!pass || typeof pass !== 'string' || !pass.trim()) {
        showToast('Decryption cancelled', 'info');
        return;
      }

      try {
        const decryptedStr = await decryptData(fileInputData, pass.trim());
        jsonContent = JSON.parse(decryptedStr);
        showToast('File decrypted successfully!', 'success');
      } catch (err) {
        showToast('Decryption Failed: ' + err.message, 'error');
        return;
      }
    }

    if (!jsonContent) {
      showToast('Empty or invalid file content', 'error');
      return;
    }

    // Unwrap nested wrappers if present (e.g. jsonContent.data or jsonContent.portfolio)
    let payload = jsonContent;
    if (jsonContent.data && typeof jsonContent.data === 'object' && !Array.isArray(jsonContent.data)) {
      payload = jsonContent.data;
    } else if (jsonContent.portfolio && typeof jsonContent.portfolio === 'object' && !Array.isArray(jsonContent.portfolio)) {
      payload = jsonContent.portfolio;
    }

    let importedTxCount = 0;
    let importedFDCount = 0;
    let importedRDCount = 0;
    let importedInsCount = 0;
    let importedAccCount = 0;

    // Case 1: Direct Array of Transactions (Legacy Export Format)
    if (Array.isArray(payload)) {
      const validTxs = payload.filter(t => t && (t.schemeCode || t.schemeName || t.amount));
      if (validTxs.length > 0) {
        setTransactions(validTxs);
        saveTransactionsToDB(validTxs);
        importedTxCount = validTxs.length;
      }
    } else if (typeof payload === 'object') {
      // Case 2: Standard Object Backup
      if (Array.isArray(payload.transactions)) {
        setTransactions(payload.transactions);
        saveTransactionsToDB(payload.transactions);
        importedTxCount = payload.transactions.length;
      } else if (Array.isArray(payload.allTransactions)) {
        setTransactions(payload.allTransactions);
        saveTransactionsToDB(payload.allTransactions);
        importedTxCount = payload.allTransactions.length;
      }

      if (Array.isArray(payload.fds)) {
        setFds(payload.fds);
        saveFDsToDB(payload.fds);
        importedFDCount = payload.fds.length;
      }

      if (Array.isArray(payload.rds)) {
        setRds(payload.rds);
        saveRDsToDB(payload.rds);
        importedRDCount = payload.rds.length;
      }

      if (Array.isArray(payload.insurances)) {
        setInsurances(payload.insurances);
        saveInsurancesToDB(payload.insurances);
        importedInsCount = payload.insurances.length;
      }

      if (Array.isArray(payload.accounts) && payload.accounts.length > 0) {
        setAccounts(payload.accounts);
        saveAccountsToDB(payload.accounts);
        importedAccCount = payload.accounts.length;
      }
    }

    // Auto-recover missing referenced master accounts if old transactions reference account IDs not in state
    const allImportedItems = [
      ...(Array.isArray(payload.transactions) ? payload.transactions : Array.isArray(payload) ? payload : []),
      ...(Array.isArray(payload.fds) ? payload.fds : []),
      ...(Array.isArray(payload.rds) ? payload.rds : []),
      ...(Array.isArray(payload.insurances) ? payload.insurances : [])
    ];

    const referencedAccIds = new Set(allImportedItems.map(i => i.accountId).filter(Boolean));
    if (referencedAccIds.size > 0) {
      setAccounts(prevAccounts => {
        let updated = [...prevAccounts];
        let hasChanges = false;
        referencedAccIds.forEach(accId => {
          if (accId !== 'acc_all' && !updated.some(a => a.id === accId)) {
            let label = accId.replace(/^acc_/, '').toUpperCase();
            updated.push({
              id: accId,
              name: `${label} Account`,
              broker: label,
              isDefault: false
            });
            hasChanges = true;
          }
        });
        if (hasChanges) {
          saveAccountsToDB(updated);
        }
        return updated;
      });
    }

    const totalImported = importedTxCount + importedFDCount + importedRDCount + importedInsCount;
    if (totalImported > 0 || importedAccCount > 0) {
      showToast(`Successfully imported ${totalImported} wealth records (${importedTxCount} Txs, ${importedFDCount} FDs, ${importedRDCount} RDs, ${importedInsCount} Insurances)`, 'success');
    } else {
      showToast('No valid transactions or wealth records found in backup file', 'error');
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
