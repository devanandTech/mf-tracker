import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { searchSchemes, getSchemeDetails } from '../api/mfApi.js';
import { findNAVForDate } from '../utils/dateUtils.js';
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
  Calendar,
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

  // Helper for default 6 months ago date in local YYYY-MM-DD
  const get6MonthsAgoStr = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Custom From & To dates (defaults From date to 6 months ago)
  const [customStartDate, setCustomStartDate] = useState(() => {
    return localStorage.getItem('mf_watchlist_custom_from_date') || get6MonthsAgoStr();
  });
  const [customEndDate, setCustomEndDate] = useState('');
  const searchRef = useRef(null);

  const handleStartDateChange = (val) => {
    const newVal = val || get6MonthsAgoStr();
    setCustomStartDate(newVal);
    localStorage.setItem('mf_watchlist_custom_from_date', newVal);
  };

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
    <div className="space-y-4">
      
      {/* Top Controls Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800/90 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.2 rounded-md text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Live Watchlist & Custom Return
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Watchlist ({watchlist.length})
            </h2>
          </div>

          {/* Search & Add Bar */}
          <div className="w-full md:w-72 relative" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search & Add to Watchlist..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && setShowDropdown(true)}
                className="w-full pl-9 pr-7 py-1.5 bg-slate-800 border border-slate-700/80 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium"
              />
              {isSearching && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400 animate-spin" />
              )}
            </div>

            {/* Search Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto divide-y divide-slate-800">
                {searchResults.map((item) => (
                  <button
                    key={item.schemeCode}
                    onClick={() => handleSelectScheme(item)}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-800 transition-colors flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-200 group-hover:text-amber-300 truncate">
                        {item.schemeName}
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono">Code: {item.schemeCode}</p>
                    </div>
                    <Star className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Integrated Custom Date Range Filter Bar */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-[11px]">Custom Return Period:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-medium">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-slate-200 focus:outline-none text-[11px] font-mono"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-medium">To:</span>
              <input
                type="date"
                placeholder="Today"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-slate-200 focus:outline-none text-[11px] font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Watchlist Feed Grid */}
      {watchlist.length === 0 ? (
        <div className="mobile-card-glass rounded-2xl p-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
            <Star className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">Your Watchlist is Empty</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Search schemes above to add them to your watchlist for live NAV monitoring & custom return calculation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {watchlist.map((item) => {
            const schemeCode = parseInt(item.schemeCode, 10);
            const details = schemeDetailsMap[schemeCode];
            
            let latestNAV = null;
            let prevNAV = null;
            let navChangePercent = null;
            let return1M = null;
            let return1Y = null;
            let customReturnPct = null;

            if (details && details.data && details.data.length > 0) {
              latestNAV = parseFloat(details.data[0].nav);
              
              if (details.data.length > 1) {
                prevNAV = parseFloat(details.data[1].nav);
                if (prevNAV > 0) {
                  navChangePercent = (((latestNAV - prevNAV) / prevNAV) * 100).toFixed(2);
                }
              }

              if (details.data.length > 20) {
                const nav1M = parseFloat(details.data[20].nav);
                if (nav1M > 0) return1M = (((latestNAV - nav1M) / nav1M) * 100).toFixed(1);
              }

              if (details.data.length > 250) {
                const nav1Y = parseFloat(details.data[250].nav);
                if (nav1Y > 0) return1Y = (((latestNAV - nav1Y) / nav1Y) * 100).toFixed(1);
              }

              // Compute Custom Date Range Return (defaults to 6 months ago)
              if (customStartDate) {
                const startNav = findNAVForDate(details.data, customStartDate);
                const endNav = customEndDate ? findNAVForDate(details.data, customEndDate) : latestNAV;
                if (startNav && startNav > 0 && endNav) {
                  customReturnPct = (((endNav - startNav) / startNav) * 100).toFixed(2);
                }
              }
            }

            return (
              <div
                key={item.schemeCode}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3 space-y-2.5 shadow-lg flex flex-col justify-between transition-all"
              >
                <div>
                  {/* Scheme Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="px-2 py-0.2 rounded-md text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.fundHouse || 'Mutual Fund'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">#{item.schemeCode}</span>
                      </div>
                      <h4 className="text-xs font-extrabold text-white leading-snug truncate" title={item.schemeName}>
                        {item.schemeName}
                      </h4>
                    </div>

                    <button
                      onClick={() => removeFromWatchlist(item.schemeCode)}
                      title="Remove from Watchlist"
                      className="p-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* NAV Cards & Inline 4-Column Timeframe Grid */}
                  <div className="mt-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400">Current NAV</span>
                      {latestNAV ? (
                        <span className="text-sm font-black text-white font-mono">₹{latestNAV.toFixed(2)}</span>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Fetching live NAV...</span>
                      )}
                    </div>

                    {/* Inline 4-Column Returns Grid (1D | 1M | 1Y | Custom Range) */}
                    <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-800/80 text-[9px] font-mono">
                      <div className="bg-slate-900 p-1 rounded-lg text-center">
                        <span className="text-[8px] text-slate-500 block uppercase font-sans font-semibold">1D</span>
                        {navChangePercent !== null ? (
                          <span className={parseFloat(navChangePercent) >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {parseFloat(navChangePercent) >= 0 ? '+' : ''}{navChangePercent}%
                          </span>
                        ) : <span className="text-slate-500">—</span>}
                      </div>

                      <div className="bg-slate-900 p-1 rounded-lg text-center">
                        <span className="text-[8px] text-slate-500 block uppercase font-sans font-semibold">1M</span>
                        {return1M !== null ? (
                          <span className={parseFloat(return1M) >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {parseFloat(return1M) >= 0 ? '+' : ''}{return1M}%
                          </span>
                        ) : <span className="text-slate-500">—</span>}
                      </div>

                      <div className="bg-slate-900 p-1 rounded-lg text-center">
                        <span className="text-[8px] text-slate-500 block uppercase font-sans font-semibold">1Y</span>
                        {return1Y !== null ? (
                          <span className={parseFloat(return1Y) >= 0 ? 'text-cyan-400 font-bold' : 'text-rose-400 font-bold'}>
                            {parseFloat(return1Y) >= 0 ? '+' : ''}{return1Y}%
                          </span>
                        ) : <span className="text-slate-500">—</span>}
                      </div>

                      {/* Custom Range Return (Inline Next to 1Y) */}
                      <div className={`p-1 rounded-lg text-center transition-colors ${
                        customReturnPct !== null
                          ? parseFloat(customReturnPct) >= 0
                            ? 'bg-emerald-500/10 border border-emerald-500/30'
                            : 'bg-rose-500/10 border border-rose-500/30'
                          : 'bg-slate-900 border border-slate-800'
                      }`}>
                        <span className={`text-[8px] block uppercase font-sans font-bold truncate ${
                          customReturnPct !== null
                            ? parseFloat(customReturnPct) >= 0 ? 'text-emerald-300' : 'text-rose-300'
                            : 'text-slate-400'
                        }`}>Custom</span>
                        {customReturnPct !== null ? (
                          <span className={`font-black ${parseFloat(customReturnPct) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {parseFloat(customReturnPct) >= 0 ? '+' : ''}{customReturnPct}%
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="pt-1.5 flex items-center gap-1.5 border-t border-slate-800/80">
                  <button
                    onClick={() => onOpenAddTx(item.schemeName, item.schemeCode)}
                    className="flex-1 py-1 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-sm active-press"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Record Tx</span>
                  </button>

                  <button
                    onClick={() => onOpenSchemeModal(item.schemeCode)}
                    className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1 border border-slate-700 active-press"
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
