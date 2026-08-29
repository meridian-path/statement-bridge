import { makeSectionedBankParser } from './sectionedBankStatement.js';

// Section header text and sign convention per Bank of America's own official "How to read
// your statement" guide (bankofamerica.com) - the same section-implied-sign, unsigned-amount
// convention as Chase's checking statements. CORRECTED against that real official source: the
// two main headers are "Deposits and other additions" and "Withdrawals and other subtractions"
// - not "...other credits"/"...other debits" as this file originally (wrongly) assumed, before
// any real specimen had been checked. "Withdrawals and other subtractions" is itself a broader
// section that groups three of its own sub-headers ("Checks", "ATM and debit card
// subtractions", "Other subtractions") plus "Service fees" as a separate section - all five are
// registered directly here since each one directly precedes its own itemized Date/Description/
// Amount table in the real layout, and `makeSectionedBankParser` only needs a header that
// actually appears immediately before its transaction lines, not the top-level category name.
const SECTION_HEADERS = [
  { name: 'Deposits and other additions', sign: 1 },
  { name: 'Checks', sign: -1 },
  { name: 'ATM and debit card subtractions', sign: -1 },
  { name: 'Other subtractions', sign: -1 },
  { name: 'Service fees', sign: -1 },
];

export const { bankName, looksLikeMatch, parse } = makeSectionedBankParser({
  bankName: 'Bank of America',
  signatureRe: /\bBank of America\b/,
  sectionHeaders: SECTION_HEADERS,
});
