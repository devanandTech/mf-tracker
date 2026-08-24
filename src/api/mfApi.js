import { getSchemeFromDB, saveSchemeToDB } from './db.js';

const BASE_URL = 'https://api.mfapi.in';
const memoryCache = new Map();

/**
 * Search mutual fund schemes by name
 */
export async function searchSchemes(query) {
  if (!query || query.trim().length < 2) return [];
  const cacheKey = `search_${query.trim().toLowerCase()}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  try {
    const res = await fetch(`${BASE_URL}/mf/search?q=${encodeURIComponent(query.trim())}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    memoryCache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.warn('Network search failed or offline:', err);
    return [];
  }
}

/**
 * Get Scheme details with IndexedDB Offline Fallback
 * @param {number} schemeCode 
 * @param {boolean} forceSync If true, bypasses cache and fetches fresh data from API
 */
export async function getSchemeDetails(schemeCode, forceSync = false) {
  if (!schemeCode) return null;
  const code = parseInt(schemeCode, 10);

  // Check memory cache first
  if (!forceSync && memoryCache.has(`scheme_${code}`)) {
    return memoryCache.get(`scheme_${code}`);
  }

  // Check IndexedDB cache if not forcing sync
  if (!forceSync) {
    const dbCached = await getSchemeFromDB(code);
    if (dbCached && dbCached.data && dbCached.data.length > 0) {
      const result = {
        meta: dbCached.meta,
        data: dbCached.data,
        status: 'SUCCESS',
        isOfflineCopy: true,
        updatedAt: dbCached.updatedAt
      };
      memoryCache.set(`scheme_${code}`, result);
      return result;
    }
  }

  // Fetch live network data
  try {
    const res = await fetch(`${BASE_URL}/mf/${code}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    
    if (data && data.status === 'SUCCESS') {
      // Save to IndexedDB
      await saveSchemeToDB(code, data);
      memoryCache.set(`scheme_${code}`, data);
      return data;
    }
  } catch (err) {
    console.warn(`Network fetch failed for scheme ${code}, checking IndexedDB fallback...`, err);
    
    // Fallback to IndexedDB if network fails or offline
    const dbCached = await getSchemeFromDB(code);
    if (dbCached && dbCached.data) {
      return {
        meta: dbCached.meta,
        data: dbCached.data,
        status: 'SUCCESS',
        isOfflineCopy: true,
        updatedAt: dbCached.updatedAt
      };
    }
  }

  return null;
}
