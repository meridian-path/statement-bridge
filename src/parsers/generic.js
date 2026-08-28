// Generic fallback statement parser: works line-by-line on extracted PDF text, looking for
// "date at line start, description, one or two trailing amounts" - the shape most US bank
// and card statements share regardless of layout details. Per-bank parsers (which know a
// specific bank's exact column layout) can be added later without changing this module; this
// is deliberately the least-assumption fallback, not the primary path for a fully-covered bank.

const LEADING_DATE_RE = /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(.*)$/;
const AMOUNT_RE = /\(?-?\$?\d+(?:,\d{3})*(?:\.\d{2})\)?/g;

function parseAmount(token) {
  const isParenNegative = /^\(.*\)$/.test(token);
  const cleaned = token.replace(/[()$,]/g, '');
  const value = parseFloat(isParenNegative ? cleaned : cleaned.replace(/^-/, ''));
  if (Number.isNaN(value)) return null;
  const isMinusNegative = token.trim().startsWith('-');
  return isParenNegative || isMinusNegative ? -Math.abs(value) : value;
}

// Returns { transactions, skipped }. `transactions` is every line that matched the
// date+amount shape. `skipped` is every line that had a leading date but no parseable
// amount - surfaced to the user rather than silently dropped, since a missing transaction is
// exactly the failure mode that corrupts someone's books.
export function parseGenericStatement(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const transactions = [];
  const skipped = [];

  for (const line of lines) {
    const dateMatch = line.match(LEADING_DATE_RE);
    if (!dateMatch) continue;

    const [, date, rest] = dateMatch;
    const amountTokens = rest.match(AMOUNT_RE);
    if (!amountTokens || amountTokens.length === 0) {
      skipped.push(line);
      continue;
    }

    // Two-or-more amount-shaped tokens on a transaction line almost always means
    // "amount, then running balance" (the dominant US statement convention) - take the
    // second-to-last as the transaction amount. A single token is the amount itself.
    const amountToken =
      amountTokens.length >= 2 ? amountTokens[amountTokens.length - 2] : amountTokens[0];
    const amount = parseAmount(amountToken);
    if (amount === null) {
      skipped.push(line);
      continue;
    }

    const firstAmountIndex = rest.indexOf(amountTokens[0]);
    const description = rest.slice(0, firstAmountIndex).trim().replace(/\s{2,}/g, ' ');

    transactions.push({ date, description, amount });
  }

  return { transactions, skipped };
}
