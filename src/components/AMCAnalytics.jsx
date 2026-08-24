import React from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  PieChart,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';

export default function AMCAnalytics({ onSelectAMC }) {
  const { amcBreakdown, setSelectedAMCFilter, setActiveTab } = usePortfolio();

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const handleAMCFilterClick = (amcName) => {
    setSelectedAMCFilter(amcName);
    if (onSelectAMC) onSelectAMC(amcName);
    setActiveTab('dashboard');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-slate-900 border border-teal-500/30 p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-teal-400" />
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">AMC & Fund House Performance Analysis</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Evaluate which Asset Management Company (AMC) provides the highest returns across your portfolio investments.
            </p>
          </div>
        </div>
      </div>

      {/* AMC Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {amcBreakdown.map((amc) => (
          <div
            key={amc.amcName}
            onClick={() => handleAMCFilterClick(amc.amcName)}
            className="mobile-card-glass rounded-2xl p-4 sm:p-5 space-y-3 cursor-pointer active-press hover:border-teal-500/40 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">Asset Management Co.</span>
                <h3 className="text-sm sm:text-base font-extrabold text-white line-clamp-1">{amc.amcName}</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/30">
                {amc.schemesCount} {amc.schemesCount === 1 ? 'Scheme' : 'Schemes'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block">Invested</span>
                <span className="text-xs font-bold text-slate-300">₹{Math.round(amc.totalInvested).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Valuation</span>
                <span className="text-xs font-extrabold text-white">₹{Math.round(amc.currentValuation).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Profit / Loss</span>
                <div className={`text-sm font-extrabold font-mono flex items-center gap-1 ${
                  amc.totalReturnINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {amc.totalReturnINR >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{amc.totalReturnINR >= 0 ? '+' : ''}{formatINR(amc.totalReturnINR)}</span>
                  <span className="text-[11px] font-bold">({amc.totalReturnPct >= 0 ? '+' : ''}{amc.totalReturnPct.toFixed(1)}%)</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500" />
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
