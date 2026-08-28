// Plain CSV export - the baseline format. QBO (QuickBooks Web Connect/OFX) and Xero's own
// CSV import spec are separate, format-exact export targets and are not built yet.

function csvEscape(value) {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function transactionsToCsv(transactions) {
  const header = ['Date', 'Description', 'Amount'];
  const rows = transactions.map((tx) => [tx.date, tx.description, tx.amount.toFixed(2)]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n') + '\r\n';
}
