import React, { useState, useEffect, useRef } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { searchSchemes, getSchemeDetails } from '../api/mfApi.js';
import {
  Star,
  Search,
  PlusCircle,
  Trash2,
  TrendingUp,
  TrendingDown,
  Loader2,
  LineChart,
  RefreshCw,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function WatchlistManager({ onOpenAddTx, onOpenSchemeModal }) {
  const {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    schemeDetailsMap,
    isSyncing,
    syncLiveData,
    showToast
  } = usePortfolio();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  // Search schemes for adding to watchlist
  useEffect(() => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchSchemes(query);
      setSearchResults(results.slice(0, 8));
      setIsSearching(false);
      setShowDropdown(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectScheme = (scheme) => {
    addToWatchlist(scheme);
    setQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Live Tracker
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" /> Watchlist Mutual Funds ({watchlist.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track potential mutual fund schemes, monitor live NAV changes, and record quick investments
          </p>
        </div>

        {/* Live Search & Add Bar */}
        <div className="w-full md:w-80 relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search & Add to Watchlist..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setShowDropdown(true)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-800 border border-slate-700/80 rounded-2xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 animate-spin" />
            )}
          </div>

          {/* Search Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto divide-y divide-slate-800">
              {searchResults.map((item) => (
                <button
                  key={item.schemeCode}
                  onClick={() => handleSelectScheme(item)}
                  className="w-full px-4 py-2.5 text-left hover:bg-slate-800 transition-colors flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200 group-hover:text-amber-300 truncate">
                      {item.schemeName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">Code: {item.schemeCode}</p>
                  </div>
                  <Star className="w-4 h-4 text-slate-500 group-hover:text-amber-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Watchlist Items Feed Grid */}
      {watchlist.length === 0 ? (
        <div className="mobile-card-glass rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Star className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Your Watchlist is Empty</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Use the search bar above to find mutual fund schemes from api.mfapi.in and add them to your watchlist for live NAV monitoring.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlist.map((item) => {
            const schemeCode = parseInt(item.schemeCode, 10);
            const details = schemeDetailsMap[schemeCode];
            
            let latestNAV = null;
            let prevNAV = null;
            let navChangePercent = null;
            let return1Y = null;

            if (details && details.data && details.data.length > 0) {
              latestNAV = parseFloat(details.data[0].nav);
              if (details.data.length > 1) {
                prevNAV = parseFloat(details.data[1].nav);
                if (prevNAV > 0) {
                  navChangePercent = (((latestNAV - prevNAV) / prevNAV) * 100).toFixed(2);
                }
              }

              // 1 Year Return estimation
              if (details.data.length > 250) {
                const nav1Y = parseFloat(details.data[250].nav);
                if (nav1Y > 0) {
                  return1Y = (((latestNAV - nav1Y) / nav1Y) * 100).toFixed(1);
                }
              }
            }

            return (
              <div
                key={item.schemeCode}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 space-y-4 shadow-xl flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Scheme Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.fundHouse || 'Mutual Fund'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">#{item.schemeCode}</span>
                      </div>
                      <h4 className="text-sm font-extrabold text-white leading-snug line-clamp-2" title={item.schemeName}>
                        {item.schemeName}
                      </h4>
                    </div>

                    <button
                      onClick={() => removeFromWatchlist(item.schemeCode)}
                      title="Remove from Watchlist"
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* NAV Cards & Performance Badges */}
                  <div className="mt-4 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400">Current NAV</span>
                      {latestNAV ? (
                        <div className="text-right">
                          <span className="text-base font-black text-white font-mono">₹{latestNAV.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Fetching live NAV...</span>
                      )}
                    </div>

                    {navChangePercent !== null && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400 font-medium">1-Day Change</span>
                        <span className={`font-bold font-mono flex items-center gap-1 ${
                          parseFloat(navChangePercent) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {parseFloat(navChangePercent) >= 0 ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                          )}
                          {parseFloat(navChangePercent) >= 0 ? '+' : ''}{navChangePercent}%
                        </span>
                      </div>
                    )}

                    {return1Y !== null && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
                        <span className="text-slate-400 font-medium">1-Year Return</span>
                        <span className={`font-bold font-mono ${
                          parseFloat(return1Y) >= 0 ? 'text-cyan-400' : 'text-rose-400'
                        }`}>
                          {parseFloat(return1Y) >= 0 ? '+' : ''}{return1Y}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="pt-3 flex items-center gap-2 border-t border-slate-800/80">
                  <button
                    onClick={() => onOpenAddTx(item.schemeName, item.schemeCode)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active-press"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Record Tx</span>
                  </button>

                  <button
                    onClick={() => onOpenSchemeModal(item.schemeCode)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 border border-slate-700 active-press"
                  >
                    <LineChart className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Chart</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
