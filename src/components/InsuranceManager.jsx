import React, { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { get15DayAlertStatus } from '../utils/interestUtils.js';
import { numberToWordsINR } from '../utils/numberUtils.js';
import {
  ShieldCheck,
  PlusCircle,
  AlertTriangle,
  Calendar,
  Trash2,
  Edit3,
  Building2,
  ShieldAlert
} from 'lucide-react';

export default function InsuranceManager() {
  const { insurances, addInsurance, editInsurance, deleteInsurance, accounts, activeAccountId } = usePortfolio();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);

  const firstAccId = accounts.find(a => a.id !== 'acc_all')?.id || 'acc_all';

  // Form state
  const [accountId, setAccountId] = useState(activeAccountId !== 'acc_all' ? activeAccountId : firstAccId);
  const [policyName, setPolicyName] = useState('');
  const [provider, setProvider] = useState('');
  const [policyType, setPolicyType] = useState('Health');
  const [policyNumber, setPolicyNumber] = useState('');
  const [sumAssured, setSumAssured] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [premiumFrequency, setPremiumFrequency] = useState('Yearly');
  const [nextDueDate, setNextDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingPolicy(null);
    setAccountId(activeAccountId !== 'acc_all' ? activeAccountId : firstAccId);
    setPolicyName('');
    setProvider('');
    setPolicyType('Health');
    setPolicyNumber('');
    setSumAssured('');
    setPremiumAmount('');
    setPremiumFrequency('3-Yearly (3 Years Direct)');
    setNextDueDate('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleEdit = (p) => {
    setEditingPolicy(p);
    setAccountId(p.accountId || (activeAccountId !== 'acc_all' ? activeAccountId : 'acc_groww'));
    setPolicyName(p.policyName || '');
    setProvider(p.provider || '');
    setPolicyType(p.policyType || 'Health');
    setPolicyNumber(p.policyNumber || '');
    setSumAssured(String(p.sumAssured || ''));
    setPremiumAmount(String(p.premiumAmount || ''));
    setPremiumFrequency(p.premiumFrequency || 'Yearly');
    setNextDueDate(p.nextDueDate || '');
    setNotes(p.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!policyName.trim() || !provider.trim() || !premiumAmount) {
      alert('Please enter Policy Name, Provider, and Premium Amount');
      return;
    }

    const payload = {
      accountId,
      policyName: policyName.trim(),
      provider: provider.trim(),
      policyType,
      policyNumber: policyNumber.trim(),
      sumAssured: parseFloat(sumAssured || 0),
      premiumAmount: parseFloat(premiumAmount || 0),
      premiumFrequency,
      nextDueDate,
      notes: notes.trim()
    };

    if (editingPolicy) {
      editInsurance({ ...editingPolicy, ...payload });
    } else {
      addInsurance(payload);
    }
    setIsModalOpen(false);
  };

  const totalSumAssured = insurances.reduce((acc, p) => acc + parseFloat(p.sumAssured || 0), 0);
  
  // Calculate normalized annual recurring premium based on frequency (including 3-Year & 2-Year policies!)
  const totalAnnualPremiums = insurances.reduce((acc, p) => {
    const amt = parseFloat(p.premiumAmount || 0);
    const freq = p.premiumFrequency || 'Yearly';
    if (freq.includes('3-Year') || freq.includes('3 Years')) return acc + (amt / 3);
    if (freq.includes('2-Year') || freq.includes('2 Years')) return acc + (amt / 2);
    if (freq.includes('Half-Yearly')) return acc + (amt * 2);
    if (freq.includes('Quarterly')) return acc + (amt * 4);
    if (freq.includes('Monthly')) return acc + (amt * 12);
    if (freq.includes('Single') || freq.includes('One-Time')) return acc;
    return acc + amt; // Default Yearly
  }, 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Protection Policies
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Insurance Policies & Renewals
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track Health, Term, Life & Vehicle policies (supporting 1-Year, 2-Year & 3-Year direct payments)
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-2xl text-xs sm:text-sm shadow-lg shadow-teal-500/20 active-press"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Add Policy</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Sum Assured (Coverage)
          </span>
          <div className="text-xl sm:text-3xl font-black font-mono text-teal-300 tracking-tight mt-1">
            ₹{Math.round(totalSumAssured).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Active Policies: {insurances.length}
          </span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Normalized Annual Premiums
          </span>
          <div className="text-xl sm:text-3xl font-black font-mono text-amber-300 tracking-tight mt-1">
            ₹{Math.round(totalAnnualPremiums).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Annualized Recurring Protection Cost
          </span>
        </div>
      </div>

      {/* Policy Feed Grid */}
      <div className="mobile-card-glass rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" /> Managed Policies ({insurances.length})
          </h3>
          <button onClick={handleOpenAdd} className="text-xs text-teal-400 font-bold hover:underline">
            + New Policy
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {insurances.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-500 text-xs">
              No insurance policies recorded. Click "+ Add Policy" to track health, term, or life policies.
            </div>
          ) : (
            insurances.map(p => {
              const alertStatus = get15DayAlertStatus(p.nextDueDate);
              const accountObj = accounts.find(a => a.id === p.accountId);
              return (
                <div key={p.id} className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 space-y-3 shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                          {p.policyType || 'Policy'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">• {p.provider}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">{p.policyName}</h4>
                      {p.policyNumber && <span className="text-[10px] text-slate-500 font-mono">Policy #: {p.policyNumber}</span>}
                    </div>

                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteInsurance(p.id)} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 15-Day Renewal Alert */}
                  {alertStatus.isWithin15Days && (
                    <div className={`p-2 rounded-xl text-xs font-bold flex items-center justify-between border ${
                      alertStatus.isMatured
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-bounce'
                    }`}>
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        {alertStatus.isMatured ? 'PREMIUM OVERDUE!' : `Renewal Due in ${alertStatus.daysLeft} days`}
                      </span>
                    </div>
                  )}

                  <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-teal-300 font-bold">
                      <span>Sum Assured:</span>
                      <span>₹{Math.round(p.sumAssured || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Premium ({p.premiumFrequency}):</span>
                      <span className="font-bold text-amber-300">₹{Math.round(p.premiumAmount || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>Next Renewal Due:</span>
                      <span className="text-white font-bold">{p.nextDueDate || 'N/A'}</span>
                    </div>
                  </div>

                  {p.notes && <p className="text-[10px] text-slate-400 italic">"{p.notes}"</p>}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Policy Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pt-safe pb-safe">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" /> {editingPolicy ? 'Edit Insurance Policy' : 'Add Insurance Policy'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Master Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200"
                >
                  {accounts.filter(a => a.id !== 'acc_all').map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Policy Title / Name <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Optima Secure Health (3 Years)"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Insurer / Provider <span className="text-rose-400">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Ergo, Niva Bupa, Star Health"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Policy Type</label>
                  <select
                    value={policyType}
                    onChange={(e) => setPolicyType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold"
                  >
                    <option value="Health">Health Insurance</option>
                    <option value="Term">Term Life</option>
                    <option value="Life">Life Insurance (ULIP/Endowment)</option>
                    <option value="Vehicle">Vehicle Insurance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Sum Assured (Cover ₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000000"
                    value={sumAssured}
                    onChange={(e) => setSumAssured(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                  {sumAssured && parseFloat(sumAssured) > 0 && (
                    <span className="text-[10px] text-teal-300 font-semibold mt-1 block font-mono">
                      {numberToWordsINR(sumAssured)}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Premium Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 35000"
                    value={premiumAmount}
                    onChange={(e) => setPremiumAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                  />
                  {premiumAmount && parseFloat(premiumAmount) > 0 && (
                    <span className="text-[10px] text-amber-300 font-semibold mt-1 block font-mono">
                      {numberToWordsINR(premiumAmount)}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Premium Payment Cycle</label>
                  <select
                    value={premiumFrequency}
                    onChange={(e) => setPremiumFrequency(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-semibold"
                  >
                    <option value="3-Yearly (3 Years Direct)">3-Yearly (3 Years Direct)</option>
                    <option value="2-Yearly (2 Years Direct)">2-Yearly (2 Years Direct)</option>
                    <option value="Yearly">Yearly (Annual)</option>
                    <option value="Half-Yearly">Half-Yearly (6 Months)</option>
                    <option value="Quarterly">Quarterly (3 Months)</option>
                    <option value="Monthly">Monthly (1 Month)</option>
                    <option value="Single Premium / One-Time">Single Premium / One-Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Next Premium / Renewal Due Date</label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl">Save Policy</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
