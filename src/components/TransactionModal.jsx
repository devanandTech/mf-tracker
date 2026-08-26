import React, { useState, useEffect, useRef } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { searchSchemes, getSchemeDetails } from '../api/mfApi.js';
import { findNAVForDate, inputToDDMMYYYY, toInputDateFormat } from '../utils/dateUtils.js';
import { numberToWordsINR } from '../utils/numberUtils.js';
import {
  X,
  Search,
  Loader2,
  Calendar,
  DollarSign,
  Layers,
  PlusCircle,
  Sparkles,
  Check
} from 'lucide-react';

export default function TransactionModal({ isOpen, onClose, initialSchemeName = '', initialSchemeCode = null, editTxData = null }) {
  const { addTransaction, editTransaction, accounts, activeAccountId } = usePortfolio();
  const defaultAccId = accounts.find(a => a.id !== 'acc_all')?.id || 'acc_all';
  const [selectedAccountId, setSelectedAccountId] = useState(activeAccountId !== 'acc_all' ? activeAccountId : defaultAccId);

  const [schemeQuery, setSchemeQuery] = useState(initialSchemeName);
  const [selectedScheme, setSelectedScheme] = useState(initialSchemeCode ? { schemeCode: initialSchemeCode, schemeName: initialSchemeName } : null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [txType, setTxType] = useState('BUY'); // 'BUY' | 'SIP' | 'SELL'
  const [dateStr, setDateStr] = useState(() => toInputDateFormat(new Date()));
  const [nav, setNav] = useState('');
  const [amount, setAmount] = useState('');
  const [units, setUnits] = useState('');
  const [notes, setNotes] = useState('');
  const [isFetchingNAV, setIsFetchingNAV] = useState(false);

  const dropdownRef = useRef(null);

  // Sync selectedAccountId, scheme, form fields whenever modal opens or mode changes
  useEffect(() => {
    if (!isOpen) return;

    const defaultAccId = accounts.find(a => a.id !== 'acc_all')?.id || 'acc_all';

    if (editTxData) {
      setSelectedAccountId(editTxData.accountId || (activeAccountId !== 'acc_all' ? activeAccountId : defaultAccId));
      setSelectedScheme({ schemeCode: editTxData.schemeCode, schemeName: editTxData.schemeName });
      setSchemeQuery(editTxData.schemeName);
      setTxType(editTxData.type || 'BUY');
      setDateStr(toInputDateFormat(editTxData.date));
      setNav(String(editTxData.nav || ''));
      setAmount(String(editTxData.amount || ''));
      setUnits(String(editTxData.units || ''));
      setNotes(editTxData.notes || '');
    } else {
      setSelectedAccountId(activeAccountId !== 'acc_all' ? activeAccountId : defaultAccId);
      if (initialSchemeCode && initialSchemeName) {
        setSelectedScheme({ schemeCode: initialSchemeCode, schemeName: initialSchemeName });
        setSchemeQuery(initialSchemeName);
      } else {
        setSelectedScheme(null);
        setSchemeQuery('');
      }
      setTxType('BUY');
      setDateStr(toInputDateFormat(new Date()));
      setNav('');
      setAmount('');
      setUnits('');
      setNotes('');
    }
  }, [isOpen, editTxData, initialSchemeCode, initialSchemeName, activeAccountId, accounts]);

  // Search autocomplete
  useEffect(() => {
    if (!schemeQuery || schemeQuery.length < 2 || (selectedScheme && selectedScheme.schemeName === schemeQuery)) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchSchemes(schemeQuery);
      setSearchResults(results.slice(0, 8));
      setIsSearching(false);
      setShowDropdown(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [schemeQuery, selectedScheme]);

  // Click outside to close search dropdown
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch NAV for selected date whenever scheme or date changes
  const fetchNAVForSelectedDate = async (code, inputDate) => {
    if (!code || !inputDate) return;
    setIsFetchingNAV(true);
    try {
      const details = await getSchemeDetails(code);
      if (details && details.data && details.data.length > 0) {
        const fetchedNav = findNAVForDate(details.data, inputDate);
        if (fetchedNav) {
          setNav(String(fetchedNav));
          // Recalculate units if amount exists
          if (amount && parseFloat(amount) > 0) {
            setUnits((parseFloat(amount) / fetchedNav).toFixed(4));
          }
        }
      }
    } catch (e) {
      console.error('Error fetching NAV for date:', e);
    } finally {
      setIsFetchingNAV(false);
    }
  };

  const handleSelectScheme = (item) => {
    setSelectedScheme(item);
    setSchemeQuery(item.schemeName);
    setShowDropdown(false);
    fetchNAVForSelectedDate(item.schemeCode, dateStr);
  };

  const handleDateChange = (newDate) => {
    setDateStr(newDate);
    if (selectedScheme) {
      fetchNAVForSelectedDate(selectedScheme.schemeCode, newDate);
    }
  };

  const handleAmountChange = (val) => {
    setAmount(val);
    const amtNum = parseFloat(val);
    const navNum = parseFloat(nav);
    if (amtNum > 0 && navNum > 0) {
      setUnits((amtNum / navNum).toFixed(4));
    }
  };

  const handleNavChange = (val) => {
    setNav(val);
    const amtNum = parseFloat(amount);
    const navNum = parseFloat(val);
    if (amtNum > 0 && navNum > 0) {
      setUnits((amtNum / navNum).toFixed(4));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedScheme) {
      alert('Please search and select a Mutual Fund Scheme');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid investment amount');
      return;
    }
    if (!nav || parseFloat(nav) <= 0) {
      alert('Please enter a valid NAV');
      return;
    }

    const formattedDate = inputToDDMMYYYY(dateStr);

    const payload = {
      accountId: selectedAccountId || (activeAccountId !== 'acc_all' ? activeAccountId : defaultAccId),
      schemeCode: selectedScheme.schemeCode,
      schemeName: selectedScheme.schemeName,
      type: txType,
      date: formattedDate,
      nav: parseFloat(nav),
      amount: parseFloat(amount),
      units: parseFloat(units || (parseFloat(amount) / parseFloat(nav)).toFixed(4)),
      notes
    };

    if (editTxData) {
      editTransaction({ ...editTxData, ...payload });
    } else {
      addTransaction(payload);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto pt-safe pb-safe">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-white">
              {editTxData ? 'Edit Transaction' : 'Add Mutual Fund Transaction'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-300">
          
          {/* Master Portfolio Account Selector */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">
              Portfolio Master Account <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
            >
              {accounts.filter(a => a.id !== 'acc_all').map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.broker || 'Broker'})
                </option>
              ))}
            </select>
          </div>

          {/* Scheme Search */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-slate-400 font-semibold mb-1">
              Mutual Fund Scheme <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search scheme name (e.g. HDFC, Parag Parikh)..."
                value={schemeQuery}
                onChange={(e) => {
                  setSchemeQuery(e.target.value);
                  setSelectedScheme(null);
                }}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-56 overflow-y-auto divide-y divide-slate-700/50">
                {searchResults.map((item) => (
                  <button
                    type="button"
                    key={item.schemeCode}
                    onClick={() => handleSelectScheme(item)}
                    className="w-full px-3.5 py-2 text-left hover:bg-slate-700 transition-colors flex items-center justify-between"
                  >
                    <span className="font-medium text-slate-200">{item.schemeName}</span>
                    <span className="text-[10px] text-slate-400">Code: {item.schemeCode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Transaction Type Buttons */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Transaction Type</label>
            <div className="grid grid-cols-3 gap-2">
              {['BUY', 'SIP', 'SELL'].map(type => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setTxType(type)}
                  className={`py-2 rounded-xl font-bold text-xs transition-all border ${
                    txType === type
                      ? type === 'SELL'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {type === 'SIP' ? 'SIP Purchase' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction Date & NAV Lookup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Transaction Date</label>
              <input
                type="date"
                value={dateStr}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-semibold">NAV (₹)</label>
                {isFetchingNAV && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> API fetching...
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.0001"
                placeholder="NAV price"
                value={nav}
                onChange={(e) => handleNavChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Amount & Calculated Units */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Total Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 10000"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
              />
              {amount && parseFloat(amount) > 0 && (
                <span className="text-[10px] text-emerald-400 font-semibold mt-1 block font-mono">
                  {numberToWordsINR(amount)}
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Units Allotted</label>
              <input
                type="number"
                step="0.0001"
                placeholder="Calculated automatically"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-slate-300 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Notes / Dip Tags (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Dip Buy - market down 3%"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
            >
              {editTxData ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
