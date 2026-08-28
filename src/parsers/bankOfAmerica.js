import { makeSectionedBankParser } from './sectionedBankStatement.js';

// Section header text and sign convention per Bank of America's own published statement
// layout - the same section-implied-sign, unsigned-amount convention as Chase's checking
// statements, but with Bank of America's own exact header wording.
const SECTION_HEADERS = [
  { name: 'Deposits and other credits', sign: 1 },
  { name: 'Withdrawals and other debits', sign: -1 },
  { name: 'Checks', sign: -1 },
  { name: 'Service fees', sign: -1 },
];

export const { bankName, looksLikeMatch, parse } = makeSectionedBankParser({
  bankName: 'Bank of America',
  signatureRe: /\bBank of America\b/,
  sectionHeaders: SECTION_HEADERS,
});
