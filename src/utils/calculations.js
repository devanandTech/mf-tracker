import { parseDDMMYYYY, findNAVForDate } from './dateUtils.js';

/**
 * Calculates portfolio holdings aggregated by schemeCode
 */
export function calculateHoldings(transactions = [], schemeDetailsMap = {}) {
  const schemeGroups = {};

  transactions.forEach(tx => {
    const code = tx.schemeCode;
    if (!schemeGroups[code]) {
      schemeGroups[code] = {
        schemeCode: code,
        schemeName: tx.schemeName,
        transactions: []
      };
    }
    schemeGroups[code].transactions.push(tx);
  });

  const holdings = [];

  Object.keys(schemeGroups).forEach(codeStr => {
    const code = parseInt(codeStr, 10);
    const group = schemeGroups[codeStr];
    const details = schemeDetailsMap[code] || schemeDetailsMap[codeStr];

    let totalBoughtUnits = 0;
    let totalBoughtAmount = 0;
    let totalSoldUnits = 0;
    let totalSoldAmount = 0;

    group.transactions.forEach(tx => {
      const units = parseFloat(tx.units || 0);
      const amount = parseFloat(tx.amount || 0);
      const nav = parseFloat(tx.nav || 0);
      const actualUnits = units > 0 ? units : (nav > 0 ? amount / nav : 0);

      if (tx.type === 'SELL') {
        totalSoldUnits += actualUnits;
        totalSoldAmount += amount;
      } else {
        totalBoughtUnits += actualUnits;
        totalBoughtAmount += amount;
      }
    });

    const netUnits = Math.max(0, totalBoughtUnits - totalSoldUnits);
    const netInvested = Math.max(0, totalBoughtAmount - totalSoldAmount);
    const avgBuyNAV = totalBoughtUnits > 0 ? totalBoughtAmount / totalBoughtUnits : 0;

    let currentNAV = avgBuyNAV;
    let prevNAV = avgBuyNAV;
    let navDate = 'N/A';
    let fundHouse = details?.meta?.fund_house || 'Mutual Fund';
    let schemeCategory = details?.meta?.scheme_category || 'Equity/Debt';
    let isinGrowth = details?.meta?.isin_growth || details?.meta?.isin_div_reinvestment || '';

    let athNAV = 0;
    let high52W = 0;
    let navDataList = details?.data || [];

    if (navDataList.length > 0) {
      currentNAV = parseFloat(navDataList[0].nav);
      navDate = navDataList[0].date;
      prevNAV = navDataList.length > 1 ? parseFloat(navDataList[1].nav) : currentNAV;

      let maxNav = 0;
      let max52wNav = 0;
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      navDataList.forEach(item => {
        const val = parseFloat(item.nav);
        if (val > maxNav) maxNav = val;

        const d = parseDDMMYYYY(item.date);
        if (d && d >= oneYearAgo && val > max52wNav) {
          max52wNav = val;
        }
      });

      athNAV = maxNav;
      high52W = max52wNav || maxNav;
    }

    const currentValuation = netUnits * currentNAV;
    const totalReturnINR = currentValuation - netInvested;
    const totalReturnPct = netInvested > 0 ? (totalReturnINR / netInvested) * 100 : 0;

    const dailyChangeNAV = currentNAV - prevNAV;
    const dailyChangePct = prevNAV > 0 ? (dailyChangeNAV / prevNAV) * 100 : 0;
    const dailyChangeINR = netUnits * dailyChangeNAV;

    const drawdownATH = athNAV > 0 ? ((currentNAV - athNAV) / athNAV) * 100 : 0;
    const drawdown52W = high52W > 0 ? ((currentNAV - high52W) / high52W) * 100 : 0;

    const timeframesPct = calculateTimeframeChanges(navDataList, currentNAV);
    const dipStatus = getDipStatus(drawdownATH);

    holdings.push({
      schemeCode: code,
      schemeName: group.schemeName,
      fundHouse,
      schemeCategory,
      isinGrowth,
      netUnits,
      netInvested,
      avgBuyNAV,
      currentNAV,
      prevNAV,
      navDate,
      currentValuation,
      totalReturnINR,
      totalReturnPct,
      dailyChangeNAV,
      dailyChangePct,
      dailyChangeINR,
      athNAV,
      high52W,
      drawdownATH,
      drawdown52W,
      timeframesPct,
      dipStatus,
      transactions: group.transactions,
      navDataList
    });
  });

  return holdings;
}

/**
 * Classifies dip buy severity based on % drop from ATH
 */
export function getDipStatus(drawdownATH) {
  const drop = Math.abs(drawdownATH);
  if (drawdownATH >= 0) return { label: 'ALL-TIME HIGH', color: 'emerald', severity: 0 };
  if (drop > 15) return { label: 'CRITICAL DIP (-15%+)', color: 'rose', severity: 4 };
  if (drop > 10) return { label: 'DEEP DIP (-10%+)', color: 'amber', severity: 3 };
  if (drop > 5) return { label: 'MODERATE DIP (-5%+)', color: 'yellow', severity: 2 };
  if (drop > 2) return { label: 'MILD DIP (-2%+)', color: 'blue', severity: 1 };
  return { label: 'NEAR PEAK', color: 'indigo', severity: 0 };
}

/**
 * Calculates historical percentage changes across standard time horizons
 */
