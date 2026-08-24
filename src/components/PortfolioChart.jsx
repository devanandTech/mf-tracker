import React, { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { PieChart as PieIcon, TrendingUp, Layers } from 'lucide-react';

const COLOR_PALETTE = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#f97316'  // Orange
];

export default function PortfolioChart() {
  const { holdings, summary } = usePortfolio();
  const [chartType, setChartType] = useState('allocation'); // 'allocation' | 'performance'

  // Prepare allocation data for Pie Chart
  const pieData = holdings.map(h => ({
    name: h.schemeName.length > 28 ? h.schemeName.substring(0, 28) + '...' : h.schemeName,
    fullName: h.schemeName,
    value: Math.round(h.currentValuation),
    pct: summary.totalValuation > 0 ? ((h.currentValuation / summary.totalValuation) * 100).toFixed(1) : 0
  })).sort((a, b) => b.value - a.value);

  // Custom tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs">
          <p className="font-bold text-slate-100 mb-1">{data.fullName}</p>
          <div className="flex items-center justify-between gap-4 text-slate-300">
            <span>Valuation:</span>
            <span className="font-mono font-bold text-emerald-400">₹{data.value.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-400 mt-1">
            <span>Portfolio Share:</span>
            <span className="font-mono text-cyan-400 font-semibold">{data.pct}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-xl mb-6">
      
      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-700/60">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-emerald-400" />
            Portfolio Allocation & Asset Breakdown
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Distribution of overall capital across active mutual fund holdings
          </p>
        </div>
      </div>

      {/* Allocation Donut Chart */}
      {pieData.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
          No holdings available in portfolio. Add transactions to visualize allocation.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          
          {/* Chart Graphic */}
          <div className="lg:col-span-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={4}
                  dataKey="value"
                  animationDuration={800}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLOR_PALETTE[index % COLOR_PALETTE.length]}
                      stroke="#1e293b"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Table */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
            {pieData.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 border border-slate-700/40 text-xs hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLOR_PALETTE[idx % COLOR_PALETTE.length] }}
                  />
                  <span className="text-slate-300 font-medium truncate" title={entry.fullName}>
                    {entry.name}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-white font-mono">₹{entry.value.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-cyan-400 font-mono font-semibold">{entry.pct}%</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}
