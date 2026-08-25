import React from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import PortfolioSummary from './PortfolioSummary.jsx';
import PortfolioChart from './PortfolioChart.jsx';
import {
  TrendingUp,
  AlertTriangle,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Building2,
  ChevronRight,
  Filter,
  Layers,
  ArrowUpRight,
  Clock
} from 'lucide-react';

export default function DashboardOverview() {
  const {
    upcomingAlerts,
    globalWealthSummary,
    accounts,
    activeAccountId,
    setActiveAccountId,
    entityFilter,
    setEntityFilter,
    setActiveTab,
    holdings
  } = usePortfolio();

  const activeAccountObj = accounts.find(a => a.id === activeAccountId) || { name: 'All Accounts' };

  return (
    <div className="space-y-6">
      
      {/* Global Filter Bar */}
      <div className="mobile-card-glass rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200">Global Account Filter:</span>
          <select
            value={activeAccountId}
            onChange={(e) => setActiveAccountId(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'ALL', label: 'All Entities' },
            { id: 'MF', label: 'Mutual Funds' },
            { id: 'FDRD', label: 'FD & RD' },
            { id: 'INSURANCE', label: 'Insurance' }
          ].map(ent => (
            <button
              key={ent.id}
              onClick={() => setEntityFilter(ent.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all active-press ${
                entityFilter === ent.id
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {ent.label}
            </button>
          ))}
        </div>
      </div>

      {/* 15-DAY MATURITY & RENEWAL WARNING BANNER */}
      {upcomingAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-rose-950/80 border-2 border-amber-500/50 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-amber-300 tracking-tight">
                  15-Day Renewal & Maturity Alerts ({upcomingAlerts.length})
                </h3>
                <p className="text-[11px] text-amber-200/80">
                  Action required for deposits maturing or insurance premiums due within 15 days
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950">
              URGENT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {upcomingAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => setActiveTab(alert.entityType === 'INSURANCE' ? 'insurance' : 'fdrd')}
                className="bg-slate-950/90 border border-amber-500/40 p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400 transition-all active-press"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="px-2 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {alert.entityType}
                    </span>
                    <span className="text-[10px] text-slate-400">• {alert.bankName || alert.provider}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{alert.title}</h4>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    Target: {alert.targetDate} ({alert.daysLeft < 0 ? 'OVERDUE' : `${alert.daysLeft} days left`})
                  </span>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-black font-mono text-emerald-400 block">
                    ₹{Math.round(alert.amount || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-cyan-400 flex items-center justify-end gap-0.5">
                    View <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Net Worth Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Net Worth */}
        <div className="bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-xl">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
            Net Worth ({activeAccountObj.name})
          </span>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight mt-1">
            ₹{Math.round(globalWealthSummary.totalNetWorth).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Combined portfolio valuation
          </span>
        </div>

        {/* Mutual Funds Valuation */}
        <div
          onClick={() => setActiveTab('mf')}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-xl cursor-pointer active-press transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Mutual Funds</span>
            <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            ₹{Math.round(globalWealthSummary.mfValuation).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {holdings.length} Active Schemes →
          </span>
        </div>

        {/* FD & RD Valuation */}
        <div
          onClick={() => setActiveTab('fdrd')}
          className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-3xl p-4 sm:p-5 shadow-xl cursor-pointer active-press transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">FD & RD Capital</span>
            <Landmark className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300">
            ₹{Math.round(globalWealthSummary.fdValuation + globalWealthSummary.rdValuation).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Bank Deposits →
          </span>
        </div>

        {/* Insurance Cover */}
        <div
          onClick={() => setActiveTab('insurance')}
          className="bg-slate-900/90 border border-slate-800 hover:border-teal-500/40 rounded-3xl p-4 sm:p-5 shadow-xl cursor-pointer active-press transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Insurance Cover</span>
            <ShieldCheck className="w-4 h-4 text-teal-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-teal-300">
            ₹{Math.round(globalWealthSummary.insuranceCover).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Total Policy Sum Assured →
          </span>
        </div>

      </div>

      {/* Asset Allocation & Performance Chart */}
      {(entityFilter === 'ALL' || entityFilter === 'MF') && (
        <>
          <PortfolioSummary />
          <PortfolioChart />
        </>
      )}

    </div>
  );
}