export function calculateTimeframeChanges(navDataList, currentNAV) {
  if (!navDataList || navDataList.length === 0 || !currentNAV) {
    return { '1W': 0, '1M': 0, '3M': 0, '6M': 0, '1Y': 0, '3Y': 0 };
  }

  const now = new Date();
  
  const getNavXDaysAgo = (days) => {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() - days);
    
    for (const item of navDataList) {
      const d = parseDDMMYYYY(item.date);
      if (d && d <= targetDate) {
        return parseFloat(item.nav);
      }
    }
    return parseFloat(navDataList[navDataList.length - 1].nav);
  };

  const calculateChangePct = (pastNav) => {
    if (!pastNav || pastNav === 0) return 0;
    return ((currentNAV - pastNav) / pastNav) * 100;
  };

  return {
    '1W': calculateChangePct(getNavXDaysAgo(7)),
    '1M': calculateChangePct(getNavXDaysAgo(30)),
    '3M': calculateChangePct(getNavXDaysAgo(90)),
    '6M': calculateChangePct(getNavXDaysAgo(180)),
    '1Y': calculateChangePct(getNavXDaysAgo(365)),
    '3Y': calculateChangePct(getNavXDaysAgo(1095)),
  };
}

/**
 * Aggregates overall portfolio summary metrics
 */
export function calculatePortfolioSummary(holdings = []) {
  let totalInvested = 0;
  let totalValuation = 0;
  let todayGainINR = 0;

  holdings.forEach(h => {
    totalInvested += h.netInvested;
    totalValuation += h.currentValuation;
    todayGainINR += h.dailyChangeINR;
  });

  const totalReturnINR = totalValuation - totalInvested;
  const totalReturnPct = totalInvested > 0 ? (totalReturnINR / totalInvested) * 100 : 0;
  
  const prevPortfolioValuation = totalValuation - todayGainINR;
  const todayGainPct = prevPortfolioValuation > 0 ? (todayGainINR / prevPortfolioValuation) * 100 : 0;

  return {
    totalInvested,
    totalValuation,
    totalReturnINR,
    totalReturnPct,
    todayGainINR,
    todayGainPct,
    activeSchemesCount: holdings.length
  };
}

/**
 * Groups holdings by AMC / Fund House for comparative analysis
 */
export function calculateAMCBreakdown(holdings = []) {
  const amcGroups = {};

  holdings.forEach(h => {
    const amc = h.fundHouse || 'Other Mutual Funds';
    if (!amcGroups[amc]) {
      amcGroups[amc] = {
        amcName: amc,
        totalInvested: 0,
        currentValuation: 0,
        todayGainINR: 0,
        schemesCount: 0,
        holdings: []
      };
    }
    amcGroups[amc].totalInvested += h.netInvested;
    amcGroups[amc].currentValuation += h.currentValuation;
    amcGroups[amc].todayGainINR += h.dailyChangeINR;
    amcGroups[amc].schemesCount += 1;
    amcGroups[amc].holdings.push(h);
  });

  return Object.values(amcGroups).map(group => {
    const totalReturnINR = group.currentValuation - group.totalInvested;
    const totalReturnPct = group.totalInvested > 0 ? (totalReturnINR / group.totalInvested) * 100 : 0;
    return {
      ...group,
      totalReturnINR,
      totalReturnPct
    };
  }).sort((a, b) => b.currentValuation - a.currentValuation);
}

/**
 * Groups transactions & holdings by Account / Broker
 */
export function calculateAccountBreakdown(transactions = [], holdings = [], accounts = []) {
  const accountMap = {};

  accounts.forEach(acc => {
    accountMap[acc.id] = {
      accountId: acc.id,
      accountName: acc.name,
      broker: acc.broker,
      transactionsCount: 0,
      totalInvested: 0,
      currentValuation: 0,
      totalReturnINR: 0,
      totalReturnPct: 0
    };
  });

  // Calculate stats for each account
  transactions.forEach(tx => {
    const accId = tx.accountId || 'acc_default';
    if (accountMap[accId]) {
      accountMap[accId].transactionsCount += 1;
      if (tx.type !== 'SELL') {
        accountMap[accId].totalInvested += parseFloat(tx.amount || 0);
      }
    }
  });

  return Object.values(accountMap);
}

/**
 * Prepares chart dataset with moving averages and drawdown depth
 */
export function prepareChartData(navDataList = [], smaPeriods = [20, 50, 200]) {
  if (!navDataList || navDataList.length === 0) return [];

  const sorted = [...navDataList].sort((a, b) => {
    const da = parseDDMMYYYY(a.date);
    const db = parseDDMMYYYY(b.date);
    return da - db;
  });

  let runningMaxNAV = 0;
  const result = [];

  for (let i = 0; i < sorted.length; i++) {
    const nav = parseFloat(sorted[i].nav);
    if (nav > runningMaxNAV) runningMaxNAV = nav;

    const drawdownPct = runningMaxNAV > 0 ? ((nav - runningMaxNAV) / runningMaxNAV) * 100 : 0;

    const item = {
      date: sorted[i].date,
      nav,
      drawdownPct: parseFloat(drawdownPct.toFixed(2)),
      runningMaxNAV: parseFloat(runningMaxNAV.toFixed(2))
    };

    smaPeriods.forEach(period => {
      if (i >= period - 1) {
        let sum = 0;
        for (let k = i - period + 1; k <= i; k++) {
          sum += parseFloat(sorted[k].nav);
        }
        item[`sma${period}`] = parseFloat((sum / period).toFixed(2));
      } else {
        item[`sma${period}`] = null;
      }
    });

    result.push(item);
  }

  return result;
}
