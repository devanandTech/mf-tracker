/**
 * IndexedDB Offline-First Storage Engine for MF Pulse
 * Separate Entity Table Schema
 */

const DB_NAME = 'MFPulseDB_v3';
const DB_VERSION = 1;

let dbInstance = null;

export function initDB() {
  return new Promise((resolve, reject) => {
    if (dbInstance) return resolve(dbInstance);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      
      // Store for scheme NAV histories
      if (!db.objectStoreNames.contains('schemes')) {
        db.createObjectStore('schemes', { keyPath: 'schemeCode' });
      }

      // Store for mutual fund transactions
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }

      // Store for master accounts/brokers
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id' });
      }

      // Store for Fixed Deposits (FD)
      if (!db.objectStoreNames.contains('fds')) {
        db.createObjectStore('fds', { keyPath: 'id' });
      }

      // Store for Recurring Deposits (RD)
      if (!db.objectStoreNames.contains('rds')) {
        db.createObjectStore('rds', { keyPath: 'id' });
      }

      // Store for Insurance Policies
      if (!db.objectStoreNames.contains('insurances')) {
        db.createObjectStore('insurances', { keyPath: 'id' });
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      console.error('IndexedDB init error:', e.target.error);
      reject(e.target.error);
    };
  });
}

// Helper generic store actions
async function saveStoreItems(storeName, items) {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    items.forEach(item => store.put(item));
  } catch (e) {
    console.error(`Failed to save items to ${storeName}:`, e);
  }
}

async function getStoreItems(storeName) {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

// Scheme NAV Cache
export async function saveSchemeToDB(schemeCode, schemeData) {
  try {
    const db = await initDB();
    const tx = db.transaction('schemes', 'readwrite');
    const store = tx.objectStore('schemes');
    const payload = {
      schemeCode: parseInt(schemeCode, 10),
      meta: schemeData.meta,
      data: schemeData.data,
      updatedAt: new Date().toISOString()
    };
    store.put(payload);
  } catch (e) {
    console.error('Failed to save scheme to DB:', e);
  }
}

export async function getSchemeFromDB(schemeCode) {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('schemes', 'readonly');
      const store = tx.objectStore('schemes');
      const request = store.get(parseInt(schemeCode, 10));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

export async function getAllSchemesFromDB() {
  return getStoreItems('schemes');
}

// Transactions (MF) Offline Storage
export async function saveTransactionsToDB(transactions) {
  return saveStoreItems('transactions', transactions);
}

export async function getTransactionsFromDB() {
  return getStoreItems('transactions');
}

// Master Accounts Offline Storage
export async function saveAccountsToDB(accounts) {
  return saveStoreItems('accounts', accounts);
}

export async function getAccountsFromDB() {
  return getStoreItems('accounts');
}

// Fixed Deposits (FD) Offline Storage
export async function saveFDsToDB(fds) {
  return saveStoreItems('fds', fds);
}

export async function getFDsFromDB() {
  return getStoreItems('fds');
}

// Recurring Deposits (RD) Offline Storage
export async function saveRDsToDB(rds) {
  return saveStoreItems('rds', rds);
}

export async function getRDsFromDB() {
  return getStoreItems('rds');
}

// Insurance Policies Offline Storage
export async function saveInsurancesToDB(insurances) {
  return saveStoreItems('insurances', insurances);
}

export async function getInsurancesFromDB() {
  return getStoreItems('insurances');
}

// Clear all offline entity object stores
export async function clearAllStoresInDB() {
  try {
    const db = await initDB();
    const storeNames = ['transactions', 'fds', 'rds', 'insurances'];
    const tx = db.transaction(storeNames, 'readwrite');
    storeNames.forEach(name => tx.objectStore(name).clear());
  } catch (e) {
    console.error('Failed to clear DB stores:', e);
  }
}
