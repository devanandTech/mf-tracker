import React from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function PortfolioSummary() {
  const { summary, holdings, loadingDetails } = usePortfolio();

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const deepDipsCount = holdings.filter(h => Math.abs(h.drawdownATH) >= 5).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4.5 mb-4 sm:mb-6">
      
      {/* Current Valuation Card */}
      <div className="mobile-card-glass rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">
            Current Value
          </span>
          <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="text-xl sm:text-3xl font-black text-white tracking-tight font-mono">
          {loadingDetails ? (
            <span className="animate-pulse text-slate-500 text-sm">Fetching...</span>
          ) : (
            formatINR(summary.totalValuation)
          )}
        </div>
        <div className="mt-3 text-[10px] sm:text-xs text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
          <span>Active Holdings</span>
          <span className="font-extrabold text-slate-200">{summary.activeSchemesCount} Funds</span>
        </div>
      </div>

      {/* Invested Capital Card */}
      <div className="mobile-card-glass rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-cyan-500/40 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">
            Invested Amount
          </span>
          <div className="p-2 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className="text-xl sm:text-3xl font-black text-slate-200 tracking-tight font-mono">
          {formatINR(summary.totalInvested)}
        </div>
        <div className="mt-3 text-[10px] sm:text-xs text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
          <span>Cost Basis</span>
          <span className="font-semibold text-slate-300">Principal</span>
        </div>
      </div>

      {/* Total Profit / Loss Card */}
      <div className="mobile-card-glass rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">
            Overall Gain
          </span>
          <div className={`p-2 rounded-2xl border ${
            summary.totalReturnINR >= 0
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {summary.totalReturnINR >= 0 ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />}
          </div>
        </div>
        <div className={`text-xl sm:text-3xl font-black tracking-tight font-mono ${
          summary.totalReturnINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {summary.totalReturnINR >= 0 ? '+' : ''}{formatINR(summary.totalReturnINR)}
        </div>
        <div className="mt-3 text-[10px] sm:text-xs border-t border-slate-800/80 pt-2 flex items-center justify-between">
          <span className="text-slate-400">Total Return</span>
          <span className={`px-2 py-0.5 rounded-lg font-black font-mono text-[11px] ${
            summary.totalReturnPct >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            {summary.totalReturnPct >= 0 ? '+' : ''}{summary.totalReturnPct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 1-Day Change Card */}
      <div className="mobile-card-glass rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">
            1-Day Change
          </span>
          <div className={`p-2 rounded-2xl border ${
            summary.todayGainINR >= 0
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
        <div className={`text-xl sm:text-3xl font-black tracking-tight font-mono ${
          summary.todayGainINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {summary.todayGainINR >= 0 ? '+' : ''}{formatINR(summary.todayGainINR)}
        </div>
        <div className="mt-3 text-[10px] sm:text-xs border-t border-slate-800/80 pt-2 flex items-center justify-between">
          <span className="text-slate-400">1D Return</span>
          <div className="flex items-center gap-1.5 font-mono font-extrabold">
            <span className={`px-2 py-0.5 rounded-lg text-[11px] ${summary.todayGainPct >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
              {summary.todayGainPct >= 0 ? '+' : ''}{summary.todayGainPct.toFixed(2)}%
            </span>
            {deepDipsCount > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-md font-extrabold">
                {deepDipsCount} Dips
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
