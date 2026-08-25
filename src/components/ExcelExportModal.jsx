import React, { useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { exportToExcel } from '../utils/excelUtils.js';
import {
  FileSpreadsheet,
  X,
  Calendar,
  Filter,
  Download,
  CheckCircle2
} from 'lucide-react';

export default function ExcelExportModal({ isOpen, onClose }) {
  const { allTransactions, fds, rds, insurances, accounts } = usePortfolio();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entitySelection, setEntitySelection] = useState('ALL');

  if (!isOpen) return null;

  const handleExport = (e) => {
    e.preventDefault();
    exportToExcel(
      { transactions: allTransactions, fds, rds, insurances, accounts },
      startDate,
      endDate,
      entitySelection
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pt-safe pb-safe">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 space-y-4 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Export Excel / CSV Report</h3>
              <p className="text-[11px] text-slate-400">Generate accounting spreadsheets with date range filtering</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleExport} className="space-y-4 text-xs">
          
          {/* Entity Selection */}
          <div>
            <label className="block text-slate-400 mb-1 font-semibold">Entity Selection</label>
            <select
              value={entitySelection}
              onChange={(e) => setEntitySelection(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Entities (MF, FD, RD, Insurance)</option>
              <option value="MF">Mutual Funds Only</option>
              <option value="FDRD">Fixed & Recurring Deposits Only</option>
              <option value="INSURANCE">Insurances Only</option>
            </select>
          </div>

          {/* Date Filter Range */}
          <div className="space-y-2">
            <label className="block text-slate-400 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Date Filter Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block mb-1">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Leave dates empty to export all historical records.
            </p>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-emerald-500/20 active-press"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel (.CSV)</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
