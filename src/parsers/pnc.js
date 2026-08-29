import { makeSectionedBankParser } from './sectionedBankStatement.js';

// Section header text and sign convention per PNC's own published checking statement layout:
// "Deposits and Other Additions" for incoming amounts, "Banking/Debit Card Withdrawals and
// Purchases" and "Other Deductions" for outgoing amounts - the same section-implied-sign,
// unsigned-amount convention as Chase and Bank of America. No trailing running-balance column
// confirmed on transaction-detail lines, so `hasTrailingBalance` is left at its default
// `false`.
const SECTION_HEADERS = [
  { name: 'Deposits and Other Additions', sign: 1 },
  { name: 'Banking/Debit Card Withdrawals and Purchases', sign: -1 },
  { name: 'Other Deductions', sign: -1 },
];

export const { bankName, looksLikeMatch, parse } = makeSectionedBankParser({
  bankName: 'PNC',
  signatureRe: /\bPNC\b/,
  sectionHeaders: SECTION_HEADERS,
});
