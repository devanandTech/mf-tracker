import { parseDDMMYYYY } from './dateUtils.js';

// Units below this are treated as a closed position (rounding dust from amount-based sells)
export const UNIT_EPSILON = 0.0005;

const DAY_MS = 24 * 60 * 60 * 1000;

function txTime(tx) {
  const d = parseDDMMYYYY(tx.date);
  return d && !isNaN(d.getTime()) ? d.getTime() : 0;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Units for a transaction, falling back to amount / NAV when units were not recorded
 */
export function txUnits(tx) {
  const units = parseFloat(tx.units || 0);
  if (units > 0) return units;
  const amount = parseFloat(tx.amount || 0);
  const nav = parseFloat(tx.nav || 0);
  return nav > 0 ? amount / nav : 0;
}

/**
 * Returns a new array sorted oldest first; purchases are applied before redemptions on the same day
 */
export function sortTxsChronological(transactions = []) {
  return [...transactions].sort((a, b) => {
    const diff = txTime(a) - txTime(b);
    if (diff !== 0) return diff;
    return (a.type === 'SELL' ? 1 : 0) - (b.type === 'SELL' ? 1 : 0);
  });
}

function createLotState() {
  return {
    lots: [],
    netUnits: 0,
    costBasis: 0,
    realizedPnL: 0,
    redeemedAmount: 0,
    totalBoughtUnits: 0,
    totalBoughtAmount: 0
  };
}

// Applies one transaction to a FIFO lot state (redemptions consume the oldest units first)
function applyTxToLots(state, tx) {
  const units = txUnits(tx);
  const amount = parseFloat(tx.amount || 0);

  if (tx.type === 'SELL') {
    let remaining = units;
    let costRemoved = 0;
    while (remaining > 1e-9 && state.lots.length > 0) {
      const lot = state.lots[0];
      const used = Math.min(lot.units, remaining);
      costRemoved += used * lot.costPerUnit;
      lot.units -= used;
      remaining -= used;
      if (lot.units <= 1e-9) state.lots.shift();
    }
    state.netUnits -= units - remaining;
    state.costBasis -= costRemoved;
    state.realizedPnL += amount - costRemoved;
    state.redeemedAmount += amount;
  } else if (units > 0) {
    state.lots.push({ units, costPerUnit: amount / units });
    state.netUnits += units;
    state.costBasis += amount;
    state.totalBoughtUnits += units;
    state.totalBoughtAmount += amount;
  }

  if (state.netUnits < UNIT_EPSILON) {
    state.lots = [];
    state.netUnits = 0;
    state.costBasis = 0;
  }
}

/**
 * FIFO position for one scheme: remaining units, their cost, and realised P&L on redeemed units
 */
export function computeFifoPosition(transactions = []) {
  const state = createLotState();
  sortTxsChronological(transactions).forEach(tx => applyTxToLots(state, tx));

  return {
    netUnits: state.netUnits,
    costBasis: state.costBasis,
    avgCost: state.netUnits > 0 ? state.costBasis / state.netUnits : 0,
    realizedPnL: state.realizedPnL,
    redeemedAmount: state.redeemedAmount,
    totalBoughtUnits: state.totalBoughtUnits,
    totalBoughtAmount: state.totalBoughtAmount
  };
}

/**
 * Units that can be redeemed on a date without any later redemption running short
 */
export function sellableUnitsOn(transactions = [], dateInput) {
  const target = parseDDMMYYYY(dateInput);
  const targetTime = target && !isNaN(target.getTime()) ? target.getTime() : Date.now();

  let balance = 0;
  let sellable = null;
  sortTxsChronological(transactions).forEach(tx => {
    if (txTime(tx) > targetTime && sellable === null) sellable = balance;
    balance += tx.type === 'SELL' ? -txUnits(tx) : txUnits(tx);
    if (sellable !== null) sellable = Math.min(sellable, balance);
  });
  if (sellable === null) sellable = balance;

  return Math.max(0, sellable);
}

/**
 * Returns the first redemption that sells more units than were held at that point, or null
 */
export function findOversell(transactions = []) {
  let balance = 0;
  for (const tx of sortTxsChronological(transactions)) {
    balance += tx.type === 'SELL' ? -txUnits(tx) : txUnits(tx);
    if (balance < -UNIT_EPSILON) return tx;
  }
  return null;
}

/**
 * Annualised money-weighted return. cashflows: [{ date: Date, amount }] with investments negative.
 * Returns a percentage, or null when it cannot be computed (one-sided flows, under 30 days of history).
 */
export function xirr(cashflows = []) {
  const flows = cashflows
    .filter(f => f && f.date && !isNaN(f.date.getTime()) && Math.abs(f.amount) > 1e-9)
    .sort((a, b) => a.date - b.date);
  if (flows.length < 2) return null;
  if (!flows.some(f => f.amount > 0) || !flows.some(f => f.amount < 0)) return null;

  const t0 = flows[0].date.getTime();
  const years = flows.map(f => (f.date.getTime() - t0) / DAY_MS / 365);
  if (years[years.length - 1] < 30 / 365) return null;

  const npv = (rate) => flows.reduce((sum, f, i) => sum + f.amount / Math.pow(1 + rate, years[i]), 0);

  let lo = -0.9999;
  let hi = 10;
  let fLo = npv(lo);
  const fHi = npv(hi);
  if (!isFinite(fLo) || !isFinite(fHi) || fLo * fHi > 0) return null;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7 || hi - lo < 1e-9) return mid * 100;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return ((lo + hi) / 2) * 100;
}

