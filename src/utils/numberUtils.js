/**
 * Short Indian notation for chart axes: 950 -> "₹950", 45000 -> "₹45K", 250000 -> "₹2.5L", 12000000 -> "₹1.2Cr"
 */
export function formatCompactINR(value) {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  const trim = (n) => String(parseFloat(n.toFixed(abs >= 100000 ? 2 : 1)));
  if (abs >= 10000000) return `${sign}₹${trim(abs / 10000000)}Cr`;
  if (abs >= 100000) return `${sign}₹${trim(abs / 100000)}L`;
  if (abs >= 1000) return `${sign}₹${trim(abs / 1000)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

/**
 * Converts a number to Indian Rupees format in words
 * e.g. 100000 -> "One Lakh Rupees Only (1.00 Lakhs)"
 * e.g. 50000 -> "Fifty Thousand Rupees Only (50.0k)"
 * e.g. 10000000 -> "One Crore Rupees Only (1.00 Cr)"
 */
export function numberToWordsINR(numStr) {
  if (numStr === null || numStr === undefined || numStr === '') return '';
  const num = parseFloat(numStr);
  if (isNaN(num) || num <= 0) return '';

  const amount = Math.floor(num);
  if (amount === 0) return 'Zero Rupees';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teen = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertLessThanThousand(n) {
    if (n === 0) return '';
    let str = '';
    if (n >= 100) {
      str += single[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 10 && n < 20) {
      str += teen[n - 10] + ' ';
    } else if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
      if (n > 0) str += single[n] + ' ';
    } else if (n > 0) {
      str += single[n] + ' ';
    }
    return str;
  }

  let crore = Math.floor(amount / 10000000);
  let remainder = amount % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder %= 1000;
  let hundred = remainder;

  let result = '';
  if (crore > 0) result += convertLessThanThousand(crore) + 'Crore ';
  if (lakh > 0) result += convertLessThanThousand(lakh) + 'Lakh ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + 'Thousand ';
  if (hundred > 0) result += convertLessThanThousand(hundred);

  const words = result.trim();

  // Short Indian Notation Badge e.g. "1.5 Lakhs", "2.5 Cr"
  let shortNotation = '';
  if (amount >= 10000000) {
    const crVal = amount / 10000000;
    shortNotation = ` • ${crVal % 1 === 0 ? crVal : crVal.toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    const lakhVal = amount / 100000;
    shortNotation = ` • ${lakhVal % 1 === 0 ? lakhVal : lakhVal.toFixed(2)} Lakhs`;
  } else if (amount >= 1000) {
    const kVal = amount / 1000;
    shortNotation = ` • ${kVal % 1 === 0 ? kVal : kVal.toFixed(1)}k`;
  }

  return `₹ ${words} Rupees Only${shortNotation}`;
}
