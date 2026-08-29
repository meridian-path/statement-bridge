// Ally Bank "Combined Customer Statement" layout: a single "Activity" table with explicit
// Credits and Debits columns per row (no section-header-implied sign, unlike the Chase/Bank of
// America/Wells Fargo/U.S. Bank/PNC family in sectionedBankStatement.js) plus a trailing running
// balance. A debit's amount is already printed negative; whichever of Credits/Debits is the
// real transaction, the OTHER column is filled with a "$0.00" placeholder rather than left
// blank - so the parser can't just take "the amount", it has to pick whichever of the two is
// non-zero. Confirmed against a real pdf.js extraction (not just the visual layout): the minus
// sign on a Debits value comes through with a space before the dollar sign - "- $503.00", not
// "-$503.00" - because that's how pdf.js's own positional text reconstruction (see
// extractText.js) joins two separately-kerned glyph runs on the same line; the amount regex
// below accounts for that gap explicitly rather than assuming adjacency.
//
// KNOWN LIMITATION, same shape as Wells Fargo's: Ally frequently wraps a transaction's
// description onto a second physical line (a merchant sub-line, or a "Transaction Fee: $ X.XX"
// note) below the row carrying the date/amounts. Only the first line's description text is kept
// - amount and sign are unaffected, since the fee is already folded into that row's own Debits
// total, not a separate transaction line.
//
// Beginning Balance and Ending Balance rows both carry a leading date (confirmed against real
// output - not the section-header family's "no date" convention) but only a single trailing
// amount rather than the credit/debit/balance pair a real transaction row carries - the
// token-count check below skips both without needing to special-case their description text.
// Only Credits and Debits are actually read; a trailing running-Balance token is never required
// or relied on, since pdf.js's own extraction is confirmed (from a real specimen) to sometimes
// mangle it with a stray internal space (e.g. "$3,5 50 . 65") that keeps it from matching
// AMOUNT_RE at all - harmless here precisely because Balance was never load-bearing.
//
// KNOWN, WORKED-AROUND QUIRK: a real specimen showed one row's date landing in its own
// extracted line, separate from that same row's description-and-amounts line (a pdf.js
// positional-bucketing split - see extractText.js's SAME_LINE_TOLERANCE_PX - that a page-break-
// adjacent row can apparently fall just outside). A bare date-only line is merged onto the line
// that follows it before the main scan below, so that row isn't silently dropped.

const LEADING_DATE_RE = /^(\d{1,2}\/\d{1,2}\/\d{4})\s+(.*)$/;
const BARE_DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
const AMOUNT_RE = /-\s?\$\d{1,3}(?:,\d{3})*\.\d{2}|\$\d{1,3}(?:,\d{3})*\.\d{2}/g;

function parseAmount(token) {
  const value = parseFloat(token.replace(/[$,\s]/g, ''));
  return Number.isNaN(value) ? null : value;
}

export const bankName = 'Ally';

export function looksLikeMatch(text) {
  return /\bAlly Bank\b/.test(text) && /\bActivity\b/.test(text) && /\bCredits\b/.test(text) && /\bDebits\b/.test(text);
}

export function parse(text) {
  const rawLines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const lines = [];
  for (let i = 0; i < rawLines.length; i++) {
    if (BARE_DATE_RE.test(rawLines[i]) && rawLines[i + 1] && !BARE_DATE_RE.test(rawLines[i + 1])) {
      lines.push(`${rawLines[i]} ${rawLines[i + 1]}`);
      i++;
    } else {
      lines.push(rawLines[i]);
    }
  }

  const transactions = [];
  const skipped = [];

  for (const line of lines) {
    const dateMatch = line.match(LEADING_DATE_RE);
    if (!dateMatch) continue;

    const [, date, rest] = dateMatch;
    const amountTokens = rest.match(AMOUNT_RE);
    // A real transaction row carries at least two amount-shaped tokens: Credits then Debits (a
    // trailing Balance, when present and well-formed, is a third that's simply ignored). Fewer
    // than two means this dated line isn't a transaction row (e.g. "Ending Balance" carries
    // only the final balance) - skip silently rather than guessing.
    if (!amountTokens || amountTokens.length < 2) continue;

    const [creditToken, debitToken] = amountTokens;
    const credit = parseAmount(creditToken);
    const debit = parseAmount(debitToken);
    if (credit === null || debit === null) {
      skipped.push(line);
      continue;
    }

    const amount = debit !== 0 ? debit : credit;
    const firstAmountIndex = rest.indexOf(creditToken);
    const description = rest.slice(0, firstAmountIndex).trim().replace(/\s{2,}/g, ' ');

    transactions.push({ date, description, amount });
  }

  return { transactions, skipped };
}
