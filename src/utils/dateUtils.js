/**
 * Converts DD-MM-YYYY string to Date object
 */
export function parseDDMMYYYY(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    } else {
      // DD-MM-YYYY
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  return new Date(dateStr);
}

/**
 * Formats a date string (DD-MM-YYYY or ISO) into readable '12 Aug 2026'
 */
export function formatDate(dateInput) {
  if (!dateInput) return '-';
  const d = parseDDMMYYYY(dateInput);
  if (!d || isNaN(d.getTime())) return String(dateInput);

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Formats date object or DD-MM-YYYY to YYYY-MM-DD string for HTML input
 */
export function toInputDateFormat(dateInput) {
  const d = parseDDMMYYYY(dateInput) || new Date();
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Converts YYYY-MM-DD to DD-MM-YYYY for API matching
 */
export function inputToDDMMYYYY(inputStr) {
  if (!inputStr) return '';
  const parts = inputStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return inputStr;
  }
  return inputStr;
}

/**
 * Finds the exact or closest preceding NAV entry for a target date
 * data array is sorted newest to oldest: [ { date: '21-08-2026', nav: '215.41' }, ... ]
 */
export function findNAVForDate(navDataList, targetDateStr) {
  if (!navDataList || navDataList.length === 0 || !targetDateStr) return null;
  
  const targetDateObj = parseDDMMYYYY(targetDateStr);
  if (!targetDateObj || isNaN(targetDateObj.getTime())) return parseFloat(navDataList[0].nav);

  const targetTime = targetDateObj.getTime();

  // Find closest preceding date (since market might be closed on weekend/holiday)
  for (const item of navDataList) {
    const itemDate = parseDDMMYYYY(item.date);
    if (itemDate && itemDate.getTime() <= targetTime) {
      return parseFloat(item.nav);
    }
  }

  // Fallback to oldest available NAV
  return parseFloat(navDataList[navDataList.length - 1].nav);
}

/**
 * Subtracts time horizon from current date
 */
export function getStartDateForTimeframe(timeframe, customStartDate = null) {
  const now = new Date();
  const date = new Date(now);

  switch (timeframe) {
    case '1D':
      date.setDate(date.getDate() - 1);
      break;
    case '1W':
      date.setDate(date.getDate() - 7);
      break;
    case '1M':
      date.setMonth(date.getMonth() - 1);
      break;
    case '3M':
      date.setMonth(date.getMonth() - 3);
      break;
    case '6M':
      date.setMonth(date.getMonth() - 6);
      break;
    case '1Y':
      date.setFullYear(date.getFullYear() - 1);
      break;
    case '3Y':
      date.setFullYear(date.getFullYear() - 3);
      break;
    case 'CUSTOM':
      return customStartDate ? parseDDMMYYYY(customStartDate) : null;
    case 'ALL':
    default:
      return null;
  }
  return date;
}
