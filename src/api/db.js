/**
 * IndexedDB Offline-First Storage Engine for MF Pulse
 */

const DB_NAME = 'MFPulseDB_v2';
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

      // Store for transactions
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }

      // Store for accounts/brokers
      if (!db.objectStoreNames.contains('accounts')) {
        db.createObjectStore('accounts', { keyPath: 'id' });
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
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('schemes', 'readonly');
      const store = tx.objectStore('schemes');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

// Transactions Offline Storage
export async function saveTransactionsToDB(transactions) {
  try {
    const db = await initDB();
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    store.clear();
    transactions.forEach(t => store.put(t));
  } catch (e) {
    console.error('Failed to save transactions to DB:', e);
  }
}

export async function getTransactionsFromDB() {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('transactions', 'readonly');
      const store = tx.objectStore('transactions');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

// Accounts Offline Storage
export async function saveAccountsToDB(accounts) {
  try {
    const db = await initDB();
    const tx = db.transaction('accounts', 'readwrite');
    const store = tx.objectStore('accounts');
    store.clear();
    accounts.forEach(a => store.put(a));
  } catch (e) {
    console.error('Failed to save accounts to DB:', e);
  }
}

export async function getAccountsFromDB() {
  try {
    const db = await initDB();
    return new Promise((resolve) => {
      const tx = db.transaction('accounts', 'readonly');
      const store = tx.objectStore('accounts');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}
