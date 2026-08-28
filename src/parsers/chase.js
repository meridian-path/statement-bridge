import { makeSectionedBankParser } from './sectionedBankStatement.js';

// Section header text and sign convention per Chase's own published statement layout
// (checking account statements group transactions under these headers; consumer credit card
// statements use a different layout entirely and are not handled by this module).
const SECTION_HEADERS = [
  { name: 'DEPOSITS AND ADDITIONS', sign: 1 },
  { name: 'ELECTRONIC WITHDRAWALS', sign: -1 },
  { name: 'ATM & DEBIT CARD WITHDRAWALS', sign: -1 },
  { name: 'CHECKS PAID', sign: -1 },
  { name: 'FEES', sign: -1 },
];

// Requiring the literal "Chase" text AND at least one of the section headers above (rather
// than either alone) avoids a false-positive match on an unrelated statement whose text
// happens to mention "chase" in some other context.
export const { bankName, looksLikeMatch, parse } = makeSectionedBankParser({
  bankName: 'Chase',
  signatureRe: /\bChase\b/,
  sectionHeaders: SECTION_HEADERS,
});
