import React, { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import ExcelExportModal from './ExcelExportModal.jsx';
import {
  Settings,
  Building2,
  PlusCircle,
  Edit3,
  Trash2,
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export default function SettingsMasters() {
  const {
    accounts,
    addAccount,
    editAccount,
    deleteAccount,
    allTransactions,
    fds,
    rds,
    insurances,
    clearAllData,
    loadSampleData,
    exportData,
    importData
  } = usePortfolio();

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBroker, setEditBroker] = useState('');

  const [newAccName, setNewAccName] = useState('');
  const [newAccBroker, setNewAccBroker] = useState('');

  const handleStartEdit = (acc) => {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditBroker(acc.broker || '');
  };

  const handleSaveEdit = (id) => {
    if (!editName.trim()) return;
    editAccount(id, editName.trim(), editBroker.trim() || 'Custom');
    setEditingId(null);
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    if (!newAccName.trim()) return;
    addAccount(newAccName.trim(), newAccBroker.trim() || 'Custom');
    setNewAccName('');
    setNewAccBroker('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      importData(event.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/40 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
              System Control
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Settings & Master Data Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage Portfolio Accounts, IndexedDB local storage, backups & system preferences
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs font-bold active-press"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel (.CSV) Report</span>
          </button>

          <button
            onClick={exportData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-2xl text-xs font-bold active-press"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Backup</span>
          </button>
        </div>
      </div>

      {/* Account Masters Section */}
      <div className="mobile-card-glass rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" /> Master Portfolio Accounts ({accounts.length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure brokers, demat accounts, and banks to filter investments across all tabs
          </p>
        </div>

        {/* Add Account Form */}
        <form onSubmit={handleAddAccount} className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
          <h4 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-emerald-400" /> Add New Master Account
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Account Name (e.g. Zerodha Coin, HDFC Savings)"
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              placeholder="Broker / Bank (e.g. Zerodha, Groww, HDFC)"
              value={newAccBroker}
              onChange={(e) => setNewAccBroker(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl active-press text-xs"
          >
            + Create Master Account
          </button>
        </form>

        {/* Accounts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {accounts.map(acc => (
            <div key={acc.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3">
              {editingId === acc.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Broker"
                      value={editBroker}
                      onChange={(e) => setEditBroker(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300"
                    />
                    <button
                      onClick={() => handleSaveEdit(acc.id)}
                      className="px-3 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm">{acc.name}</span>
                      {acc.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          System Default
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block font-mono">Broker/Bank: {acc.broker || 'Custom'}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {acc.id !== 'acc_all' && (
                      <>
                        <button
                          onClick={() => handleStartEdit(acc)}
                          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {!acc.isDefault && (
                          <button
                            onClick={() => deleteAccount(acc.id)}
                            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Storage Health & Backup Section */}
      <div className="mobile-card-glass rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" /> IndexedDB Offline Storage Metrics
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 block">MF Transactions</span>
            <span className="text-lg font-black text-emerald-400">{allTransactions.length} Records</span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 block">Fixed Deposits</span>
            <span className="text-lg font-black text-cyan-400">{fds.length} Records</span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 block">Recurring Deposits</span>
            <span className="text-lg font-black text-amber-400">{rds.length} Records</span>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 block">Insurances</span>
            <span className="text-lg font-black text-teal-400">{insurances.length} Records</span>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer active-press">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Restore JSON Backup</span>
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={loadSampleData}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 rounded-xl text-xs font-bold active-press"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            <span>Reset Demo Portfolio</span>
          </button>

          <button
            onClick={() => { if (confirm('Are you sure you want to clear all portfolio data?')) clearAllData(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold active-press ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Portfolio Data</span>
          </button>
        </div>
      </div>

      {/* Excel Export Modal */}
      <ExcelExportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
      />

    </div>
  );
}
