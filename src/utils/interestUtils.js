/**
 * Interest & Maturity Calculation Utility for FDs, RDs, and 15-Day Alert Detector
 */
import { parseDDMMYYYY, toInputDateFormat } from './dateUtils.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calculate FD Maturity Amount & Periodic Payout
 * Handles 'At Maturity' (Cumulative), 'Monthly', 'Quarterly', 'Yearly'
 */
export function calculateFDMaturity(principalStr, rateStr, tenureMonthsStr, payoutFrequency = 'At Maturity') {
  const P = parseFloat(principalStr) || 0;
  const r = parseFloat(rateStr) || 0;
  const months = parseInt(tenureMonthsStr, 10) || 0;

  if (P <= 0 || r <= 0 || months <= 0) {
    return { maturityAmount: P, periodicPayout: 0 };
  }

  const years = months / 12;

  if (payoutFrequency === 'Monthly') {
    const monthlyPayout = (P * (r / 100)) / 12;
    return {
      maturityAmount: P, // Principal returned at maturity
      periodicPayout: Math.round(monthlyPayout * 100) / 100,
      totalInterestPaid: Math.round((monthlyPayout * months) * 100) / 100
    };
  }

  if (payoutFrequency === 'Quarterly') {
    const quarterlyPayout = (P * (r / 100)) / 4;
    const totalQuarters = Math.floor(months / 3);
    return {
      maturityAmount: P,
      periodicPayout: Math.round(quarterlyPayout * 100) / 100,
      totalInterestPaid: Math.round((quarterlyPayout * totalQuarters) * 100) / 100
    };
  }

  if (payoutFrequency === 'Yearly') {
    const yearlyPayout = P * (r / 100);
    const totalYears = Math.floor(months / 12);
    return {
      maturityAmount: P,
      periodicPayout: Math.round(yearlyPayout * 100) / 100,
      totalInterestPaid: Math.round((yearlyPayout * totalYears) * 100) / 100
    };
  }

  // Cumulative / At Maturity (Quarterly Compounding)
  const n = 4;
  const amount = P * Math.pow(1 + (r / 100) / n, n * years);
  const totalInterest = amount - P;

  return {
    maturityAmount: Math.round(amount * 100) / 100,
    periodicPayout: 0,
    totalInterestPaid: Math.round(totalInterest * 100) / 100
  };
}

/**
 * Calculate RD Maturity Amount (Quarterly Compounding for Monthly Installments)
 */
export function calculateRDMaturity(installmentStr, rateStr, tenureMonthsStr) {
  const M = parseFloat(installmentStr) || 0;
  const r = parseFloat(rateStr) || 0;
  const months = parseInt(tenureMonthsStr, 10) || 0;

  if (M <= 0 || r <= 0 || months <= 0) {
    return M * months;
  }

  let totalMaturity = 0;
  const n = 4; // Quarterly compounding
  for (let k = 1; k <= months; k++) {
    const yearsLeft = (months - k + 1) / 12;
    totalMaturity += M * Math.pow(1 + (r / 100) / n, n * yearsLeft);
  }

  return Math.round(totalMaturity * 100) / 100;
}

/**
 * Calculate Maturity Date given start date and tenure in months
 */
export function calculateMaturityDate(startDateStr, tenureMonthsStr) {
  if (!startDateStr) return '';
  const d = parseDDMMYYYY(startDateStr);
  if (!d || isNaN(d.getTime())) return '';
  const months = parseInt(tenureMonthsStr, 10) || 0;
  // Clamp to month end so 31 Jan + 1 month is 28/29 Feb, not 3 Mar
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  return toInputDateFormat(target);
}

/**
 * Value of an FD as of a date: principal plus interest accrued so far for cumulative FDs
 * (quarterly compounding, capped at maturity); principal only when interest is paid out.
 */
export function calculateFDCurrentValue(fd, asOf = new Date()) {
  const P = parseFloat(fd.principalAmount) || 0;
  const r = parseFloat(fd.interestRate) || 0;
  const start = parseDDMMYYYY(fd.startDate);
  if (P <= 0 || r <= 0 || !start || isNaN(start.getTime())) return P;
  if ((fd.payoutFrequency || 'At Maturity') !== 'At Maturity') return P;

  const maturity = parseDDMMYYYY(fd.maturityDate);
  const end = maturity && !isNaN(maturity.getTime()) && asOf > maturity ? maturity : asOf;
  const years = Math.max(0, (end.getTime() - start.getTime()) / DAY_MS / 365);
  const value = P * Math.pow(1 + (r / 100) / 4, 4 * years);

  const maturityAmount = parseFloat(fd.maturityAmount) || 0;
  return maturityAmount > 0 ? Math.min(value, maturityAmount) : value;
}

/**
 * Value of an RD as of a date: installments actually paid so far plus their accrued interest
 */
export function calculateRDCurrentValue(rd, asOf = new Date()) {
  const M = parseFloat(rd.monthlyInstallment) || 0;
  const r = parseFloat(rd.interestRate) || 0;
  const tenure = parseInt(rd.tenureMonths, 10) || 0;
  const start = parseDDMMYYYY(rd.startDate);
  if (M <= 0 || !start || isNaN(start.getTime())) return parseFloat(rd.totalDeposited) || 0;
  if (asOf < start) return 0;

  const maturity = parseDDMMYYYY(rd.maturityDate);
  const end = maturity && !isNaN(maturity.getTime()) && asOf > maturity ? maturity : asOf;

  let paid = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() >= start.getDate()) paid += 1;
  if (tenure > 0) paid = Math.min(paid, tenure);

  let value = 0;
  for (let k = 0; k < paid; k++) {
    const paidOn = new Date(start.getFullYear(), start.getMonth() + k, start.getDate());
    const years = Math.max(0, (end.getTime() - paidOn.getTime()) / DAY_MS / 365);
    value += M * Math.pow(1 + (r / 100) / 4, 4 * years);
  }

  const maturityAmount = parseFloat(rd.maturityAmount) || 0;
  return maturityAmount > 0 ? Math.min(value, maturityAmount) : value;
}

/**
 * Check if target date (maturity / due date) is within 15 days from today
 */
export function get15DayAlertStatus(targetDateStr) {
  if (!targetDateStr) return { isWithin15Days: false, isMatured: false, daysLeft: 999 };

  const parsed = parseDDMMYYYY(targetDateStr);
  if (!parsed || isNaN(parsed.getTime())) return { isWithin15Days: false, isMatured: false, daysLeft: 999 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());

  const diffTime = target.getTime() - today.getTime();
  const daysLeft = Math.round(diffTime / DAY_MS);

  if (daysLeft < 0) {
    return { isWithin15Days: true, isMatured: true, daysLeft };
  } else if (daysLeft <= 15) {
    return { isWithin15Days: true, isMatured: false, daysLeft };
  }

  return { isWithin15Days: false, isMatured: false, daysLeft };
}
