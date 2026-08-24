import React, { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { findNAVForDate } from '../utils/dateUtils.js';
import {
  Sparkles,
  TrendingDown,
  TrendingUp,
  LineChart,
  Calendar,
  Filter,
  AlertTriangle,
  ArrowUpDown,
  ChevronRight
} from 'lucide-react';

export default function DipAnalyzer({ onOpenSchemeModal }) {
  const { holdings, setSelectedSchemeCode } = usePortfolio();

  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('drawdownATH');

  const holdingsWithCustom = holdings.map(h => {
    let customChangePct = null;
    if (customStartDate && h.navDataList && h.navDataList.length > 0) {
      const startNav = findNAVForDate(h.navDataList, customStartDate);
      const endNav = customEndDate
        ? findNAVForDate(h.navDataList, customEndDate)
        : h.currentNAV;

      if (startNav && startNav > 0 && endNav) {
        customChangePct = ((endNav - startNav) / startNav) * 100;
      }
    }
    return {
      ...h,
      customChangePct
    };
  });

  const filteredHoldings = holdingsWithCustom.filter(h => {
    if (selectedCategoryFilter === 'DIPS_ONLY') return Math.abs(h.drawdownATH) >= 2;
    if (selectedCategoryFilter === 'DEEP_DIPS') return Math.abs(h.drawdownATH) >= 5;
    return true;
  }).sort((a, b) => {
    if (sortBy === 'drawdownATH') return a.drawdownATH - b.drawdownATH;
    if (sortBy === 'dailyChangePct') return a.dailyChangePct - b.dailyChangePct;
    return a.schemeName.localeCompare(b.schemeName);
  });

  const getBadgeStyle = (status) => {
    switch (status.severity) {
      case 4:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      case 3:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 2:
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 1:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const handleOpenChart = (schemeCode) => {
    setSelectedSchemeCode(schemeCode);
    if (onOpenSchemeModal) onOpenSchemeModal(schemeCode);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">Timeframe & Performance Analyzer</h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Track 1D, 1W, 1M, 1Y, and custom date range returns across all holdings. Detect funds trading at a drawdown from peak for strategic dip buying.
            </p>
          </div>

          {/* Custom Date Selector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 text-slate-300 font-semibold w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Custom Date Range:</span>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-200 focus:outline-none text-xs w-full"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-slate-200 focus:outline-none text-xs w-full"
              />
            </div>
            {customStartDate && (
              <button
                onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                className="text-[10px] text-amber-400 hover:underline px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/80 border border-slate-800 rounded-2xl p-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <button
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`px-3 py-1 text-xs rounded-xl transition-colors font-semibold flex-shrink-0 active-press ${
              selectedCategoryFilter === 'ALL'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({holdings.length})
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('DIPS_ONLY')}
            className={`px-3 py-1 text-xs rounded-xl transition-colors font-semibold flex-shrink-0 active-press ${
              selectedCategoryFilter === 'DIPS_ONLY'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dips (-2%+)
          </button>
          <button
            onClick={() => setSelectedCategoryFilter('DEEP_DIPS')}
            className={`px-3 py-1 text-xs rounded-xl transition-colors font-semibold flex-shrink-0 active-press ${
              selectedCategoryFilter === 'DEEP_DIPS'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Deep (-5%+)
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 w-full sm:w-auto justify-end pt-1 sm:pt-0">
          <ArrowUpDown className="w-3.5 h-3.5" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
          >
            <option value="drawdownATH">Deepest Dip %</option>
            <option value="dailyChangePct">1D Drop %</option>
            <option value="schemeName">Name</option>
          </select>
        </div>
      </div>

      {/* MOBILE CARD VIEW (< 640px) */}
      <div className="space-y-3 sm:hidden">
        {filteredHoldings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs mobile-card-glass rounded-2xl">
            No matching holdings found.
          </div>
        ) : (
          filteredHoldings.map((item) => (
            <div
              key={item.schemeCode}
              className="mobile-card-glass rounded-2xl p-4 space-y-3 relative active-press"
              onClick={() => handleOpenChart(item.schemeCode)}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-tight">
                    {item.schemeName}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.fundHouse}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border flex-shrink-0 ${getBadgeStyle(item.dipStatus)}`}>
                  {item.dipStatus.label}
                </span>
              </div>

              {/* Price & 1D Change Row */}
              <div className="flex items-center justify-between bg-slate-900/60 rounded-xl p-2.5 border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block">Current NAV</span>
                  <span className="text-sm font-black font-mono text-white">₹{item.currentNAV.toFixed(2)}</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">1-Day Return</span>
                  <span className={`text-xs font-bold font-mono ${item.dailyChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.dailyChangePct >= 0 ? '+' : ''}{item.dailyChangePct.toFixed(2)}%
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">ATH Drawdown</span>
                  <span className={`text-xs font-extrabold font-mono ${item.drawdownATH >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.drawdownATH.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Timeframes Horizontal Pills */}
              <div className="flex items-center gap-2 overflow-x-auto text-[10px] font-mono scrollbar-none pt-1">
                <div className="bg-slate-800/80 px-2 py-1 rounded-lg flex flex-col items-center">
                  <span className="text-slate-500 text-[9px]">1W</span>
                  <span className={item.timeframesPct['1W'] >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {item.timeframesPct['1W'] >= 0 ? '+' : ''}{item.timeframesPct['1W'].toFixed(1)}%
                  </span>
                </div>

                <div className="bg-slate-800/80 px-2 py-1 rounded-lg flex flex-col items-center">
                  <span className="text-slate-500 text-[9px]">1M</span>
                  <span className={item.timeframesPct['1M'] >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {item.timeframesPct['1M'] >= 0 ? '+' : ''}{item.timeframesPct['1M'].toFixed(1)}%
                  </span>
                </div>

                <div className="bg-slate-800/80 px-2 py-1 rounded-lg flex flex-col items-center">
                  <span className="text-slate-500 text-[9px]">1Y</span>
                  <span className={item.timeframesPct['1Y'] >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {item.timeframesPct['1Y'] >= 0 ? '+' : ''}{item.timeframesPct['1Y'].toFixed(1)}%
                  </span>
                </div>

                {customStartDate && (
                  <div className="bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg flex flex-col items-center">
                    <span className="text-amber-400 text-[9px]">Custom</span>
                    {item.customChangePct !== null ? (
                      <span className={item.customChangePct >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {item.customChangePct >= 0 ? '+' : ''}{item.customChangePct.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold pt-1">
                <span className="flex items-center gap-1">
                  <LineChart className="w-3.5 h-3.5" /> Open Interactive Chart
                </span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>

            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW (≥ 640px) */}
      <div className="hidden sm:block bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Scheme Name</th>
                <th className="py-3.5 px-3">Current NAV</th>
                <th className="py-3.5 px-3 text-center">1-Day</th>
                <th className="py-3.5 px-3 text-center">1-Week</th>
                <th className="py-3.5 px-3 text-center">1-Month</th>
                <th className="py-3.5 px-3 text-center">1-Year</th>
                {customStartDate && (
                  <th className="py-3.5 px-3 text-center bg-amber-500/10 text-amber-400">
                    Custom Range %
                  </th>
                )}
                <th className="py-3.5 px-3 text-center">ATH & Drawdown</th>
                <th className="py-3.5 px-3 text-center">Dip Status</th>
                <th className="py-3.5 px-4 text-right">Chart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredHoldings.map((item) => (
                <tr key={item.schemeCode} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-4 px-4 font-semibold text-slate-100 max-w-xs">
                    <div className="truncate">{item.schemeName}</div>
                    <div className="text-[10px] text-slate-500 font-normal">NAV Date: {item.navDate}</div>
                  </td>

                  <td className="py-4 px-3 font-mono font-bold text-white">₹{item.currentNAV.toFixed(2)}</td>

                  <td className="py-4 px-3 text-center font-mono">
                    <div className={`font-bold ${item.dailyChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.dailyChangePct >= 0 ? '+' : ''}{item.dailyChangePct.toFixed(2)}%
                    </div>
                  </td>

                  <td className={`py-4 px-3 text-center font-mono font-semibold ${item.timeframesPct['1W'] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.timeframesPct['1W'] >= 0 ? '+' : ''}{item.timeframesPct['1W'].toFixed(2)}%
                  </td>

                  <td className={`py-4 px-3 text-center font-mono font-semibold ${item.timeframesPct['1M'] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.timeframesPct['1M'] >= 0 ? '+' : ''}{item.timeframesPct['1M'].toFixed(2)}%
                  </td>

                  <td className={`py-4 px-3 text-center font-mono font-semibold ${item.timeframesPct['1Y'] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.timeframesPct['1Y'] >= 0 ? '+' : ''}{item.timeframesPct['1Y'].toFixed(2)}%
                  </td>

                  {customStartDate && (
                    <td className="py-4 px-3 text-center font-mono font-bold bg-amber-500/5">
                      {item.customChangePct !== null ? (
                        <span className={item.customChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {item.customChangePct >= 0 ? '+' : ''}{item.customChangePct.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                  )}

                  <td className="py-4 px-3 text-center font-mono">
                    <div className="text-slate-300 font-medium text-[11px]">ATH: ₹{item.athNAV.toFixed(2)}</div>
                    <div className={`font-bold ${item.drawdownATH >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.drawdownATH.toFixed(2)}%
                    </div>
                  </td>

                  <td className="py-4 px-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${getBadgeStyle(item.dipStatus)}`}>
                      {item.dipStatus.severity > 0 && <AlertTriangle className="w-3 h-3" />}
                      {item.dipStatus.label}
                    </span>
                  </td>

                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => handleOpenChart(item.schemeCode)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 transition-all font-semibold text-xs active-press"
                    >
                      Chart
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
