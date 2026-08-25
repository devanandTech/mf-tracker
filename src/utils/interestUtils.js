/**
 * Interest & Maturity Calculation Utility for FDs, RDs, and 15-Day Alert Detector
 */

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
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return '';
  const months = parseInt(tenureMonthsStr, 10) || 0;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

/**
 * Check if target date (maturity / due date) is within 15 days from today
 */
export function get15DayAlertStatus(targetDateStr) {
  if (!targetDateStr) return { isWithin15Days: false, isMatured: false, daysLeft: 999 };

  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return { isWithin15Days: false, isMatured: false, daysLeft: 999 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { isWithin15Days: true, isMatured: true, daysLeft };
  } else if (daysLeft <= 15) {
    return { isWithin15Days: true, isMatured: false, daysLeft };
  }

  return { isWithin15Days: false, isMatured: false, daysLeft };
}
