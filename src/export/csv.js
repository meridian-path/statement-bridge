// Plain CSV export - the default/baseline format. QBO (src/export/qbo.js) and Xero's own CSV
// import spec (src/export/xeroCsv.js) are the two additional export targets.
import { rowsToCsv } from './csvUtils.js';

export function transactionsToCsv(transactions) {
  const header = ['Date', 'Description', 'Amount'];
  const rows = transactions.map((tx) => [tx.date, tx.description, tx.amount.toFixed(2)]);
  return rowsToCsv([header, ...rows]);
}
