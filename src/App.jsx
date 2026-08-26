import React, { useState } from 'react';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext.jsx';
import Navbar from './components/Navbar.jsx';
import DashboardOverview from './components/DashboardOverview.jsx';
import PortfolioSummary from './components/PortfolioSummary.jsx';
import PortfolioChart from './components/PortfolioChart.jsx';
import BrokerPortfolioChart from './components/BrokerPortfolioChart.jsx';
import WatchlistManager from './components/WatchlistManager.jsx';
import AMCAnalytics from './components/AMCAnalytics.jsx';
import DepositManager from './components/DepositManager.jsx';
import InsuranceManager from './components/InsuranceManager.jsx';
import SettingsMasters from './components/SettingsMasters.jsx';
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
  X,
  Building2,
  Sparkles,
  Star,
  ListOrdered
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

  const [mfSubTab, setMfSubTab] = useState('holdings'); // 'holdings' | 'amc' | 'watchlist' | 'orders'

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
        
        {/* Tab 1: Dashboard View */}
        {activeTab === 'dashboard' && (
          <DashboardOverview />
        )}

        {/* Tab 2: Mutual Funds View */}
        {activeTab === 'mf' && (
          <div className="space-y-5">
            
            {/* MF Sub Navigation Bar */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none">
              {[
                { id: 'holdings', label: 'Holdings & NAVs', icon: TrendingUp },
                { id: 'amc', label: 'AMC Analytics', icon: Building2 },
                { id: 'watchlist', label: 'Watchlist', icon: Star },
                { id: 'orders', label: 'Order History', icon: ListOrdered }
              ].map(sub => {
                const Icon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setMfSubTab(sub.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active-press whitespace-nowrap ${
                      mfSubTab === sub.id
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>

            {/* MF SubTab 1: Holdings */}
            {mfSubTab === 'holdings' && (
              <div className="space-y-4 sm:space-y-6">
                <PortfolioSummary />
                <BrokerPortfolioChart />
                <PortfolioChart />

                <div className="mobile-card-glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        Mutual Fund Holdings & NAVs
                      </h3>
                    </div>
                    <button
                      onClick={() => handleOpenAddTx()}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all active-press"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>+ Add Tx</span>
                    </button>
                  </div>

                  {/* Desktop Holdings Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700/80">
                        <tr>
                          <th className="py-3 px-4">Scheme Name</th>
                          <th className="py-3 px-3 text-center">First Tx</th>
                          <th className="py-3 px-3 text-center">Last Tx</th>
                          <th className="py-3 px-3 text-right">Units</th>
                          <th className="py-3 px-3 text-right">Avg NAV</th>
                          <th className="py-3 px-3 text-right">Current NAV</th>
                          <th className="py-3 px-3 text-right">Valuation (₹)</th>
                          <th className="py-3 px-3 text-right">Gain/Loss</th>
                          <th className="py-3 px-3 text-center">Dip Status</th>
                          <th className="py-3 px-4 text-right">Analyze</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                        {holdings.map((h) => (
                          <tr key={h.schemeCode} className="hover:bg-slate-700/40 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-slate-100 max-w-xs truncate">
                              <div>{h.schemeName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{h.fundHouse}</div>
                            </td>
                            <td className="py-3.5 px-3 text-center font-mono text-[11px] text-slate-300">{h.firstTxDate}</td>
                            <td className="py-3.5 px-3 text-center font-mono text-[11px] text-slate-300">{h.lastTxDate}</td>
                            <td className="py-3.5 px-3 text-right font-mono text-cyan-400">{h.netUnits.toFixed(3)}</td>
                            <td className="py-3.5 px-3 text-right font-mono text-cyan-300 font-bold">₹{h.avgBuyNAV.toFixed(2)}</td>
                            <td className="py-3.5 px-3 text-right font-mono font-bold text-white">₹{h.currentNAV.toFixed(2)}</td>
                            <td className="py-3.5 px-3 text-right font-mono font-bold text-white">₹{Math.round(h.currentValuation).toLocaleString('en-IN')}</td>
                            <td className={`py-3.5 px-3 text-right font-mono font-bold ${h.totalReturnINR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {h.totalReturnINR >= 0 ? '+' : ''}₹{Math.round(h.totalReturnINR).toLocaleString('en-IN')}
                            </td>
                            <td className="py-3.5 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                h.dipStatus.severity > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}>
                                {h.dipStatus.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => setSelectedSchemeCode(h.schemeCode)}
                                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 text-xs font-medium"
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
            )}

            {/* MF SubTab 2: AMC Analytics */}
            {mfSubTab === 'amc' && <AMCAnalytics />}

            {/* MF SubTab 3: Watchlist */}
            {mfSubTab === 'watchlist' && (
              <WatchlistManager
                onOpenAddTx={(name, code) => handleOpenAddTx(name, code)}
                onOpenSchemeModal={(code) => setSelectedSchemeCode(code)}
              />
            )}

            {/* MF SubTab 4: Orders */}
            {mfSubTab === 'orders' && <TransactionList onOpenAddTx={() => handleOpenAddTx()} onEditTx={(tx) => handleEditTx(tx)} />}

          </div>
        )}

        {/* Tab 3: Fixed & Recurring Deposits (FD / RD) */}
        {activeTab === 'fdrd' && (
          <DepositManager />
        )}

        {/* Tab 4: Insurance Policies */}
        {activeTab === 'insurance' && (
          <InsuranceManager />
        )}

        {/* Tab 5: Settings & Master Data */}
        {activeTab === 'settings' && (
          <SettingsMasters />
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
          <p>© 2026 MF Pulse • Offline-First IndexedDB Multi-Entity Wealth Suite</p>
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
