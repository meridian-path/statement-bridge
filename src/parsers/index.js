import { parseGenericStatement } from './generic.js';
import * as chase from './chase.js';
import * as bankOfAmerica from './bankOfAmerica.js';
import * as wellsFargo from './wellsFargo.js';
import * as usBank from './usBank.js';
import * as pnc from './pnc.js';

// Tried in order; the first bank whose detection signature matches wins. Chase, Bank of
// America, Wells Fargo, U.S. Bank, and PNC have a dedicated parser so far - every other bank
// (and any statement none of these match) falls through to the generic date/description/amount
// fallback below. The rest of the 10-15-bank MVP target list is follow-up work, not covered
// here yet.
const BANK_PARSERS = [chase, bankOfAmerica, wellsFargo, usBank, pnc];

/**
 * @returns {{ transactions: {date:string,description:string,amount:number}[], skipped: string[], matchedBank: string|null }}
 */
export function parseStatement(text) {
  for (const bankParser of BANK_PARSERS) {
    if (!bankParser.looksLikeMatch(text)) continue;
    const result = bankParser.parse(text);
    // A bank-specific parser that matched the detection signature but still found zero
    // transactions is more likely a statement variant that parser doesn't handle than a
    // statement with genuinely no transactions - fall back to generic rather than reporting
    // nothing found.
    if (result.transactions.length > 0) {
      return { ...result, matchedBank: bankParser.bankName };
    }
  }
  return { ...parseGenericStatement(text), matchedBank: null };
}
