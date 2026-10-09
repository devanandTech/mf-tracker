import React, { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { parseDDMMYYYY } from '../utils/dateUtils.js';
import {
  ListOrdered,
  Search,
  Filter,
  PlusCircle,
  Edit2,
  Trash2,
  Tag
} from 'lucide-react';

export default function TransactionList({ onOpenAddTx, onEditTx }) {
  const { transactions, deleteTransaction } = usePortfolio();

  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_desc');

  const filteredTxs = transactions.filter(tx => {
    const matchesSearch = !searchFilter || (tx.schemeName || '').toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType = typeFilter === 'ALL' || (typeFilter === 'BUY' ? tx.type !== 'SELL' : tx.type === 'SELL');
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    if (sortBy === 'date_desc') {
      const da = parseDDMMYYYY(a.date) || new Date(0);
      const db = parseDDMMYYYY(b.date) || new Date(0);
      return db - da;
    }
    if (sortBy === 'date_asc') {
      const da = parseDDMMYYYY(a.date) || new Date(0);
      const db = parseDDMMYYYY(b.date) || new Date(0);
      return da - db;
    }
    if (sortBy === 'amount_desc') return b.amount - a.amount;
    return 0;
  });

  return (
    <div className="space-y-4">
      
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter transactions..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
            {['ALL', 'BUY', 'SELL'].map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors active-press ${
                  typeFilter === t
                    ? 'bg-slate-700 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'BUY' ? 'Buys' : t}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="date_desc">Newest</option>
            <option value="date_asc">Oldest</option>
            <option value="amount_desc">Highest ₹</option>
          </select>
        </div>

      </div>

      {/* MOBILE CARD VIEW (< 640px) */}
      <div className="space-y-3 sm:hidden">
        {filteredTxs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs mobile-card-glass rounded-2xl">
            No transactions found.
          </div>
        ) : (
          filteredTxs.map((tx) => (
            <div key={tx.id} className="mobile-card-glass rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">{tx.date}</span>
                  <h4 className="text-xs font-bold text-slate-100 line-clamp-2 mt-0.5">{tx.schemeName}</h4>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  tx.type === 'SELL'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  {tx.type}
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-900/60 rounded-xl p-2.5 border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Amount</span>
                  <span className="font-extrabold text-white">₹{Math.round(tx.amount).toLocaleString('en-IN')}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">NAV</span>
                  <span className="text-slate-200">₹{parseFloat(tx.nav).toFixed(2)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Units</span>
                  <span className="text-cyan-400 font-bold">{parseFloat(tx.units).toFixed(3)}</span>
                </div>
              </div>

              {tx.notes && (
                <div className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> {tx.notes}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                <button
                  onClick={() => onEditTx(tx)}
                  className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold active-press"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete ${tx.type} transaction for ${tx.schemeName}?`)) {
                      deleteTransaction(tx.id);
                    }
                  }}
                  className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold active-press"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW (≥ 640px) */}
      <div className="hidden sm:block bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 uppercase font-semibold text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Scheme Name</th>
                <th className="py-3.5 px-3 text-center">Type</th>
                <th className="py-3.5 px-3 text-right">NAV (₹)</th>
                <th className="py-3.5 px-3 text-right">Units</th>
                <th className="py-3.5 px-3 text-right">Total Amount</th>
                <th className="py-3.5 px-4">Notes</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredTxs.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-300">{tx.date}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-100 max-w-xs">
                    <div className="truncate">{tx.schemeName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Code: {tx.schemeCode}</div>
                  </td>
                  <td className="py-3.5 px-3 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      tx.type === 'SELL'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-slate-200">₹{parseFloat(tx.nav).toFixed(2)}</td>
                  <td className="py-3.5 px-3 text-right font-mono text-cyan-400 font-medium">{parseFloat(tx.units).toFixed(3)}</td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-white">₹{Math.round(tx.amount).toLocaleString('en-IN')}</td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">{tx.notes || '-'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => onEditTx(tx)} className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${tx.type} transaction for ${tx.schemeName}?`)) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
