// Xero's own documented bank-statement CSV import format: a Date/Description/Amount header
// row, a single signed Amount column (positive = money in, negative = money out - the same
// sign convention this app already uses internally for every transaction), and a date
// matching the organisation's regional format (US: MM/DD/YYYY).
//
// Source note: Xero's own help-center article ("Import a CSV bank statement", US region)
// could not be fetched directly by this session's tooling - it timed out twice, consistent
// with that page being a JS-rendered single-page app rather than a deliberate skip. The shape
// implemented here is corroborated across multiple independent search-engine summaries
// referencing that same article (three-column Date/Description/Amount, signed amount,
// region-matched date format) rather than read from the primary page directly - flagged
// honestly rather than presented as independently verified against Xero's own text.
import { rowsToCsv } from './csvUtils.js';
import { toUsSlashDate } from './dateFormat.js';

export function transactionsToXeroCsv(transactions, { referenceDate = new Date() } = {}) {
  const header = ['Date', 'Description', 'Amount'];
  const rows = transactions.map((tx) => [
    toUsSlashDate(tx.date, referenceDate) || tx.date,
    tx.description,
    tx.amount.toFixed(2),
  ]);
  return rowsToCsv([header, ...rows]);
}
