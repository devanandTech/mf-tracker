import React, { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { calculateFDMaturity, calculateRDMaturity, calculateMaturityDate, get15DayAlertStatus } from '../utils/interestUtils.js';
import { numberToWordsINR } from '../utils/numberUtils.js';
import {
  Landmark,
  PlusCircle,
  PiggyBank,
  Calendar,
  AlertTriangle,
  Clock,
  Trash2,
  Edit3,
  CheckCircle2,
  RefreshCw,
  ArrowRightLeft
} from 'lucide-react';

export default function DepositManager() {
  const { fds, rds, addFD, editFD, deleteFD, addRD, editRD, deleteRD, accounts, activeAccountId } = usePortfolio();

  const [isFDModalOpen, setIsFDModalOpen] = useState(false);
  const [isRDModalOpen, setIsRDModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states for FD
  const [fdAccountId, setFdAccountId] = useState(activeAccountId !== 'acc_all' ? activeAccountId : 'acc_hdfc');
  const [fdBankName, setFdBankName] = useState('');
  const [fdTitle, setFdTitle] = useState('');
  const [fdPrincipal, setFdPrincipal] = useState('');
  const [fdRate, setFdRate] = useState('');
  const [fdTenure, setFdTenure] = useState('');
  const [fdStartDate, setFdStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [fdPayoutFrequency, setFdPayoutFrequency] = useState('At Maturity'); // 'At Maturity' | 'Monthly' | 'Quarterly' | 'Yearly'
  const [fdMaturityAction, setFdMaturityAction] = useState('Auto-Renew (Principal + Interest)'); // 'Auto-Renew (Principal + Interest)' | 'Auto-Renew (Principal Only)' | 'Auto-Close & Credit to Account'
  const [fdNotes, setFdNotes] = useState('');

  // Form states for RD
  const [rdAccountId, setRdAccountId] = useState(activeAccountId !== 'acc_all' ? activeAccountId : 'acc_hdfc');
  const [rdBankName, setRdBankName] = useState('');
  const [rdTitle, setRdTitle] = useState('');
  const [rdInstallment, setRdInstallment] = useState('');
  const [rdRate, setRdRate] = useState('');
  const [rdTenure, setRdTenure] = useState('');
  const [rdStartDate, setRdStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rdNotes, setRdNotes] = useState('');

  // Computed FD values
  const computedFDMaturityObj = calculateFDMaturity(fdPrincipal, fdRate, fdTenure, fdPayoutFrequency);
  const computedFDMaturityDate = calculateMaturityDate(fdStartDate, fdTenure);

  // Computed RD values
  const computedRDMaturityAmount = calculateRDMaturity(rdInstallment, rdRate, rdTenure);
  const computedRDMaturityDate = calculateMaturityDate(rdStartDate, rdTenure);

  const handleOpenAddFD = () => {
    setEditingItem(null);
    setFdBankName('');
    setFdTitle('');
    setFdPrincipal('');
    setFdRate('7.1');
    setFdTenure('12');
    setFdPayoutFrequency('At Maturity');
    setFdMaturityAction('Auto-Renew (Principal + Interest)');
    setFdNotes('');
    setIsFDModalOpen(true);
  };

  const handleEditFD = (f) => {
    setEditingItem(f);
    setFdAccountId(f.accountId);
    setFdBankName(f.bankName || '');
    setFdTitle(f.title || '');
    setFdPrincipal(String(f.principalAmount || ''));
    setFdRate(String(f.interestRate || ''));
    setFdTenure(String(f.tenureMonths || ''));
    setFdStartDate(f.startDate || new Date().toISOString().split('T')[0]);
    setFdPayoutFrequency(f.payoutFrequency || 'At Maturity');
    setFdMaturityAction(f.maturityAction || 'Auto-Renew (Principal + Interest)');
    setFdNotes(f.notes || '');
    setIsFDModalOpen(true);
  };

  const handleOpenAddRD = () => {
    setEditingItem(null);
    setRdBankName('');
    setRdTitle('');
    setRdInstallment('');
    setRdRate('6.8');
    setRdTenure('12');
    setRdNotes('');
    setIsRDModalOpen(true);
  };

  const handleEditRD = (r) => {
    setEditingItem(r);
    setRdAccountId(r.accountId);
    setRdBankName(r.bankName || '');
    setRdTitle(r.title || '');
    setRdInstallment(String(r.monthlyInstallment || ''));
    setRdRate(String(r.interestRate || ''));
    setRdTenure(String(r.tenureMonths || ''));
    setRdStartDate(r.startDate || new Date().toISOString().split('T')[0]);
    setRdNotes(r.notes || '');
    setIsRDModalOpen(true);
  };

  const handleSaveFD = (e) => {
    e.preventDefault();
    if (!fdBankName.trim() || !fdTitle.trim() || !fdPrincipal) {
      alert('Please enter Bank Name, FD Title, and Principal Amount');
      return;
    }

    const payload = {
      accountId: fdAccountId,
      bankName: fdBankName.trim(),
      title: fdTitle.trim(),
      principalAmount: parseFloat(fdPrincipal),
      interestRate: parseFloat(fdRate || 0),
      tenureMonths: parseInt(fdTenure || 0, 10),
      startDate: fdStartDate,
      payoutFrequency: fdPayoutFrequency,
      maturityAction: fdMaturityAction,
      maturityDate: computedFDMaturityDate,
      maturityAmount: computedFDMaturityObj.maturityAmount,
      periodicPayout: computedFDMaturityObj.periodicPayout,
      totalInterestPaid: computedFDMaturityObj.totalInterestPaid,
      notes: fdNotes.trim()
    };

    if (editingItem) {
      editFD({ ...editingItem, ...payload });
    } else {
      addFD(payload);
    }
    setIsFDModalOpen(false);
  };

  const handleSaveRD = (e) => {
    e.preventDefault();
    if (!rdBankName.trim() || !rdTitle.trim() || !rdInstallment) {
      alert('Please enter Bank Name, RD Title, and Monthly Installment');
      return;
    }

    const totalDeposited = parseFloat(rdInstallment) * parseInt(rdTenure || 12, 10);

    const payload = {
      accountId: rdAccountId,
      bankName: rdBankName.trim(),
      title: rdTitle.trim(),
      monthlyInstallment: parseFloat(rdInstallment),
      totalDeposited,
      interestRate: parseFloat(rdRate || 0),
      tenureMonths: parseInt(rdTenure || 0, 10),
      startDate: rdStartDate,
      maturityDate: computedRDMaturityDate,
      maturityAmount: computedRDMaturityAmount,
      notes: rdNotes.trim()
    };

    if (editingItem) {
      editRD({ ...editingItem, ...payload });
    } else {
      addRD(payload);
    }
    setIsRDModalOpen(false);
  };

  const totalFDValuation = fds.reduce((acc, f) => acc + parseFloat(f.principalAmount || 0), 0);
  const totalFDMaturity = fds.reduce((acc, f) => acc + parseFloat(f.maturityAmount || 0), 0);
  const totalRDValuation = rds.reduce((acc, r) => acc + parseFloat(r.totalDeposited || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Bank Deposits
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Fixed & Recurring Deposits (FD / RD)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto maturity calculator, interest payout frequency & auto-renew/auto-close tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddFD}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-2xl text-xs sm:text-sm shadow-lg shadow-cyan-500/20 active-press"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add FD</span>
          </button>
          <button
            onClick={handleOpenAddRD}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-2xl text-xs sm:text-sm shadow-lg shadow-amber-500/20 active-press"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Add RD</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total FD Principal
          </span>
          <div className="text-xl sm:text-3xl font-black font-mono text-cyan-300 tracking-tight mt-1">
            ₹{Math.round(totalFDValuation).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Maturity Value: ₹{Math.round(totalFDMaturity).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total RD Capital
          </span>
          <div className="text-xl sm:text-3xl font-black font-mono text-amber-300 tracking-tight mt-1">
            ₹{Math.round(totalRDValuation).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Active RD Accounts: {rds.length}
          </span>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Combined Bank Deposits
          </span>
          <div className="text-xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight mt-1">
            ₹{Math.round(totalFDValuation + totalRDValuation).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Total Active Deposits: {fds.length + rds.length}
          </span>
        </div>
      </div>

      {/* Fixed Deposits (FD) Section */}
      <div className="mobile-card-glass rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Landmark className="w-5 h-5 text-cyan-400" /> Fixed Deposits ({fds.length})
          </h3>
          <button onClick={handleOpenAddFD} className="text-xs text-cyan-400 font-bold hover:underline">
            + New FD
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {fds.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-500 text-xs">
              No Fixed Deposits recorded. Click "+ Add FD" to add a bank FD with payout options and auto-renew settings.
            </div>
          ) : (
            fds.map(f => {
              const alertStatus = get15DayAlertStatus(f.maturityDate);
              const accountObj = accounts.find(a => a.id === f.accountId);
              return (
                <div key={f.id} className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {f.bankName || 'Bank FD'}
                        </span>
                        {accountObj && <span className="text-[10px] text-slate-500">• {accountObj.name}</span>}
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">{f.title}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditFD(f)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteFD(f.id)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Badges for Payout Frequency & Auto-Renew Action */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-cyan-300 border border-slate-700">
                      Interest: {f.payoutFrequency || 'At Maturity'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg border ${
                      (f.maturityAction || '').includes('Auto-Renew')
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}>
                      {f.maturityAction || 'Auto-Close'}
                    </span>
                  </div>

                  {/* 15-Day Alert Warning Badge */}
                  {alertStatus.isWithin15Days && (
                    <div className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between border ${
                      alertStatus.isMatured
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-bounce'
                    }`}>
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        {alertStatus.isMatured ? 'FD MATURED!' : `Maturing in ${alertStatus.daysLeft} days`}
                      </span>
                      <span className="text-[10px] underline">15-Day Warning</span>
                    </div>
                  )}

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Principal:</span>
                      <span className="font-bold text-white">₹{Math.round(f.principalAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Interest Rate:</span>
                      <span className="text-emerald-400 font-bold">{f.interestRate || 0}% p.a.</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Tenure:</span>
                      <span className="text-slate-300">{f.tenureMonths || 12} Months</span>
                    </div>

                    {f.periodicPayout > 0 && (
                      <div className="flex justify-between text-cyan-300 font-bold border-t border-slate-800/80 pt-1">
                        <span>Payout ({f.payoutFrequency}):</span>
                        <span>₹{Math.round(f.periodicPayout).toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-cyan-300 pt-1.5 border-t border-slate-800 font-bold">
                      <span>Maturity Amount:</span>
                      <span>₹{Math.round(f.maturityAmount || f.principalAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>Maturity Date:</span>
                      <span>{f.maturityDate || 'N/A'}</span>
                    </div>
                  </div>
                  {f.notes && <p className="text-[10px] text-slate-400 italic">"{f.notes}"</p>}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recurring Deposits (RD) Section */}
      <div className="mobile-card-glass rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-amber-400" /> Recurring Deposits ({rds.length})
          </h3>
          <button onClick={handleOpenAddRD} className="text-xs text-amber-400 font-bold hover:underline">
            + New RD
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {rds.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-500 text-xs">
              No Recurring Deposits recorded. Click "+ Add RD" to track monthly deposit schemes.
            </div>
          ) : (
            rds.map(r => {
              const alertStatus = get15DayAlertStatus(r.maturityDate);
              const accountObj = accounts.find(a => a.id === r.accountId);
              return (
                <div key={r.id} className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {r.bankName || 'Bank RD'}
                        </span>
                        {accountObj && <span className="text-[10px] text-slate-500">• {accountObj.name}</span>}
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">{r.title}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEditRD(r)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteRD(r.id)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {alertStatus.isWithin15Days && (
                    <div className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between border ${
                      alertStatus.isMatured
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-bounce'
                    }`}>
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        {alertStatus.isMatured ? 'RD MATURED!' : `Maturing in ${alertStatus.daysLeft} days`}
                      </span>
                    </div>
                  )}

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                      <span>Monthly Deposit:</span>
                      <span className="font-bold text-amber-300">₹{Math.round(r.monthlyInstallment || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Deposited:</span>
                      <span className="font-bold text-white">₹{Math.round(r.totalDeposited || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-amber-300 pt-1.5 border-t border-slate-800 font-bold">
                      <span>Maturity Amount:</span>
                      <span>₹{Math.round(r.maturityAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit FD Modal */}
      {isFDModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pt-safe pb-safe">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Landmark className="w-5 h-5 text-cyan-400" /> {editingItem ? 'Edit Fixed Deposit' : 'Add Fixed Deposit (FD)'}
            </h3>

            <form onSubmit={handleSaveFD} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Master Account</label>
                <select
                  value={fdAccountId}
                  onChange={(e) => setFdAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  {accounts.filter(a => a.id !== 'acc_all').map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Bank Name <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                  value={fdBankName}
                  onChange={(e) => setFdBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">FD Title / Scheme Name <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3-Year Tax Saver FD"
                  value={fdTitle}
                  onChange={(e) => setFdTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Principal Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 100000"
                    value={fdPrincipal}
                    onChange={(e) => setFdPrincipal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                  {fdPrincipal && parseFloat(fdPrincipal) > 0 && (
                    <span className="text-[10px] text-cyan-300 font-semibold mt-1 block font-mono">
                      {numberToWordsINR(fdPrincipal)}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 7.25"
                    value={fdRate}
                    onChange={(e) => setFdRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    placeholder="e.g. 12 or 36"
                    value={fdTenure}
                    onChange={(e) => setFdTenure(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={fdStartDate}
                    onChange={(e) => setFdStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* NEW FIELDS: Interest Payout Frequency & Maturity Action */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Interest Payout</label>
                  <select
                    value={fdPayoutFrequency}
                    onChange={(e) => setFdPayoutFrequency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold"
                  >
                    <option value="At Maturity">At Maturity (Cumulative)</option>
                    <option value="Monthly">Monthly Payout</option>
                    <option value="Quarterly">Quarterly Payout</option>
                    <option value="Yearly">Yearly Payout</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Maturity Action</label>
                  <select
                    value={fdMaturityAction}
                    onChange={(e) => setFdMaturityAction(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold"
                  >
                    <option value="Auto-Renew (Principal + Interest)">Auto-Renew (Principal + Interest)</option>
                    <option value="Auto-Renew (Principal Only)">Auto-Renew (Principal Only)</option>
                    <option value="Auto-Close & Credit to Account">Auto-Close & Credit to Account</option>
                  </select>
                </div>
              </div>

              {/* Auto Calculated Preview */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Maturity Date:</span>
                  <span className="text-white font-bold">{computedFDMaturityDate || 'N/A'}</span>
                </div>
                {computedFDMaturityObj.periodicPayout > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Periodic Interest Payout:</span>
                    <span>₹{Math.round(computedFDMaturityObj.periodicPayout).toLocaleString('en-IN')} / {fdPayoutFrequency.toLowerCase()}</span>
                  </div>
                )}
                <div className="flex justify-between text-cyan-300 font-bold">
                  <span>Maturity Amount:</span>
                  <span>₹{Math.round(computedFDMaturityObj.maturityAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsFDModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl">Save FD</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit RD Modal */}
      {isRDModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pt-safe pb-safe">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-amber-400" /> {editingItem ? 'Edit Recurring Deposit' : 'Add Recurring Deposit (RD)'}
            </h3>

            <form onSubmit={handleSaveRD} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Master Account</label>
                <select
                  value={rdAccountId}
                  onChange={(e) => setRdAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  {accounts.filter(a => a.id !== 'acc_all').map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Bank Name <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SBI, HDFC Bank"
                  value={rdBankName}
                  onChange={(e) => setRdBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">RD Title <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Wealth Builder RD"
                  value={rdTitle}
                  onChange={(e) => setRdTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Monthly Installment (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={rdInstallment}
                    onChange={(e) => setRdInstallment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                  {rdInstallment && parseFloat(rdInstallment) > 0 && (
                    <span className="text-[10px] text-amber-300 font-semibold mt-1 block font-mono">
                      {numberToWordsINR(rdInstallment)}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 6.8"
                    value={rdRate}
                    onChange={(e) => setRdRate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    placeholder="e.g. 12 or 24"
                    value={rdTenure}
                    onChange={(e) => setRdTenure(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={rdStartDate}
                    onChange={(e) => setRdStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Auto Calculated Preview */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Maturity Date:</span>
                  <span className="text-white font-bold">{computedRDMaturityDate || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-amber-300 font-bold">
                  <span>Auto Maturity Amount:</span>
                  <span>₹{Math.round(computedRDMaturityAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsRDModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl">Save RD</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
