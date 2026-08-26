import React, { useState, useMemo } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Layers,
  Calendar,
  DollarSign
} from 'lucide-react';

export default function BrokerPortfolioChart() {
  const { allTransactions, accounts, holdings, schemeDetailsMap } = usePortfolio();

  const [selectedAccountId, setSelectedAccountId] = useState('acc_all');
  const [selectedSchemeCode, setSelectedSchemeCode] = useState('all_schemes');
  const [timeframe, setTimeframe] = useState('ALL'); // '1M' | '3M' | '6M' | '1Y' | 'ALL'

  // Filtered transactions by account and scheme
  const filteredTxs = useMemo(() => {
    let txs = allTransactions;
    if (selectedAccountId !== 'acc_all') {
      txs = txs.filter(t => t.accountId === selectedAccountId || (!t.accountId && selectedAccountId === 'acc_groww'));
    }
    if (selectedSchemeCode !== 'all_schemes') {
      txs = txs.filter(t => parseInt(t.schemeCode, 10) === parseInt(selectedSchemeCode, 10));
    }
    return txs.sort((a, b) => {
      const partsA = (a.date || '').split('-').map(Number);
      const partsB = (b.date || '').split('-').map(Number);
      const dateA = new Date(partsA[2], partsA[1] - 1, partsA[0]);
      const dateB = new Date(partsB[2], partsB[1] - 1, partsB[0]);
      return dateA - dateB;
    });
  }, [allTransactions, selectedAccountId, selectedSchemeCode]);

  // Compute broker-style actual valuation curve over time
  const chartData = useMemo(() => {
    if (filteredTxs.length === 0) return [];

    // Map of scheme code to NAV data array
    const navHistoryByScheme = {};
    const relevantSchemeCodes = [...new Set(filteredTxs.map(t => parseInt(t.schemeCode, 10)))];

    relevantSchemeCodes.forEach(code => {
      const details = schemeDetailsMap[code];
      if (details && details.data) {
        navHistoryByScheme[code] = details.data;
      }
    });

    // Determine start date and end date
    const firstTx = filteredTxs[0];
    const parts = (firstTx.date || '').split('-').map(Number);
    const startDate = new Date(parts[2], parts[1] - 1, parts[0]);
    const endDate = new Date();

    // Timeframe filtering
    let filterCutoffDate = new Date(startDate);
    if (timeframe === '1M') {
      filterCutoffDate = new Date();
      filterCutoffDate.setMonth(filterCutoffDate.getMonth() - 1);
    } else if (timeframe === '3M') {
      filterCutoffDate = new Date();
      filterCutoffDate.setMonth(filterCutoffDate.getMonth() - 3);
    } else if (timeframe === '6M') {
      filterCutoffDate = new Date();
      filterCutoffDate.setMonth(filterCutoffDate.getMonth() - 6);
    } else if (timeframe === '1Y') {
      filterCutoffDate = new Date();
      filterCutoffDate.setFullYear(filterCutoffDate.getFullYear() - 1);
    }

    if (filterCutoffDate < startDate) filterCutoffDate = startDate;

    // Generate daily points for smooth valuation curve
    const points = [];
    const stepDays = 5; // Sampling interval in days for performance
    let curr = new Date(filterCutoffDate);

    while (curr <= endDate) {
      const dStr = curr.toISOString().split('T')[0];
      const [y, m, d] = dStr.split('-').map(Number);
      const currTime = new Date(y, m - 1, d).getTime();

      let cumUnitsByScheme = {};
      let cumInvestedCost = 0;

      // Sum transactions up to currTime
      filteredTxs.forEach(t => {
        const [td, tm, ty] = (t.date || '').split('-').map(Number);
        const txTime = new Date(ty, tm - 1, td).getTime();

        if (txTime <= currTime) {
          const code = parseInt(t.schemeCode, 10);
          if (!cumUnitsByScheme[code]) cumUnitsByScheme[code] = 0;

          if (t.type === 'BUY' || t.type === 'SIP') {
            cumUnitsByScheme[code] += parseFloat(t.units || 0);
            cumInvestedCost += parseFloat(t.amount || 0);
          } else if (t.type === 'SELL') {
            cumUnitsByScheme[code] -= parseFloat(t.units || 0);
            cumInvestedCost -= parseFloat(t.amount || 0);
          }
        }
      });

      // Calculate total valuation on this date using historical NAVs
      let totalValuation = 0;
      Object.keys(cumUnitsByScheme).forEach(code => {
        const units = cumUnitsByScheme[code];
        if (units > 0 && navHistoryByScheme[code]) {
          // Find NAV for dStr
          const navEntry = navHistoryByScheme[code].find(n => {
            const [nd, nm, ny] = (n.date || '').split('-').map(Number);
            const navDateStr = `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
            return navDateStr <= dStr;
          }) || navHistoryByScheme[code][0];

          if (navEntry) {
            totalValuation += units * parseFloat(navEntry.nav);
          }
        }
      });

      if (cumInvestedCost > 0 || totalValuation > 0) {
        points.push({
          date: curr.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
          rawDate: curr,
          invested: Math.round(Math.max(0, cumInvestedCost)),
          valuation: Math.round(Math.max(0, totalValuation)),
          profit: Math.round(totalValuation - cumInvestedCost)
        });
      }

      curr.setDate(curr.getDate() + stepDays);
    }

    return points;
  }, [filteredTxs, schemeDetailsMap, timeframe]);

  // Computed totals for selected filter
  const metrics = useMemo(() => {
    if (chartData.length === 0) {
      return { invested: 0, valuation: 0, profit: 0, profitPct: 0 };
    }
    const latest = chartData[chartData.length - 1];
    const invested = latest.invested;
    const valuation = latest.valuation;
    const profit = valuation - invested;
    const profitPct = invested > 0 ? ((profit / invested) * 100).toFixed(2) : 0;

    return { invested, valuation, profit, profitPct };
  }, [chartData]);

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
            <span>Net Gain/Loss:</span>
            <span>{data.profit >= 0 ? '+' : ''}₹{data.profit.toLocaleString('en-IN')}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
      
      {/* Top Header & Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Broker Analytics
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> Investment Growth & Valuation Curve
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time capital growth vs total cost filtered by Account and Scheme
          </p>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          
          {/* Master Account Filter */}
          <div className="flex-1 sm:flex-initial min-w-[130px]">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Specific Scheme Filter */}
          <div className="flex-1 sm:flex-initial min-w-[160px] max-w-[220px]">
            <select
              value={selectedSchemeCode}
              onChange={(e) => setSelectedSchemeCode(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 px-3 py-2 focus:outline-none focus:border-emerald-500 truncate"
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
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
            {['1M', '3M', '6M', '1Y', 'ALL'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
        <div>
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Current Valuation</span>
          <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
            ₹{metrics.valuation.toLocaleString('en-IN')}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Invested</span>
          <span className="text-base sm:text-lg font-black text-cyan-300 font-mono">
            ₹{metrics.invested.toLocaleString('en-IN')}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Returns</span>
          <span className={`text-base sm:text-lg font-black font-mono ${
            metrics.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {metrics.profit >= 0 ? '+' : ''}₹{metrics.profit.toLocaleString('en-IN')}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Absolute Gain</span>
          <span className={`text-base sm:text-lg font-black font-mono ${
            metrics.profitPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {metrics.profitPct >= 0 ? '+' : ''}{metrics.profitPct}%
          </span>
        </div>
      </div>

      {/* Recharts Area Chart */}
      {chartData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
          No investment history found for the selected filter combination. Record transactions to view your growth curve.
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
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
                type="monotone"
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
