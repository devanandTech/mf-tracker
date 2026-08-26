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
  Clock,
  Sparkles,
  PieChart,
  ShieldAlert
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

  // Calculate allocation percentages
  const totalNW = globalWealthSummary.totalNetWorth || 1;
  const mfPct = Math.round((globalWealthSummary.mfValuation / totalNW) * 100);
  const fdrdPct = Math.round(((globalWealthSummary.fdValuation + globalWealthSummary.rdValuation) / totalNW) * 100);
  const insPct = Math.max(0, 100 - mfPct - fdrdPct);

  return (
    <div className="space-y-6">
      
      {/* Global Account & Entity Filter Bar */}
      <div className="mobile-card-glass rounded-3xl p-3.5 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-800/80">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Portfolio View</span>
            <select
              value={activeAccountId}
              onChange={(e) => setActiveAccountId(e.target.value)}
              className="bg-transparent text-slate-100 font-extrabold text-xs sm:text-sm focus:outline-none cursor-pointer"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id} className="bg-slate-900 text-slate-100">{acc.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800/80 overflow-x-auto scrollbar-none w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Assets' },
            { id: 'MF', label: 'Mutual Funds' },
            { id: 'FDRD', label: 'FD & RD' },
            { id: 'INSURANCE', label: 'Insurance' }
          ].map(ent => (
            <button
              key={ent.id}
              onClick={() => setEntityFilter(ent.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all active-press whitespace-nowrap ${
                entityFilter === ent.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {ent.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Obsidian Net Worth Card */}
      <div className="obsidian-hero-card rounded-3xl p-5 sm:p-7 relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Live Net Worth
              </span>
              <span className="text-xs text-slate-400 font-semibold">• {activeAccountObj.name}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black font-mono text-white tracking-tight mt-2">
              ₹{Math.round(globalWealthSummary.totalNetWorth).toLocaleString('en-IN')}
            </h1>
          </div>

          <div className="hidden sm:flex p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Asset Distribution Progress Segment */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Asset Breakdown</span>
            <span>MF {mfPct}% • FD/RD {fdrdPct}%</span>
          </div>
          <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800/80">
            <div style={{ width: `${mfPct}%` }} className="bg-emerald-500 h-full transition-all duration-500" title="Mutual Funds" />
            <div style={{ width: `${fdrdPct}%` }} className="bg-cyan-400 h-full transition-all duration-500" title="FD & RD" />
            <div style={{ width: `${insPct}%` }} className="bg-teal-400 h-full transition-all duration-500" title="Insurance" />
          </div>
        </div>
      </div>

      {/* 15-DAY MATURITY & RENEWAL WARNING BANNER */}
      {upcomingAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-rose-950/90 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                <ShieldAlert className="w-5 h-5" />
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
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950 shadow-md">
              URGENT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {upcomingAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => setActiveTab(alert.entityType === 'INSURANCE' ? 'insurance' : 'fdrd')}
                className="bg-slate-950/90 border border-amber-500/40 p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:border-amber-400 transition-all active-press"
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
                  <span className="text-[9px] text-cyan-400 flex items-center justify-end gap-0.5 font-bold">
                    View <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Net Worth Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        
        {/* Mutual Funds Valuation Card */}
        <div
          onClick={() => setActiveTab('mf')}
          className="mobile-card-glass hover:border-emerald-500/50 rounded-3xl p-4 sm:p-5 shadow-xl cursor-pointer active-press transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">Mutual Funds</span>
            <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">
            ₹{Math.round(globalWealthSummary.mfValuation).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-semibold">
            {holdings.length} Active Schemes →
          </span>
        </div>

        {/* FD & RD Valuation Card */}
        <div
          onClick={() => setActiveTab('fdrd')}
          className="mobile-card-glass hover:border-cyan-500/50 rounded-3xl p-4 sm:p-5 shadow-xl cursor-pointer active-press transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-400">FD & RD Capital</span>
            <Landmark className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-cyan-300 mt-1">
            ₹{Math.round(globalWealthSummary.fdValuation + globalWealthSummary.rdValuation).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-semibold">
            Bank Deposits →
          </span>
        </div>

        {/* Insurance Cover Card */}
        <div
          onClick={() => setActiveTab('insurance')}
          className="mobile-card-glass hover:border-teal-500/50 rounded-3xl p-4 sm:p-5 shadow-xl cursor-pointer active-press transition-all group col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-400">Insurance Cover</span>
            <ShieldCheck className="w-4 h-4 text-teal-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-teal-300 mt-1">
            ₹{Math.round(globalWealthSummary.insuranceCover).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block font-semibold">
            Total Sum Assured →
          </span>
        </div>

      </div>

      {/* Asset Allocation & Performance Charts */}
      {(entityFilter === 'ALL' || entityFilter === 'MF') && (
        <>
          <PortfolioSummary />
          <PortfolioChart />
        </>
      )}

    </div>
  );
}