function toCashflows(transactions) {
  return transactions.map(tx => ({
    date: parseDDMMYYYY(tx.date),
    amount: tx.type === 'SELL' ? parseFloat(tx.amount || 0) : -parseFloat(tx.amount || 0)
  }));
}

/**
 * Calculates portfolio holdings aggregated by schemeCode.
 * Includes fully redeemed schemes (isExited) so realised P&L is not lost.
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

    const sortedTxs = sortTxsChronological(group.transactions);

    const firstTxDate = sortedTxs.length > 0 ? sortedTxs[0].date : 'N/A';
    const lastTxDate = sortedTxs.length > 0 ? sortedTxs[sortedTxs.length - 1].date : 'N/A';

    const position = computeFifoPosition(sortedTxs);
    const netUnits = position.netUnits;
    const netInvested = position.costBasis;
    const isExited = netUnits <= 0;
    // Average cost of the units still held; for exited schemes, of everything ever bought
    const avgBuyNAV = position.avgCost
      || (position.totalBoughtUnits > 0 ? position.totalBoughtAmount / position.totalBoughtUnits : 0);

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

    const cashflows = toCashflows(sortedTxs);
    const xirrPct = xirr(
      isExited ? cashflows : [...cashflows, { date: startOfToday(), amount: currentValuation }]
    );

    holdings.push({
      schemeCode: code,
      schemeName: group.schemeName,
      fundHouse,
      schemeCategory,
      isinGrowth,
      firstTxDate,
      lastTxDate,
      netUnits,
      netInvested,
      avgBuyNAV,
      currentNAV,
      prevNAV,
      navDate,
      currentValuation,
      totalReturnINR,
      totalReturnPct,
      realizedPnL: position.realizedPnL,
      redeemedAmount: position.redeemedAmount,
      xirr: xirrPct,
      isExited,
      cashflows,
      dailyChangeNAV,
      dailyChangePct,
      dailyChangeINR,
      athNAV,
      high52W,
      drawdownATH,
      drawdown52W,
      timeframesPct,
      dipStatus,
      transactions: sortedTxs,
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
 * Aggregates overall portfolio summary metrics.
 * exitedHoldings only contribute realised P&L and their cashflows to XIRR.
 */
