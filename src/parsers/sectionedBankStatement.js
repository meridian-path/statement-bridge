// Shared logic for a family of bank statement layouts (Chase, Bank of America, and likely
// others in this same family) that group transactions under printed section headers -
// "Deposits and other credits", "Withdrawals and other debits", and similar - and print each
// transaction's amount WITHOUT a leading minus sign. The sign of a withdrawal is implied by
// which section it's printed under, never by the amount text itself. This is exactly the case
// the generic fallback parser (src/parsers/generic.js) cannot handle: it requires an explicit
// "-" or parenthesized amount to recognize a negative transaction, so every withdrawal line in
// this family of statements would otherwise import as a (wrong) positive amount.
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
 * @param {{ bankName: string, signatureRe: RegExp, sectionHeaders: { name: string, sign: 1|-1 }[] }} config
 */
export function makeSectionedBankParser({ bankName, signatureRe, sectionHeaders }) {
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

      const amountToken = amountTokens[amountTokens.length - 1];
      const unsignedAmount = parseAmountUnsigned(amountToken);
      if (unsignedAmount === null) {
        skipped.push(line);
        continue;
      }

      const firstAmountIndex = rest.indexOf(amountTokens[0]);
      const description = rest.slice(0, firstAmountIndex).trim().replace(/\s{2,}/g, ' ');

      transactions.push({ date, description, amount: unsignedAmount * currentSign });
    }

    return { transactions, skipped };
  }

  return { bankName, looksLikeMatch, parse };
}
