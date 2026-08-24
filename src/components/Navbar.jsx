import React, { useState, useEffect, useRef } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { searchSchemes } from '../api/mfApi.js';
import {
  TrendingUp,
  LineChart,
  ListOrdered,
  PlusCircle,
  Download,
  Upload,
  Search,
  Loader2,
  Sparkles,
  Building2,
  RefreshCw,
  Wifi,
  WifiOff,
  Layers,
  X,
  ChevronDown,
  Smartphone
} from 'lucide-react';

export default function Navbar({ onOpenAddTx, onOpenSchemeModal }) {
  const {
    activeTab,
    setActiveTab,
    accounts,
    activeAccountId,
    setActiveAccountId,
    isOffline,
    isSyncing,
    syncLiveData,
    exportData,
    importData,
    setSelectedSchemeCode
  } = usePortfolio();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchSchemes(searchQuery);
      setSearchResults(results.slice(0, 10));
      setIsSearching(false);
      setShowDropdown(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectScheme = (scheme) => {
    setSelectedSchemeCode(scheme.schemeCode);
    setShowDropdown(false);
    setIsMobileSearchOpen(false);
    setSearchQuery('');
    if (onOpenSchemeModal) onOpenSchemeModal(scheme.schemeCode);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        importData(json);
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-3">
            
            {/* Logo */}
            <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer active-press flex-shrink-0" onClick={() => setActiveTab('dashboard')}>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-slate-950 font-extrabold" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-black text-sm sm:text-lg text-white tracking-tight">MF Pulse</span>
                  
                  {/* Offline / Online Status Badge */}
                  {isOffline ? (
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                      <WifiOff className="w-2.5 h-2.5" /> <span className="hidden sm:inline">Offline</span>
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                      <Wifi className="w-2.5 h-2.5 text-emerald-400" /> <span className="hidden sm:inline">Live</span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 hidden lg:block">IndexedDB Offline-First • Zero DB</p>
              </div>
            </div>

            {/* Multi-Account Switcher Dropdown */}
            <div className="relative min-w-0 max-w-[110px] xs:max-w-[140px] sm:max-w-[200px]">
              <select
                value={activeAccountId}
                onChange={(e) => setActiveAccountId(e.target.value)}
                className="w-full truncate bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold px-2 py-1.5 focus:outline-none focus:border-emerald-500"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Search Autocomplete */}
            <div className="hidden md:block flex-1 max-w-xs lg:max-w-sm relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search mutual funds..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                  className="w-full pl-9 pr-8 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />
                )}
              </div>

              {showDropdown && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto divide-y divide-slate-700/50">
                  {searchResults.map((item) => (
                    <button
                      key={item.schemeCode}
                      onClick={() => handleSelectScheme(item)}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-700/60 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400">
                          {item.schemeName}
                        </p>
                        <p className="text-[10px] text-slate-400">Code: {item.schemeCode}</p>
                      </div>
                      <LineChart className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              
              {/* PWA Install Button */}
              {deferredPrompt && (
                <button
                  onClick={handleInstallApp}
                  title="Install App to Home Screen"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold active-press animate-pulse"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Install</span>
                </button>
              )}

              {/* Sync Live Button */}
              <button
                onClick={syncLiveData}
                disabled={isSyncing}
                title="Sync Latest NAVs to IndexedDB"
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 rounded-xl text-xs font-bold active-press"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
                <span className="hidden sm:inline">Sync</span>
              </button>

              {/* Mobile Search Toggle */}
              <button
                onClick={() => setIsMobileSearchOpen(true)}
                className="md:hidden p-1.5 sm:p-2 rounded-xl bg-slate-800 text-slate-300 active-press border border-slate-700"
              >
                <Search className="w-4 h-4 text-emerald-400" />
              </button>

              {/* Add Tx */}
              <button
                onClick={onOpenAddTx}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-500/20 active-press"
              >
                <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>+ Tx</span>
              </button>

              <button
                onClick={exportData}
                title="Export JSON"
                className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hidden sm:block active-press"
              >
                <Download className="w-4 h-4" />
              </button>

              <label
                title="Import JSON"
                className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 hidden sm:block active-press cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>

            </div>

          </div>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex items-center space-x-1 border-t border-slate-800/80 pt-1 pb-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('amc')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'amc'
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>AMC Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('dipAnalyzer')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'dipAnalyzer'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Performance & Dips</span>
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              <span>Transactions</span>
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Search Overlay Modal */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl p-4 flex flex-col md:hidden">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
              <input
                type="text"
                autoFocus
                placeholder="Search scheme name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
              />
              {isSearching && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />
              )}
            </div>
            <button
              onClick={() => setIsMobileSearchOpen(false)}
              className="p-2.5 rounded-2xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 divide-y divide-slate-800">
            {searchResults.map((item) => (
              <button
                key={item.schemeCode}
                onClick={() => handleSelectScheme(item)}
                className="w-full py-3 px-2 text-left flex items-center justify-between active-press"
              >
                <div>
                  <p className="text-xs font-bold text-slate-100">{item.schemeName}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Code: {item.schemeCode}</p>
                </div>
                <LineChart className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Bottom Bar Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/90 pb-safe">
        <div className="grid grid-cols-4 h-14 items-center">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition-all active-press ${
              activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <TrendingUp className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('amc')}
            className={`flex flex-col items-center justify-center py-1 transition-all active-press ${
              activeTab === 'amc' ? 'text-teal-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Building2 className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">AMCs</span>
          </button>

          <button
            onClick={() => setActiveTab('dipAnalyzer')}
            className={`flex flex-col items-center justify-center py-1 transition-all active-press ${
              activeTab === 'dipAnalyzer' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Dips</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex flex-col items-center justify-center py-1 transition-all active-press ${
              activeTab === 'transactions' ? 'text-cyan-400 font-bold' : 'text-slate-400'
            }`}
          >
            <ListOrdered className="w-4 h-4 mb-0.5" />
            <span className="text-[9px]">Orders</span>
          </button>

        </div>
      </nav>
    </>
  );
}
