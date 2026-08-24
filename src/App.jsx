import React, { useState } from 'react';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext.jsx';
import Navbar from './components/Navbar.jsx';
import PortfolioSummary from './components/PortfolioSummary.jsx';
import PortfolioChart from './components/PortfolioChart.jsx';
import DipAnalyzer from './components/DipAnalyzer.jsx';
import AMCAnalytics from './components/AMCAnalytics.jsx';
import TransactionList from './components/TransactionList.jsx';
import TransactionModal from './components/TransactionModal.jsx';
import SchemeDetailModal from './components/SchemeDetailModal.jsx';
import {
  TrendingUp,
  PlusCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  LineChart,
  Filter,
  X
} from 'lucide-react';

function DashboardContent() {
  const {
    activeTab,
    holdings,
    summary,
    selectedSchemeCode,
    setSelectedSchemeCode,
    selectedAMCFilter,
    setSelectedAMCFilter,
    toastMessage
  } = usePortfolio();

  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [addTxInitialScheme, setAddTxInitialScheme] = useState({ name: '', code: null });
  const [editingTx, setEditingTx] = useState(null);

  const handleOpenAddTx = (schemeName = '', schemeCode = null) => {
    setAddTxInitialScheme({ name: schemeName, code: schemeCode });
    setEditingTx(null);
    setIsAddTxOpen(true);
  };

  const handleEditTx = (tx) => {
    setEditingTx(tx);
    setIsAddTxOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Navbar */}
      <Navbar
        onOpenAddTx={() => handleOpenAddTx()}
        onOpenSchemeModal={(code) => setSelectedSchemeCode(code)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 sm:bottom-5 right-4 z-50 transition-all duration-300 animate-bounce">
          <div className={`px-3.5 py-2.5 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-semibold ${
            toastMessage.type === 'error'
              ? 'bg-rose-900/90 text-rose-200 border-rose-700'
              : toastMessage.type === 'info'
                ? 'bg-cyan-900/90 text-cyan-200 border-cyan-700'
                : 'bg-emerald-900/90 text-emerald-200 border-emerald-700'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage.msg}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8 space-y-4 sm:space-y-8">
        
        {/* Active AMC Filter Pill Bar */}
        {selectedAMCFilter !== 'ALL' && (
          <div className="bg-teal-500/10 border border-teal-500/30 rounded-2xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-teal-400" />
              <span className="text-slate-300">Filtered by AMC:</span>
              <span className="font-extrabold text-teal-300 bg-teal-500/20 px-2.5 py-0.5 rounded-full">
                {selectedAMCFilter}
              </span>
            </div>
            <button
              onClick={() => setSelectedAMCFilter('ALL')}
              className="text-slate-400 hover:text-white flex items-center gap-1 font-semibold"
            >
              <X className="w-4 h-4" /> Reset Filter
            </button>
          </div>
        )}

        {/* Tab 1: Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* KPI Summary Row */}
            <PortfolioSummary />

            {/* Asset Allocation & Performance Chart */}
            <PortfolioChart />

            {/* Holdings Section */}
            <div className="mobile-card-glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Portfolio Holdings & Live NAVs
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                    Real-time performance and ATH dip status for active holdings
                  </p>
                </div>
                <button
                  onClick={() => handleOpenAddTx()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all active-press"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Tx</span>
                </button>
              </div>

              {/* Mobile Card Feed (< 640px) */}
              <div className="space-y-3 sm:hidden">
                {holdings.length === 0 ? (
                  <p className="py-8 text-center text-slate-500 text-xs">
                    No holdings match current filter.
                  </p>
                ) : (
                  holdings.map((h) => (
                    <div
                      key={h.schemeCode}
                      onClick={() => setSelectedSchemeCode(h.schemeCode)}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-2.5 active-press"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-100 line-clamp-1">{h.schemeName}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">Code: {h.schemeCode}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                          h.dipStatus.severity > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {h.dipStatus.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl text-xs font-mono border border-slate-800/80">
                        <div>
                          <span className="text-[9px] text-slate-500 block">Valuation</span>
                          <span className="font-extrabold text-white">₹{Math.round(h.currentValuation).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block">Total Profit</span>
                          <span className={`font-extrabold ${h.totalReturnINR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {h.totalReturnPct >= 0 ? '+' : ''}{h.totalReturnPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-500 block">1D Return</span>
                          <span className={`font-bold ${h.dailyChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {h.dailyChangePct >= 0 ? '+' : ''}{h.dailyChangePct.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold pt-1">
                        <span className="flex items-center gap-1">
                          <LineChart className="w-3.5 h-3.5" /> View Charts & Purchase Dots
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Holdings Table (≥ 640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700/80">
                    <tr>
                      <th className="py-3 px-4">Scheme Name</th>
                      <th className="py-3 px-3 text-right">Units</th>
                      <th className="py-3 px-3 text-right">Avg NAV</th>
                      <th className="py-3 px-3 text-right">Current NAV</th>
                      <th className="py-3 px-3 text-right">Valuation (₹)</th>
                      <th className="py-3 px-3 text-right">Total Gain/Loss</th>
                      <th className="py-3 px-3 text-center">Today's Market</th>
                      <th className="py-3 px-3 text-center">Dip Status</th>
                      <th className="py-3 px-4 text-right">Charts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {holdings.map((h) => (
                      <tr key={h.schemeCode} className="hover:bg-slate-700/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-100 max-w-xs">
                          <div className="truncate" title={h.schemeName}>{h.schemeName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{h.fundHouse}</div>
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-cyan-400">
                          {h.netUnits.toFixed(3)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono text-cyan-300 font-bold">
                          ₹{h.avgBuyNAV.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                          ₹{h.currentNAV.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                          ₹{Math.round(h.currentValuation).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono">
                          <div className={`font-bold ${h.totalReturnINR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {h.totalReturnINR >= 0 ? '+' : ''}₹{Math.round(h.totalReturnINR).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {h.totalReturnPct >= 0 ? '+' : ''}{h.totalReturnPct.toFixed(2)}%
                          </div>
                        </td>

                        <td className={`py-3.5 px-3 text-center font-mono font-semibold ${
                          h.dailyChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {h.dailyChangePct >= 0 ? '+' : ''}{h.dailyChangePct.toFixed(2)}%
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            h.dipStatus.severity > 0
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          }`}>
                            {h.dipStatus.label}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedSchemeCode(h.schemeCode)}
                            className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 transition-colors text-xs font-medium"
                          >
                            Analyze
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: AMC Analytics View */}
        {activeTab === 'amc' && (
          <AMCAnalytics />
        )}

        {/* Tab 3: Dip Analyzer View */}
        {activeTab === 'dipAnalyzer' && (
          <DipAnalyzer
            onOpenSchemeModal={(code) => setSelectedSchemeCode(code)}
          />
        )}

        {/* Tab 4: Transactions Manager View */}
        {activeTab === 'transactions' && (
          <TransactionList
            onOpenAddTx={() => handleOpenAddTx()}
            onEditTx={(tx) => handleEditTx(tx)}
          />
        )}

      </main>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        initialSchemeName={addTxInitialScheme.name}
        initialSchemeCode={addTxInitialScheme.code}
        editTxData={editingTx}
      />

      {/* Scheme Detailed Charts Modal */}
      {selectedSchemeCode && (
        <SchemeDetailModal
          schemeCode={selectedSchemeCode}
          onClose={() => setSelectedSchemeCode(null)}
          onOpenAddTx={(name, code) => handleOpenAddTx(name, code)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-[11px] text-slate-500 space-y-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <span>Data provided by</span>
            <a
              href="https://www.mfapi.in"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
            >
              api.mfapi.in <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p>© 2026 MF Pulse • Offline-First IndexedDB Caching • Multi-Account Support</p>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <PortfolioProvider>
      <DashboardContent />
    </PortfolioProvider>
  );
}
