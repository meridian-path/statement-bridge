import { makeSectionedBankParser } from './sectionedBankStatement.js';

// Section header text and sign convention per Wells Fargo's own published statement layout:
// "Deposits and Other Credits" and "Transaction History" (withdrawals/debits), the same
// section-implied-sign convention as Chase and Bank of America - but Wells Fargo additionally
// prints a running daily balance alongside each transaction's own amount, hence
// `hasTrailingBalance: true`.
//
// KNOWN LIMITATION, stated honestly rather than silently accepted: Wells Fargo statements are
// known to wrap longer merchant descriptions onto a second physical line. This parser (like
// the generic fallback) only reads whatever text lands on the same line as the date and
// amount - a wrapped continuation line is not stitched back onto its transaction, so a
// long/wrapped description may come through truncated to its first line only. The amount and
// sign are unaffected by this - only the description text.
const SECTION_HEADERS = [
  { name: 'Deposits and Other Credits', sign: 1 },
  { name: 'Transaction History', sign: -1 },
];

export const { bankName, looksLikeMatch, parse } = makeSectionedBankParser({
  bankName: 'Wells Fargo',
  signatureRe: /\bWells Fargo\b/,
  sectionHeaders: SECTION_HEADERS,
  hasTrailingBalance: true,
});
