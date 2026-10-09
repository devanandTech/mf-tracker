import React from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { Filter, X } from 'lucide-react';

// Makes an active AMC filter visible wherever MF numbers are shown, with a way to clear it
export default function AMCFilterChip() {
  const { selectedAMCFilter, setSelectedAMCFilter } = usePortfolio();

  if (selectedAMCFilter === 'ALL') return null;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs">
      <span className="flex items-center gap-1.5 text-teal-200 font-semibold min-w-0">
        <Filter className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">Mutual fund figures show only {selectedAMCFilter}</span>
      </span>
      <button
        onClick={() => setSelectedAMCFilter('ALL')}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold flex-shrink-0 active-press"
      >
        <X className="w-3 h-3" /> Clear
      </button>
    </div>
  );
}
