import { getSchemeFromDB, saveSchemeToDB } from './db.js';

const BASE_URL = 'https://api.mfapi.in';
const memoryCache = new Map();

// AMFI publishes NAVs once a day; a cached copy older than this is re-fetched when online
const NAV_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function isFresh(updatedAt) {
  const savedAt = updatedAt ? new Date(updatedAt).getTime() : 0;
  return savedAt > 0 && Date.now() - savedAt < NAV_CACHE_TTL_MS;
}

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

  const cacheKey = `scheme_${code}`;

  // Check memory cache first
  if (!forceSync && memoryCache.has(cacheKey) && isFresh(memoryCache.get(cacheKey).updatedAt)) {
    return memoryCache.get(cacheKey);
  }

  // Check IndexedDB cache if not forcing sync
  const dbCached = await getSchemeFromDB(code);
  const offlineCopy = dbCached && dbCached.data && dbCached.data.length > 0
    ? {
        meta: dbCached.meta,
        data: dbCached.data,
        status: 'SUCCESS',
        isOfflineCopy: true,
        updatedAt: dbCached.updatedAt
      }
    : null;

  if (!forceSync && offlineCopy && (isFresh(offlineCopy.updatedAt) || !navigator.onLine)) {
    memoryCache.set(cacheKey, offlineCopy);
    return offlineCopy;
  }

  // Fetch live network data
  try {
    const res = await fetch(`${BASE_URL}/mf/${code}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    // An empty history must never replace a good cached one
    if (data && data.status === 'SUCCESS' && Array.isArray(data.data) && data.data.length > 0) {
      const result = { ...data, updatedAt: new Date().toISOString() };
      await saveSchemeToDB(code, result);
      memoryCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    console.warn(`Network fetch failed for scheme ${code}, using IndexedDB fallback...`, err);
  }

  // Fallback to the stale IndexedDB copy if the network fails, is offline, or returns nothing usable
  return offlineCopy;
}
