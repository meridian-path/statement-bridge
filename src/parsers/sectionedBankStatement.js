// Shared logic for a family of bank statement layouts (Chase, Bank of America, and likely
// others in this same family) that group transactions under printed section headers -
// "Deposits and other credits", "Withdrawals and other debits", and similar - and determine a
// transaction's sign from which section it's printed under, never from the amount text itself
// (this is exactly the case the generic fallback parser, src/parsers/generic.js, cannot handle:
// it requires an explicit "-" or parenthesized amount to recognize a negative transaction, so
// every withdrawal line in this family of statements would otherwise import as a (wrong)
// positive amount there).
//
// Some statements in this family (confirmed via a real hands-on browser check against Bank of
// America's own official "How to read your statement" guide, not assumed) additionally print a
// redundant, explicit "-" directly before a debit amount even though the section itself already
// implies the sign - e.g. "07/20 Exxon 29203 Salem #000860306 - 46.32". That standalone "-"
// token isn't part of AMOUNT_RE's own match (deliberately - see above, this family's sign comes
// from the section, not the amount text), so left unhandled it lands as trailing junk on the
// parsed description instead ("...Salem #000860306 -"). Stripped explicitly below rather than
// left in, since a dangling "-" in every exported description row would look broken to a user
// checking their statement.
//
// A bank module built on this factory supplies its own detection signature and its own exact
// section header text/sign pairs; this module owns the shared column-parsing logic once.

const AMOUNT_RE = /\$?\d{1,3}(?:,\d{3})*\.\d{2}/g;
const LEADING_DATE_RE = /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(.*)$/;

function parseAmountUnsigned(token) {
  const value = parseFloat(token.replace(/[$,]/g, ''));
  return Number.isNaN(value) ? null : value;
}

/**
 * @param {{ bankName: string, signatureRe: RegExp, sectionHeaders: { name: string, sign: 1|-1 }[], hasTrailingBalance?: boolean }} config
 * `hasTrailingBalance`: some banks in this family (Wells Fargo) print a running daily balance
 * as a second number after the transaction amount on the same line - when set, the
 * second-to-last amount-shaped token on the line is treated as the transaction amount and the
 * last is treated as the balance, the same convention src/parsers/generic.js already uses.
 * Without it (Chase, Bank of America), a line carries exactly one amount-shaped number and the
 * last token found is that amount.
 */
export function makeSectionedBankParser({ bankName, signatureRe, sectionHeaders, hasTrailingBalance = false }) {
  function looksLikeMatch(text) {
    if (!signatureRe.test(text)) return false;
    const upper = text.toUpperCase();
    return sectionHeaders.some((section) => upper.includes(section.name.toUpperCase()));
  }

  function parse(text) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const transactions = [];
    const skipped = [];
    let currentSign = null;

    for (const line of lines) {
      const upper = line.toUpperCase();
      const matchedSection = sectionHeaders.find((section) =>
        upper.includes(section.name.toUpperCase())
      );
      if (matchedSection) {
        currentSign = matchedSection.sign;
        continue;
      }

      // Nothing before the first recognized section header is a transaction line in this
      // family of statements (account summary, addresses, column labels) - skip it silently
      // rather than guessing a sign for it.
      if (currentSign === null) continue;

      const dateMatch = line.match(LEADING_DATE_RE);
      if (!dateMatch) continue;

      const [, date, rest] = dateMatch;
      const amountTokens = rest.match(AMOUNT_RE);
      if (!amountTokens || amountTokens.length === 0) {
        skipped.push(line);
        continue;
      }

      const amountToken =
        hasTrailingBalance && amountTokens.length >= 2
          ? amountTokens[amountTokens.length - 2]
          : amountTokens[amountTokens.length - 1];
      const unsignedAmount = parseAmountUnsigned(amountToken);
      if (unsignedAmount === null) {
        skipped.push(line);
        continue;
      }

      const firstAmountIndex = rest.indexOf(amountTokens[0]);
      const description = rest
        .slice(0, firstAmountIndex)
        .trim()
        .replace(/\s{2,}/g, ' ')
        .replace(/\s-$/, '');

      transactions.push({ date, description, amount: unsignedAmount * currentSign });
    }

    return { transactions, skipped };
  }

  return { bankName, looksLikeMatch, parse };
}
