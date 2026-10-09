import React, { useState, useEffect, useRef } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { searchSchemes, getSchemeDetails } from '../api/mfApi.js';
import { findNAVForDate, inputToDDMMYYYY, toInputDateFormat } from '../utils/dateUtils.js';
import { numberToWordsINR } from '../utils/numberUtils.js';
import { sellableUnitsOn, UNIT_EPSILON } from '../utils/calculations.js';
import {
  X,
  Search,
  Loader2,
  PlusCircle,
  AlertTriangle
} from 'lucide-react';

const REDEEM_SHORTCUTS = [
  { label: '25%', fraction: 0.25 },
  { label: '50%', fraction: 0.5 },
  { label: '75%', fraction: 0.75 },
  { label: 'Redeem all', fraction: 1 }
];

// Folio units are tracked to 4 decimals; drop trailing zeros for the input box
const formatUnits = (value) => String(parseFloat(Number(value).toFixed(4)));
const formatAmount = (value) => String(parseFloat(Number(value).toFixed(2)));

export default function TransactionModal({ isOpen, onClose, initialSchemeName = '', initialSchemeCode = null, initialType = 'BUY', editTxData = null }) {
  const { addTransaction, editTransaction, accounts, activeAccountId, allTransactions } = usePortfolio();
  const defaultAccId = accounts.find(a => a.id !== 'acc_all')?.id || 'acc_all';
  const [selectedAccountId, setSelectedAccountId] = useState(activeAccountId !== 'acc_all' ? activeAccountId : defaultAccId);

  const [schemeQuery, setSchemeQuery] = useState(initialSchemeName);
  const [selectedScheme, setSelectedScheme] = useState(initialSchemeCode ? { schemeCode: initialSchemeCode, schemeName: initialSchemeName } : null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [txType, setTxType] = useState('BUY'); // 'BUY' | 'SIP' | 'SELL'
  const [sellMode, setSellMode] = useState('UNITS'); // 'UNITS' | 'AMOUNT' - which field the user enters when redeeming
  const [dateStr, setDateStr] = useState(() => toInputDateFormat(new Date()));
  const [nav, setNav] = useState('');
  const [amount, setAmount] = useState('');
  const [units, setUnits] = useState('');
  const [notes, setNotes] = useState('');
  const [isFetchingNAV, setIsFetchingNAV] = useState(false);
  const [formError, setFormError] = useState('');

  const dropdownRef = useRef(null);

  const isSell = txType === 'SELL';
  const unitsDriven = isSell && sellMode === 'UNITS';

  // Units that can be redeemed on the chosen date for the selected scheme and account
  const availableHoldingUnits = React.useMemo(() => {
    if (!selectedScheme || !selectedScheme.schemeCode) return 0;
    const code = parseInt(selectedScheme.schemeCode, 10);

    // Filter transactions for this scheme (and account if specific account selected)
    const schemeTxs = allTransactions.filter(t => {
      const matchCode = parseInt(t.schemeCode, 10) === code;
      const matchAcc = selectedAccountId === 'acc_all' || t.accountId === selectedAccountId || (!t.accountId && selectedAccountId === 'acc_groww');
      // If editing existing transaction, exclude it from current units count calculation
      const isNotEditingCurrent = editTxData ? t.id !== editTxData.id : true;
      return matchCode && matchAcc && isNotEditingCurrent;
    });

    return sellableUnitsOn(schemeTxs, dateStr);
  }, [selectedScheme, selectedAccountId, allTransactions, editTxData, dateStr]);

  // Latest form values for async NAV lookups, which resolve after the user may have typed more
  const formRef = useRef({});
  useEffect(() => {
    formRef.current = { amount, units, unitsDriven, isSell, availableHoldingUnits };
  });

  // Keeps the derived field (units or amount) in step with the one the user is entering
  const syncDerivedField = (navValue, { amountValue, unitsValue }) => {
    const form = formRef.current;
    const navNum = parseFloat(navValue);
    if (!(navNum > 0)) return;

    if (form.unitsDriven) {
      const unitsNum = parseFloat(unitsValue ?? form.units);
      if (unitsNum > 0) setAmount(formatAmount(unitsNum * navNum));
    } else {
      const amtNum = parseFloat(amountValue ?? form.amount);
      if (!(amtNum > 0)) return;
      // A redemption within a rupee of the full value means "everything": avoid leaving dust units
      const fullValue = form.availableHoldingUnits * navNum;
      if (form.isSell && form.availableHoldingUnits > 0 && Math.abs(fullValue - amtNum) <= 1) {
        setUnits(formatUnits(form.availableHoldingUnits));
      } else {
        setUnits(formatUnits(amtNum / navNum));
      }
    }
  };

  // Fetch NAV for selected date whenever scheme or date changes
  const fetchNAVForSelectedDate = async (code, inputDate, syncFields = true) => {
    if (!code || !inputDate) return;
    setIsFetchingNAV(true);
    try {
      const details = await getSchemeDetails(code);
      if (details && details.data && details.data.length > 0) {
        const fetchedNav = findNAVForDate(details.data, inputDate);
        if (fetchedNav) {
          setNav(String(fetchedNav));
          if (syncFields) syncDerivedField(fetchedNav, {});
        }
      }
    } catch (e) {
      console.error('Error fetching NAV for date:', e);
    } finally {
      setIsFetchingNAV(false);
    }
  };

  // Sync selectedAccountId, scheme, form fields whenever modal opens or mode changes
  useEffect(() => {
    if (!isOpen) return;

    const defaultAccId = accounts.find(a => a.id !== 'acc_all')?.id || 'acc_all';
    setFormError('');
    setSellMode('UNITS');

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
      const today = toInputDateFormat(new Date());
      setSelectedAccountId(activeAccountId !== 'acc_all' ? activeAccountId : defaultAccId);
      setTxType(initialType || 'BUY');
      setDateStr(today);
      setNav('');
      setAmount('');
      setUnits('');
      setNotes('');
      if (initialSchemeCode && initialSchemeName) {
        setSelectedScheme({ schemeCode: initialSchemeCode, schemeName: initialSchemeName });
        setSchemeQuery(initialSchemeName);
        // The form was just cleared, so there is nothing to derive from the fetched NAV yet
        fetchNAVForSelectedDate(initialSchemeCode, today, false);
      } else {
        setSelectedScheme(null);
        setSchemeQuery('');
      }
    }
  }, [isOpen, editTxData, initialSchemeCode, initialSchemeName, initialType, activeAccountId, accounts]);

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

  const handleSelectScheme = (item) => {
    setSelectedScheme(item);
    setSchemeQuery(item.schemeName);
    setShowDropdown(false);
    setFormError('');
    fetchNAVForSelectedDate(item.schemeCode, dateStr);
  };

  const handleDateChange = (newDate) => {
    setDateStr(newDate);
    setFormError('');
    if (selectedScheme) {
      fetchNAVForSelectedDate(selectedScheme.schemeCode, newDate);
    }
  };

  const handleAmountChange = (val) => {
    setAmount(val);
    setFormError('');
    syncDerivedField(nav, { amountValue: val });
  };

  const handleUnitsChange = (val) => {
    setUnits(val);
    setFormError('');
    // For purchases the allotted units can be corrected by hand without touching the amount paid
    if (unitsDriven) syncDerivedField(nav, { unitsValue: val });
  };

  const handleNavChange = (val) => {
    setNav(val);
    setFormError('');
    syncDerivedField(val, {});
  };

  const handleRedeemShortcut = (fraction) => {
    if (availableHoldingUnits <= 0) return;
    const redeemUnits = formatUnits(availableHoldingUnits * fraction);
    setSellMode('UNITS');
    setUnits(redeemUnits);
    setFormError('');
    const navNum = parseFloat(nav);
    if (navNum > 0) setAmount(formatAmount(parseFloat(redeemUnits) * navNum));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedScheme) {
      setFormError('Please search and select a Mutual Fund Scheme');
      return;
    }
    if (!dateStr || dateStr > toInputDateFormat(new Date())) {
      setFormError('Transaction date cannot be in the future');
      return;
    }
    if (!nav || parseFloat(nav) <= 0) {
      setFormError('Please enter a valid NAV');
      return;
    }
    if (unitsDriven && !(parseFloat(units) > 0)) {
      setFormError('Please enter the number of units to redeem');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setFormError(isSell ? 'Please enter a valid redemption amount' : 'Please enter a valid investment amount');
      return;
    }

    const unitsVal = parseFloat(units || (parseFloat(amount) / parseFloat(nav)).toFixed(4));

    // Validate SELL transaction against units held on the redemption date
    if (isSell) {
      if (availableHoldingUnits <= 0) {
        setFormError(`You hold no redeemable units of "${selectedScheme.schemeName}" in this account on that date.`);
        return;
      }
      if (unitsVal > availableHoldingUnits + UNIT_EPSILON) {
        setFormError(`You are redeeming ${unitsVal.toFixed(4)} units but only ${availableHoldingUnits.toFixed(4)} are available on that date.`);
        return;
      }
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
      units: unitsVal,
      notes
    };

    const saved = editTxData
      ? editTransaction({ ...editTxData, ...payload })
      : addTransaction(payload);

    if (saved !== false) onClose();
  };

  if (!isOpen) return null;

  const realAccounts = accounts.filter(a => a.id !== 'acc_all');
  const navNum = parseFloat(nav);
  const availableValue = navNum > 0 ? availableHoldingUnits * navNum : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto pt-safe pb-safe">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">

        {/* Header */}
        <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle className={`w-5 h-5 ${isSell ? 'text-rose-400' : 'text-emerald-400'}`} />
            <h3 className="text-lg font-bold text-white">
              {editTxData ? 'Edit Transaction' : isSell ? 'Redeem Mutual Fund Units' : 'Add Mutual Fund Transaction'}
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
              onChange={(e) => {
                setSelectedAccountId(e.target.value);
                setFormError('');
              }}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
            >
              {realAccounts.length === 0 && (
                <option value="acc_all">Default Portfolio</option>
              )}
              {realAccounts.map(a => (
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
                  onClick={() => {
                    setTxType(type);
                    setFormError('');
                  }}
                  className={`py-2 rounded-xl font-bold text-xs transition-all border ${
                    txType === type
                      ? type === 'SELL'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {type === 'SIP' ? 'SIP Purchase' : type === 'SELL' ? 'Redeem' : type}
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
                max={toInputDateFormat(new Date())}
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

          {/* Redemption helper: available units, entry mode and quick fractions */}
          {isSell && selectedScheme && (
            <div className="bg-rose-500/5 border border-rose-500/30 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Available to redeem</span>
                  <span className="font-mono font-bold text-rose-200">
                    {availableHoldingUnits.toFixed(4)} units
                    {availableValue > 0 && (
                      <span className="text-slate-400 font-medium"> ≈ ₹{Math.round(availableValue).toLocaleString('en-IN')}</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 flex-shrink-0">
                  {[
                    { id: 'UNITS', label: 'By Units' },
                    { id: 'AMOUNT', label: 'By Amount' }
                  ].map(mode => (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setSellMode(mode.id)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-all ${
                        sellMode === mode.id
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {REDEEM_SHORTCUTS.map(shortcut => (
                  <button
                    type="button"
                    key={shortcut.label}
                    disabled={availableHoldingUnits <= 0}
                    onClick={() => handleRedeemShortcut(shortcut.fraction)}
                    className="py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-rose-500/50 text-[10px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount & Units: the redemption mode decides which one is typed and which is derived */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={unitsDriven ? 'sm:order-2' : ''}>
              <label className="block text-slate-400 font-semibold mb-1">
                {isSell ? 'Redemption Amount (₹)' : 'Total Amount (₹)'}
                {unitsDriven && <span className="text-slate-500 font-medium"> • auto</span>}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={unitsDriven ? 'Units × NAV' : 'e.g. 10000'}
                value={amount}
                readOnly={unitsDriven}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={`w-full px-3 py-2.5 border border-slate-700 rounded-xl font-mono focus:outline-none focus:border-emerald-500 ${
                  unitsDriven ? 'bg-slate-800/60 text-slate-300' : 'bg-slate-800 text-slate-200'
                }`}
              />
              {amount && parseFloat(amount) > 0 && (
                <span className="text-[10px] text-emerald-400 font-semibold mt-1 block font-mono">
                  {numberToWordsINR(amount)}
                </span>
              )}
            </div>

            <div className={unitsDriven ? 'sm:order-1' : ''}>
              <label className="block text-slate-400 font-semibold mb-1">
                {isSell ? 'Units to Redeem' : 'Units Allotted'}
                {isSell && !unitsDriven && <span className="text-slate-500 font-medium"> • auto</span>}
              </label>
              <input
                type="number"
                step="0.0001"
                placeholder={unitsDriven ? 'e.g. 125.5' : 'Calculated automatically'}
                value={units}
                readOnly={isSell && !unitsDriven}
                onChange={(e) => handleUnitsChange(e.target.value)}
                className={`w-full px-3 py-2.5 border border-slate-700 rounded-xl font-mono focus:outline-none focus:border-emerald-500 ${
                  unitsDriven ? 'bg-slate-800 text-slate-200' : 'bg-slate-800/60 text-slate-300'
                }`}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Notes / Dip Tags (Optional)</label>
            <input
              type="text"
              placeholder={isSell ? 'e.g. Booked profit for house down payment' : 'e.g. Dip Buy - market down 3%'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none"
            />
          </div>

          {/* Inline validation message */}
          {formError && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

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
              className={`px-5 py-2 rounded-xl font-bold shadow-md ${
                isSell
                  ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              {editTxData ? 'Save Changes' : isSell ? 'Record Redemption' : 'Record Transaction'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
