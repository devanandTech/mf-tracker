/**
 * Excel / CSV Export Utility for Wealth Tracker
 * Generates Excel-compatible accounting sheets with date range filtering
 */
import { parseDDMMYYYY } from './dateUtils.js';

/**
 * Parses date string (YYYY-MM-DD or DD-MM-YYYY) into Date object
 */
function parseAnyDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) {
    // YYYY-MM-DD
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }
  // DD-MM-YYYY
  return parseDDMMYYYY(dateStr);
}

/**
 * Check if a date falls within optional startDate and endDate range
 */
function isDateInRange(targetDateStr, startDateStr, endDateStr) {
  if (!startDateStr && !endDateStr) return true;
  const target = parseAnyDate(targetDateStr);
  if (!target) return true;

  if (startDateStr) {
    const start = parseAnyDate(startDateStr);
    if (start && target < start) return false;
  }

  if (endDateStr) {
    const end = parseAnyDate(endDateStr);
    if (end) {
      end.setHours(23, 59, 59, 999);
      if (target > end) return false;
    }
  }

  return true;
}

/**
 * Escapes CSV text fields containing commas or quotes
 */
function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports wealth portfolio data to Excel / CSV format with Date Range Filtering
 */
export function exportToExcel(
  { transactions = [], fds = [], rds = [], insurances = [], accounts = [] },
  startDateStr = '',
  endDateStr = '',
  entitySelection = 'ALL' // 'ALL' | 'MF' | 'FDRD' | 'INSURANCE'
) {
  const accountMap = {};
  accounts.forEach(a => { accountMap[a.id] = a.name; });

  const csvRows = [];

  // Title & Header Information
  csvRows.push(['WEALTH TRACKER ACCOUNTING REPORT']);
  csvRows.push([`Generated On:`, new Date().toLocaleString()]);
  csvRows.push([`Date Filter:`, startDateStr || endDateStr ? `${startDateStr || 'Beginning'} to ${endDateStr || 'Present'}` : 'All Time']);
  csvRows.push([]);

  // 1. MUTUAL FUNDS SECTION
  if (entitySelection === 'ALL' || entitySelection === 'MF') {
    const filteredTxs = transactions.filter(t => isDateInRange(t.date, startDateStr, endDateStr));

    csvRows.push(['--- MUTUAL FUND TRANSACTIONS ---']);
    csvRows.push(['Date', 'Type', 'Scheme Name', 'Scheme Code', 'NAV (INR)', 'Amount (INR)', 'Units Allotted', 'Account/Broker', 'Notes']);

    filteredTxs.forEach(t => {
      csvRows.push([
        escapeCSV(t.date),
        escapeCSV(t.type),
        escapeCSV(t.schemeName),
        escapeCSV(t.schemeCode),
        escapeCSV(t.nav),
        escapeCSV(t.amount),
        escapeCSV(t.units),
        escapeCSV(accountMap[t.accountId] || 'Default Account'),
        escapeCSV(t.notes || '')
      ]);
    });
    csvRows.push([]);
  }

  // 2. FIXED DEPOSITS SECTION
  if (entitySelection === 'ALL' || entitySelection === 'FDRD') {
    const filteredFDs = fds.filter(f => isDateInRange(f.startDate || f.maturityDate, startDateStr, endDateStr));

    csvRows.push(['--- FIXED DEPOSITS (FD) ---']);
    csvRows.push(['Start Date', 'Maturity Date', 'Bank Name', 'FD Title', 'Principal Amount (INR)', 'Interest Rate (% p.a.)', 'Tenure (Months)', 'Interest Payout', 'Maturity Action', 'Maturity Amount (INR)', 'Account', 'Notes']);

    filteredFDs.forEach(f => {
      csvRows.push([
        escapeCSV(f.startDate),
        escapeCSV(f.maturityDate),
        escapeCSV(f.bankName),
        escapeCSV(f.title),
        escapeCSV(f.principalAmount),
        escapeCSV(f.interestRate),
        escapeCSV(f.tenureMonths),
        escapeCSV(f.payoutFrequency || 'At Maturity'),
        escapeCSV(f.maturityAction || 'Auto-Close'),
        escapeCSV(f.maturityAmount),
        escapeCSV(accountMap[f.accountId] || 'Default Account'),
        escapeCSV(f.notes || '')
      ]);
    });
    csvRows.push([]);
  }

  // 3. RECURRING DEPOSITS SECTION
  if (entitySelection === 'ALL' || entitySelection === 'FDRD') {
    const filteredRDs = rds.filter(r => isDateInRange(r.startDate || r.maturityDate, startDateStr, endDateStr));

    csvRows.push(['--- RECURRING DEPOSITS (RD) ---']);
    csvRows.push(['Start Date', 'Maturity Date', 'Bank Name', 'RD Title', 'Monthly Installment (INR)', 'Total Deposited (INR)', 'Interest Rate (% p.a.)', 'Tenure (Months)', 'Maturity Amount (INR)', 'Account', 'Notes']);

    filteredRDs.forEach(r => {
      csvRows.push([
        escapeCSV(r.startDate),
        escapeCSV(r.maturityDate),
        escapeCSV(r.bankName),
        escapeCSV(r.title),
        escapeCSV(r.monthlyInstallment),
        escapeCSV(r.totalDeposited),
        escapeCSV(r.interestRate),
        escapeCSV(r.tenureMonths),
        escapeCSV(r.maturityAmount),
        escapeCSV(accountMap[r.accountId] || 'Default Account'),
        escapeCSV(r.notes || '')
      ]);
    });
    csvRows.push([]);
  }

  // 4. INSURANCE POLICIES SECTION
  if (entitySelection === 'ALL' || entitySelection === 'INSURANCE') {
    const filteredIns = insurances.filter(i => isDateInRange(i.nextDueDate, startDateStr, endDateStr));

    csvRows.push(['--- INSURANCE POLICIES ---']);
    csvRows.push(['Policy Name', 'Provider / Insurer', 'Policy Type', 'Policy Number', 'Sum Assured / Cover (INR)', 'Premium Amount (INR)', 'Premium Frequency', 'Next Due Date', 'Account', 'Notes']);

    filteredIns.forEach(i => {
      csvRows.push([
        escapeCSV(i.policyName),
        escapeCSV(i.provider),
        escapeCSV(i.policyType),
        escapeCSV(i.policyNumber || 'N/A'),
        escapeCSV(i.sumAssured),
        escapeCSV(i.premiumAmount),
        escapeCSV(i.premiumFrequency),
        escapeCSV(i.nextDueDate),
        escapeCSV(accountMap[i.accountId] || 'Default Account'),
        escapeCSV(i.notes || '')
      ]);
    });
    csvRows.push([]);
  }

  // Convert array of rows to CSV string
  const csvContent = csvRows.map(e => e.join(',')).join('\n');

  // Trigger Excel download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.setAttribute('download', `Wealth_Accounting_Export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
