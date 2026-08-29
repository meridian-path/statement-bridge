import { makeSectionedBankParser } from './sectionedBankStatement.js';

// Section header text and sign convention per U.S. Bank's own published checking statement
// layout: the account summary and transaction-detail sections use "Deposits/Credits" for
// incoming amounts and split outgoing amounts across "Card Withdrawals", "Other Withdrawals",
// and "Checks Paid" - the same section-implied-sign, unsigned-amount convention as Chase and
// Bank of America. No trailing running-balance column on transaction-detail lines (unlike
// Wells Fargo), so `hasTrailingBalance` is left at its default `false`.
const SECTION_HEADERS = [
  { name: 'Deposits/Credits', sign: 1 },
  { name: 'Card Withdrawals', sign: -1 },
  { name: 'Other Withdrawals', sign: -1 },
  { name: 'Checks Paid', sign: -1 },
];

export const { bankName, looksLikeMatch, parse } = makeSectionedBankParser({
  bankName: 'U.S. Bank',
  signatureRe: /\bU\.?S\.?\s?Bank\b/,
  sectionHeaders: SECTION_HEADERS,
});
