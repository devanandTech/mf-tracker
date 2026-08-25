import React, { useEffect, useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { getSchemeDetails } from '../api/mfApi.js';
import SchemeCharts from './SchemeCharts.jsx';
import {
  X,
  Building2,
  Calendar,
  Loader2
} from 'lucide-react';

export default function SchemeDetailModal({ schemeCode, onClose, onOpenAddTx }) {
  const { schemeDetailsMap, holdings } = usePortfolio();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const holding = holdings.find(h => h.schemeCode === schemeCode);

  useEffect(() => {
    if (!schemeCode) return;
    
    if (schemeDetailsMap[schemeCode]) {
      setDetails(schemeDetailsMap[schemeCode]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getSchemeDetails(schemeCode).then(res => {
      setDetails(res);
      setLoading(false);
    });
  }, [schemeCode, schemeDetailsMap]);

  if (!schemeCode) return null;

  const meta = details?.meta || {};
  const navDataList = details?.data || [];
  const latestItem = navDataList[0] || {};
  const latestNAV = parseFloat(latestItem.nav || 0);

  let athNAV = 0;
  navDataList.forEach(d => {
    const val = parseFloat(d.nav);
    if (val > athNAV) athNAV = val;
  });
  const drawdownATH = athNAV > 0 ? ((latestNAV - athNAV) / athNAV) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center max-sm:items-end justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto pt-safe pb-safe">
      
      {/* Mobile Bottom Sheet Drawer / Desktop Centered Dialog */}
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden my-0 sm:my-8 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Code: {schemeCode}
              </span>
              {meta.scheme_category && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                  {meta.scheme_category}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-xl font-extrabold text-white tracking-tight leading-snug">
              {meta.scheme_name || `Scheme #${schemeCode}`}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-slate-500" />
              <span>{meta.fund_house || 'Mutual Fund'}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-colors active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 scrollbar-thin">
          
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs">Fetching scheme NAV history...</p>
            </div>
          ) : (
            <>
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3">
                  <span className="text-[10px] text-slate-400 block font-medium">Latest NAV</span>
                  <span className="text-lg font-black font-mono text-emerald-400">₹{latestNAV.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-500 block">{latestItem.date}</span>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3">
                  <span className="text-[10px] text-slate-400 block font-medium">All-Time High</span>
                  <span className="text-lg font-black font-mono text-slate-200">₹{athNAV.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-500 block">Peak Price</span>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3">
                  <span className="text-[10px] text-slate-400 block font-medium">Peak Drawdown</span>
                  <span className={`text-lg font-black font-mono ${drawdownATH >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {drawdownATH.toFixed(2)}%
                  </span>
                  <span className="text-[9px] text-slate-500 block">Dip status</span>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3">
                  <span className="text-[10px] text-slate-400 block font-medium">Portfolio Holdings</span>
                  {holding ? (
                    <div>
                      <span className="text-sm font-bold font-mono text-cyan-400 block">
                        ₹{Math.round(holding.currentValuation).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        {holding.netUnits.toFixed(2)} Units
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenAddTx) onOpenAddTx(meta.scheme_name, schemeCode);
                      }}
                      className="mt-1 text-xs text-emerald-400 font-bold hover:underline"
                    >
                      + Add to Portfolio
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile App Style Multi-Chart with Purchase Dots */}
              <SchemeCharts
                navDataList={navDataList}
                schemeName={meta.scheme_name}
                avgBuyNAV={holding?.avgBuyNAV}
                transactions={holding?.transactions || []}
              />

              {/* Scheme Specific Transactions Table */}
              {holding && holding.transactions && holding.transactions.length > 0 && (
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      Transaction Records ({holding.transactions.length})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      First: {holding.firstTxDate} • Last: {holding.lastTxDate}
                    </span>
                  </h4>

                  <div className="overflow-x-auto max-h-48 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 sticky top-0 uppercase font-semibold text-[9px]">
                        <tr>
                          <th className="py-1.5 px-2">Date</th>
                          <th className="py-1.5 px-2">Type</th>
                          <th className="py-1.5 px-2 text-right">NAV (₹)</th>
                          <th className="py-1.5 px-2 text-right">Amount (₹)</th>
                          <th className="py-1.5 px-2 text-right">Units</th>
                          <th className="py-1.5 px-2 text-right">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40 font-mono text-[11px]">
                        {holding.transactions.map((tx, idx) => (
                          <tr key={tx.id || idx} className="hover:bg-slate-700/30">
                            <td className="py-1.5 px-2 text-slate-200 font-semibold">{tx.date}</td>
                            <td className="py-1.5 px-2">
                              <span className={`px-2 py-0.2 rounded text-[9px] font-extrabold border ${
                                tx.type === 'SELL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-1.5 px-2 text-right font-bold text-white">₹{parseFloat(tx.nav || 0).toFixed(2)}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-emerald-400">₹{Math.round(tx.amount || 0).toLocaleString('en-IN')}</td>
                            <td className="py-1.5 px-2 text-right text-cyan-300">{parseFloat(tx.units || 0).toFixed(3)}</td>
                            <td className="py-1.5 px-2 text-right text-slate-400 text-[10px] italic truncate max-w-[120px]">{tx.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent NAV History Table */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5">
                <h4 className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Recent NAV Updates
                </h4>
                <div className="overflow-x-auto max-h-40 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0 uppercase font-semibold text-[9px]">
                      <tr>
                        <th className="py-1.5 px-2">Date</th>
                        <th className="py-1.5 px-2">NAV (₹)</th>
                        <th className="py-1.5 px-2 text-right">1D %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/40 font-mono text-[11px]">
                      {navDataList.slice(0, 10).map((item, idx) => {
                        const current = parseFloat(item.nav);
                        const prev = idx < navDataList.length - 1 ? parseFloat(navDataList[idx + 1].nav) : current;
                        const changePct = prev > 0 ? ((current - prev) / prev) * 100 : 0;
                        return (
                          <tr key={idx} className="hover:bg-slate-700/30">
                            <td className="py-1.5 px-2 text-slate-300">{item.date}</td>
                            <td className="py-1.5 px-2 font-bold text-white">₹{current.toFixed(2)}</td>
                            <td className={`py-1.5 px-2 text-right font-semibold ${
                              changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}

        </div>

      </div>
    </div>
  );
}