export function calculatePortfolioSummary(holdings = [], exitedHoldings = []) {
  let totalInvested = 0;
  let totalValuation = 0;
  let todayGainINR = 0;
  let realizedPnL = 0;
  const cashflows = [];

  holdings.forEach(h => {
    totalInvested += h.netInvested;
    totalValuation += h.currentValuation;
    todayGainINR += h.dailyChangeINR;
  });

  [...holdings, ...exitedHoldings].forEach(h => {
    realizedPnL += h.realizedPnL || 0;
    if (h.cashflows) cashflows.push(...h.cashflows);
  });

  const xirrPct = xirr(
    totalValuation > 0 ? [...cashflows, { date: startOfToday(), amount: totalValuation }] : cashflows
  );

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
    realizedPnL,
    xirr: xirrPct,
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

const ascendingNavCache = new WeakMap();

// mfapi returns NAVs newest first; the series walk needs them oldest first with parsed dates
function getAscendingNavs(navDataList) {
  if (!navDataList || navDataList.length === 0) return [];
  if (ascendingNavCache.has(navDataList)) return ascendingNavCache.get(navDataList);

  const parsed = [];
  navDataList.forEach(item => {
    const d = parseDDMMYYYY(item.date);
    const nav = parseFloat(item.nav);
    if (d && !isNaN(d.getTime()) && nav > 0) parsed.push({ time: d.getTime(), nav });
  });
  parsed.sort((a, b) => a.time - b.time);
  ascendingNavCache.set(navDataList, parsed);
  return parsed;
}

/**
 * Daily invested-vs-valuation curve for a set of transactions.
 * invested = FIFO cost of the units held that day; valuation = units x NAV of that day.
 * The final point is always today, so it matches calculateHoldings totals.
 */
export function buildValuationSeries(transactions = [], schemeDetailsMap = {}, { from = null, maxPoints = 250 } = {}) {
  const sortedTxs = sortTxsChronological(transactions).filter(tx => txTime(tx) > 0);
  if (sortedTxs.length === 0) return [];

  const schemes = {};
  sortedTxs.forEach(tx => {
    const code = parseInt(tx.schemeCode, 10);
    if (!schemes[code]) {
      schemes[code] = {
        state: createLotState(),
        navs: getAscendingNavs(schemeDetailsMap[code]?.data),
        navIdx: -1,
        lastTxNav: 0
      };
    }
  });
  const schemeList = Object.values(schemes);

  const today = startOfToday();
  const first = new Date(txTime(sortedTxs[0]));
  const fromTime = from && from.getTime() > first.getTime() ? from.getTime() : first.getTime();

  const points = [];
  let txIdx = 0;

  for (let day = first; day <= today; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
    const dayTime = day.getTime();

    while (txIdx < sortedTxs.length && txTime(sortedTxs[txIdx]) <= dayTime) {
      const tx = sortedTxs[txIdx];
      const scheme = schemes[parseInt(tx.schemeCode, 10)];
      applyTxToLots(scheme.state, tx);
      const nav = parseFloat(tx.nav || 0);
      if (nav > 0) scheme.lastTxNav = nav;
      txIdx++;
    }

    if (dayTime < fromTime) continue;

    let invested = 0;
    let valuation = 0;
    schemeList.forEach(scheme => {
      const { state, navs } = scheme;
      while (scheme.navIdx + 1 < navs.length && navs[scheme.navIdx + 1].time <= dayTime) scheme.navIdx++;
      if (state.netUnits <= 0) return;

      invested += state.costBasis;
      if (navs.length === 0) {
        // No NAV history cached: value at cost, same as calculateHoldings
        valuation += state.costBasis;
      } else {
        const nav = scheme.navIdx >= 0 ? navs[scheme.navIdx].nav : (scheme.lastTxNav || navs[0].nav);
        valuation += state.netUnits * nav;
      }
    });

    points.push({
      date: day.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
      time: dayTime,
      invested: Math.round(invested),
      valuation: Math.round(valuation),
      profit: Math.round(valuation - invested)
    });
  }

  if (points.length <= maxPoints) return points;

  // Thin out long histories, anchored on the last point so today is always kept
  const step = Math.ceil(points.length / maxPoints);
  const lastIdx = points.length - 1;
  return points.filter((_, i) => (lastIdx - i) % step === 0);
}
