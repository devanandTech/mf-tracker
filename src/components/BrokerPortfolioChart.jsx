import React, { useState, useMemo } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { buildValuationSeries, calculatePortfolioSummary } from '../utils/calculations.js';
import { getStartDateForTimeframe } from '../utils/dateUtils.js';
import { formatCompactINR } from '../utils/numberUtils.js';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function BrokerPortfolioChart() {
  // transactions / holdings already follow the Portfolio View account and AMC filter,
  // so this chart always describes the same portfolio as the summary cards
  const { transactions, holdings, exitedHoldings, schemeDetailsMap } = usePortfolio();

  const [selectedSchemeCode, setSelectedSchemeCode] = useState('all_schemes');
  const [timeframe, setTimeframe] = useState('ALL'); // '1M' | '3M' | '6M' | '1Y' | 'ALL'

  // A scheme that was fully redeemed or filtered out falls back to the whole portfolio
  const activeSchemeCode = holdings.some(h => String(h.schemeCode) === String(selectedSchemeCode))
    ? selectedSchemeCode
    : 'all_schemes';

  const scopedHoldings = useMemo(() => {
    if (activeSchemeCode === 'all_schemes') return holdings;
    return holdings.filter(h => String(h.schemeCode) === String(activeSchemeCode));
  }, [holdings, activeSchemeCode]);

  const scopedTxs = useMemo(() => {
    const scoped = activeSchemeCode === 'all_schemes' ? [...holdings, ...exitedHoldings] : scopedHoldings;
    const codes = new Set(scoped.map(h => parseInt(h.schemeCode, 10)));
    return transactions.filter(t => codes.has(parseInt(t.schemeCode, 10)));
  }, [transactions, holdings, exitedHoldings, scopedHoldings, activeSchemeCode]);

  // Invested cost vs market value for every day since the first purchase
  const chartData = useMemo(() => {
    return buildValuationSeries(scopedTxs, schemeDetailsMap, { from: getStartDateForTimeframe(timeframe) });
  }, [scopedTxs, schemeDetailsMap, timeframe]);

  // Same math as the summary cards, so the banner can never disagree with them
  const metrics = useMemo(() => {
    const exited = activeSchemeCode === 'all_schemes' ? exitedHoldings : [];
    return calculatePortfolioSummary(scopedHoldings, exited);
  }, [scopedHoldings, exitedHoldings, activeSchemeCode]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-2xl shadow-2xl text-xs space-y-1.5 font-mono">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1">{label}</p>
          <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
            <span>Portfolio Value:</span>
            <span>₹{data.valuation.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-cyan-300">
            <span>Invested Cost:</span>
            <span>₹{data.invested.toLocaleString('en-IN')}</span>
          </div>
          <div className={`flex items-center justify-between gap-4 font-bold border-t border-slate-800 pt-1 ${
            data.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            <span>Unrealised Gain/Loss:</span>
            <span>{data.profit >= 0 ? '+' : '-'}₹{Math.abs(data.profit).toLocaleString('en-IN')}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatRupees = (val) => `₹${Math.round(Math.abs(val)).toLocaleString('en-IN')}`;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3.5">

      {/* Top Header & Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.2 rounded-md text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Broker Analytics
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Investment Growth & Valuation Curve
          </h3>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">

          {/* Specific Scheme Filter */}
          <div className="flex-1 sm:flex-initial min-w-[150px] max-w-[240px]">
            <select
              value={activeSchemeCode}
              onChange={(e) => setSelectedSchemeCode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 truncate"
            >
              <option value="all_schemes">All Portfolio Schemes</option>
              {holdings.map(h => (
                <option key={h.schemeCode} value={h.schemeCode}>
                  {h.schemeName}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center bg-slate-800/90 p-0.5 rounded-xl border border-slate-700/80">
            {['1M', '3M', '6M', '1Y', 'ALL'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all ${
                  timeframe === tf
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Selected Filter Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 p-2.5 sm:p-3 rounded-xl border border-slate-800/80">
        <div>
          <span className="text-[9px] text-slate-400 font-semibold uppercase block">Current Valuation</span>
          <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
            {formatRupees(metrics.totalValuation)}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 font-semibold uppercase block">Invested (Cost of Units Held)</span>
          <span className="text-sm sm:text-base font-black text-cyan-300 font-mono">
            {formatRupees(metrics.totalInvested)}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 font-semibold uppercase block">Unrealised Returns</span>
          <span className={`text-sm sm:text-base font-black font-mono ${
            metrics.totalReturnINR >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {metrics.totalReturnINR >= 0 ? '+' : '-'}{formatRupees(metrics.totalReturnINR)}
            <span className="text-[10px] font-bold"> ({metrics.totalReturnPct >= 0 ? '+' : ''}{metrics.totalReturnPct.toFixed(2)}%)</span>
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 font-semibold uppercase block">XIRR (Annualised)</span>
          {metrics.xirr === null ? (
            <span className="text-sm sm:text-base font-black font-mono text-slate-500" title="Needs at least 30 days of history">—</span>
          ) : (
            <span className={`text-sm sm:text-base font-black font-mono ${
              metrics.xirr >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {metrics.xirr >= 0 ? '+' : ''}{metrics.xirr.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* Recharts Area Chart */}
      {chartData.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-slate-500 text-xs text-center px-4">
          No investment history found for the selected filter combination. Record transactions to view your growth curve.
        </div>
      ) : (
        <div className="h-56 sm:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} minTickGap={32} />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                width={52}
                tickFormatter={formatCompactINR}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="valuation"
                name="Current Valuation"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#valGrad)"
              />
              <Area
                type="stepAfter"
                dataKey="invested"
                name="Invested Amount"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#invGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
}
