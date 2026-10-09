import React from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import PortfolioSummary from './PortfolioSummary.jsx';
import PortfolioChart from './PortfolioChart.jsx';
import BrokerPortfolioChart from './BrokerPortfolioChart.jsx';
import AMCFilterChip from './AMCFilterChip.jsx';
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

  const showMF = entityFilter === 'ALL' || entityFilter === 'MF';
  const showFDRD = entityFilter === 'ALL' || entityFilter === 'FDRD';
  const showInsurance = entityFilter === 'ALL' || entityFilter === 'INSURANCE';

  // Net worth counts assets only (insurance cover is protection, not an asset), scoped by the asset filter
  const assetSegments = [
    { id: 'mf', label: 'MF', title: 'Mutual Funds', value: showMF ? globalWealthSummary.mfValuation : 0, color: 'bg-emerald-500' },
    { id: 'fd', label: 'FD', title: 'Fixed Deposits', value: showFDRD ? globalWealthSummary.fdValuation : 0, color: 'bg-cyan-400' },
    { id: 'rd', label: 'RD', title: 'Recurring Deposits', value: showFDRD ? globalWealthSummary.rdValuation : 0, color: 'bg-amber-400' }
  ].filter(seg => seg.value > 0);

  const displayedNetWorth = assetSegments.reduce((acc, seg) => acc + seg.value, 0);
  const isInsuranceOnly = entityFilter === 'INSURANCE';
  const heroValue = isInsuranceOnly ? globalWealthSummary.insuranceCover : displayedNetWorth;
  const formatPct = (value) => {
    const pct = (value / displayedNetWorth) * 100;
    return pct >= 10 || pct === 0 ? pct.toFixed(0) : pct.toFixed(1);
  };

  return (
    <div className="space-y-4">
      
      {/* Global Account & Entity Filter Bar */}
      <div className="mobile-card-glass rounded-2xl p-2.5 sm:p-3 shadow-lg flex flex-wrap items-center justify-between gap-2.5 border border-slate-800/80">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Filter className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase">Portfolio View</span>
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

        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 overflow-x-auto scrollbar-none w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Assets' },
            { id: 'MF', label: 'Mutual Funds' },
            { id: 'FDRD', label: 'FD & RD' },
            { id: 'INSURANCE', label: 'Insurance' }
          ].map(ent => (
            <button
              key={ent.id}
              onClick={() => setEntityFilter(ent.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all active-press whitespace-nowrap ${
                entityFilter === ent.id
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {ent.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Obsidian Net Worth Card */}
      <div className="obsidian-hero-card rounded-2xl p-4 sm:p-5 relative shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="px-2 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {isInsuranceOnly ? 'Total Insurance Cover' : entityFilter === 'ALL' ? 'Live Net Worth' : 'Current Value'}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">• {activeAccountObj.name}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black font-mono text-white tracking-tight mt-1">
              ₹{Math.round(heroValue).toLocaleString('en-IN')}
            </h1>
          </div>

          <div className="hidden sm:flex p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Asset Distribution Progress Segment */}
        {!isInsuranceOnly && (
          <div className="mt-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>Asset Breakdown</span>
              <span>
                {assetSegments.length === 0
                  ? 'No assets recorded yet'
                  : assetSegments.map(seg => `${seg.label} ${formatPct(seg.value)}%`).join(' • ')}
              </span>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800/80">
              {assetSegments.map(seg => (
                <div
                  key={seg.id}
                  style={{ width: `${(seg.value / displayedNetWorth) * 100}%` }}
                  className={`${seg.color} h-full transition-all duration-500`}
                  title={`${seg.title}: ₹${Math.round(seg.value).toLocaleString('en-IN')}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 15-DAY MATURITY & RENEWAL WARNING BANNER */}
      {upcomingAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-rose-950/90 border border-amber-500/60 rounded-2xl p-3 sm:p-4 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-amber-300 tracking-tight">
                  15-Day Renewal & Maturity Alerts ({upcomingAlerts.length})
                </h3>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500 text-slate-950 shadow-sm">
              URGENT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pt-0.5">
            {upcomingAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => setActiveTab(alert.entityType === 'INSURANCE' ? 'insurance' : 'fdrd')}
                className="bg-slate-950/90 border border-amber-500/40 p-2.5 rounded-xl flex items-center justify-between gap-2.5 cursor-pointer hover:border-amber-400 transition-all active-press"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {alert.entityType}
                    </span>
                    <span className="text-[9px] text-slate-400">• {alert.bankName || alert.provider}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{alert.title}</h4>
                  <span className="text-[9px] text-amber-400 font-mono font-bold">
                    Target: {alert.targetDate} ({alert.daysLeft < 0 ? 'OVERDUE' : `${alert.daysLeft}d left`})
                  </span>
                </div>

                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-black font-mono text-emerald-400 block">
                    ₹{Math.round(alert.amount || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-cyan-400 flex items-center justify-end gap-0.5 font-bold">
                    View <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Net Worth Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        
        {/* Mutual Funds Valuation Card */}
        {showMF && <div
          onClick={() => setActiveTab('mf')}
          className="mobile-card-glass hover:border-emerald-500/50 rounded-2xl p-3 sm:p-3.5 shadow-lg cursor-pointer active-press transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">Mutual Funds</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-emerald-400 mt-0.5">
            ₹{Math.round(globalWealthSummary.mfValuation).toLocaleString('en-IN')}
          </div>
          <span className="text-[9px] text-slate-400 mt-0.5 block font-semibold">
            {holdings.length} Active Schemes →
          </span>
        </div>}

        {/* FD & RD Valuation Card */}
        {showFDRD && <div
          onClick={() => setActiveTab('fdrd')}
          className="mobile-card-glass hover:border-cyan-500/50 rounded-2xl p-3 sm:p-3.5 shadow-lg cursor-pointer active-press transition-all group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400">FD & RD Value</span>
            <Landmark className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-cyan-300 mt-0.5">
            ₹{Math.round(globalWealthSummary.fdValuation + globalWealthSummary.rdValuation).toLocaleString('en-IN')}
          </div>
          <span className="text-[9px] text-slate-400 mt-0.5 block font-semibold">
            Deposits + accrued interest →
          </span>
        </div>}

        {/* Insurance Cover Card */}
        {showInsurance && <div
          onClick={() => setActiveTab('insurance')}
          className="mobile-card-glass hover:border-teal-500/50 rounded-2xl p-3 sm:p-3.5 shadow-lg cursor-pointer active-press transition-all group col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400">Insurance Cover</span>
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono text-teal-300 mt-0.5">
            ₹{Math.round(globalWealthSummary.insuranceCover).toLocaleString('en-IN')}
          </div>
          <span className="text-[9px] text-slate-400 mt-0.5 block font-semibold">
            Total Sum Assured →
          </span>
        </div>}

      </div>

      {/* Asset Allocation & Performance Charts */}
      {showMF && (
        <>
          <AMCFilterChip />
          <PortfolioSummary />
          <BrokerPortfolioChart />
          <PortfolioChart />
        </>
      )}

    </div>
  );
}
