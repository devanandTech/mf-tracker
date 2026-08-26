import React from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Clock
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

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 mb-3 sm:mb-5">
      
      {/* Current Valuation Card */}
      <div className="mobile-card-glass rounded-2xl p-3 sm:p-3.5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Current Value
          </span>
          <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wallet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-lg sm:text-2xl font-black text-white tracking-tight font-mono">
          {loadingDetails ? (
            <span className="animate-pulse text-slate-500 text-xs">Fetching...</span>
          ) : (
            formatINR(summary.totalValuation)
          )}
        </div>
        <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 flex items-center justify-between font-mono">
          <span className="font-sans font-semibold">Holdings</span>
          <span className="font-bold text-slate-200">{summary.activeSchemesCount} Funds</span>
        </div>
      </div>

      {/* Invested Capital Card */}
      <div className="mobile-card-glass rounded-2xl p-3 sm:p-3.5 shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Invested Amount
          </span>
          <div className="p-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <PiggyBank className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-lg sm:text-2xl font-black text-slate-200 tracking-tight font-mono">
          {formatINR(summary.totalInvested)}
        </div>
        <div className="mt-2 text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 flex items-center justify-between font-mono">
          <span className="font-sans font-semibold">Cost Basis</span>
          <span className="font-semibold text-slate-300">Principal</span>
        </div>
      </div>

      {/* Total Profit / Loss Card */}
      <div className="mobile-card-glass rounded-2xl p-3 sm:p-3.5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Overall Gain
          </span>
          <div className={`p-1.5 rounded-xl border ${
            summary.totalReturnINR >= 0
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {summary.totalReturnINR >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          </div>
        </div>
        <div className={`text-lg sm:text-2xl font-black tracking-tight font-mono ${
          summary.totalReturnINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {summary.totalReturnINR >= 0 ? '+' : ''}{formatINR(summary.totalReturnINR)}
        </div>
        <div className="mt-2 text-[10px] border-t border-slate-800/80 pt-1.5 flex items-center justify-between font-mono">
          <span className="text-slate-400 font-sans font-semibold">Total Return</span>
          <span className={`px-1.5 py-0.2 rounded-md font-bold text-[10px] ${
            summary.totalReturnPct >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            {summary.totalReturnPct >= 0 ? '+' : ''}{summary.totalReturnPct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 1-Day Change Card */}
      <div className="mobile-card-glass rounded-2xl p-3 sm:p-3.5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            1-Day Change
          </span>
          <div className={`p-1.5 rounded-xl border ${
            summary.todayGainINR >= 0
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className={`text-lg sm:text-2xl font-black tracking-tight font-mono ${
          summary.todayGainINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {summary.todayGainINR >= 0 ? '+' : ''}{formatINR(summary.todayGainINR)}
        </div>
        <div className="mt-2 text-[10px] border-t border-slate-800/80 pt-1.5 flex items-center justify-between font-mono">
          <span className="text-slate-400 font-sans font-semibold">1D Return</span>
          <div className="flex items-center gap-1 font-bold">
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${summary.todayGainPct >= 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
              {summary.todayGainPct >= 0 ? '+' : ''}{summary.todayGainPct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
