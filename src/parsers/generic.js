// Generic fallback statement parser: works line-by-line on extracted PDF text, looking for
// "date at line start, description, one or two trailing amounts" - the shape most US bank
// and card statements share regardless of layout details. Per-bank parsers (which know a
// specific bank's exact column layout) can be added later without changing this module; this
// is deliberately the least-assumption fallback, not the primary path for a fully-covered bank.
//
// A second, narrower shape is also recognized: DESCRIPTION, then DATE, then amount(s) - e.g.
// Capital One's own official sample eStatement prints "Monthly Interest Paid 01/31/2013 $2.49
// $1,189.42" (confirmed via a real hands-on browser check against that real specimen, not
// assumed). Unlike the date-first shape, a description-first line is REQUIRED to carry both a
// transaction amount and a trailing running balance (two amount-shaped tokens, not one) before
// it's accepted - that same real specimen's own "Opening Balance"/"Closing Balance" summary
// rows have the exact same description-then-date shape but only a single trailing amount (the
// balance itself, no separate transaction amount), and there is no way to tell that apart from
// a genuine single-amount description-first transaction without guessing. Treating a
// description-first line with only one amount as unparseable (skipped, not silently dropped)
// is the deliberately conservative choice - the same real-books-corruption reasoning behind
// `skipped` below.

const LEADING_DATE_RE = /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(.*)$/;
const DESCRIPTION_THEN_DATE_RE = /^(.*?)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(.+)$/;
const AMOUNT_RE = /\(?-?\$?\d+(?:,\d{3})*(?:\.\d{2})\)?/g;

function parseAmount(token) {
  const isParenNegative = /^\(.*\)$/.test(token);
  const cleaned = token.replace(/[()$,]/g, '');
  const value = parseFloat(isParenNegative ? cleaned : cleaned.replace(/^-/, ''));
  if (Number.isNaN(value)) return null;
  const isMinusNegative = token.trim().startsWith('-');
  return isParenNegative || isMinusNegative ? -Math.abs(value) : value;
}

// Returns { transactions, skipped }. `transactions` is every line that matched one of the two
// recognized shapes. `skipped` is every line that had a leading date (either shape) but no
// amount this parser could confidently attribute to a transaction - surfaced to the user rather
// than silently dropped, since a missing transaction is exactly the failure mode that corrupts
// someone's books.
export function parseGenericStatement(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const transactions = [];
  const skipped = [];

  for (const line of lines) {
    const dateFirstMatch = line.match(LEADING_DATE_RE);
    if (dateFirstMatch) {
      const [, date, rest] = dateFirstMatch;
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
      continue;
    }

    const descriptionFirstMatch = line.match(DESCRIPTION_THEN_DATE_RE);
    if (!descriptionFirstMatch) continue;

    const [, description, date, rest] = descriptionFirstMatch;
    const amountTokens = rest.match(AMOUNT_RE);
    if (!amountTokens || amountTokens.length < 2) {
      skipped.push(line);
      continue;
    }

    const amount = parseAmount(amountTokens[amountTokens.length - 2]);
    if (amount === null) {
      skipped.push(line);
      continue;
    }

    transactions.push({ date, description: description.trim().replace(/\s{2,}/g, ' '), amount });
  }

  return { transactions, skipped };
}
