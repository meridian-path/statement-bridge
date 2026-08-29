// Pure display/computation helpers for the review-before-export table, kept separate from
// main.js's own DOM-wiring code so this logic can be unit tested (same reasoning
// reviewValidation.js already gives for its own separation from main.js).

// Formats a signed amount the way a real bank statement prints it ($1,850.00 / -$84.32) - the
// raw number an <input type="number"> can hold costs a reader a mental conversion on every row
// when checking parsed output against the original statement.
export function formatCurrencyDisplay(amount) {
  // Round first, then decide the sign from the ROUNDED value - a tiny negative amount that
  // rounds to 0.00 at display precision would otherwise print as the confusing "-$0.00".
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const formatted = rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return amount < 0 && rounded !== 0 ? `-$${formatted}` : `$${formatted}`;
}

// Net/deposits/withdrawals totals across a transaction list - the single most effective "did
// parsing miss or corrupt anything" check is comparing these against the statement's own
// printed totals, and they were previously nowhere in the UI at all.
export function computeTotals(transactions) {
  let deposits = 0;
  let withdrawals = 0;
  for (const tx of transactions) {
    if (tx.amount >= 0) {
      deposits += tx.amount;
    } else {
      withdrawals += tx.amount;
    }
  }
  return {
    count: transactions.length,
    net: deposits + withdrawals,
    deposits,
    withdrawals,
  };
}

// Builds an accessible label for one review-table field, naming the field plus enough row
// identity (description + date) for a screen reader user to tell rows apart - without this, a
// bare <input> announces as "edit text" with no indication of which field or which transaction,
// 69+ times on a real statement (3 fields x 23 rows). Deliberately computed once from the row's
// own values at render time, not re-derived as the user edits - the label a screen reader
// announced when tabbing into the field shouldn't shift mid-edit just because its own value is
// changing.
export function buildFieldLabel(fieldName, tx) {
  return `${fieldName} for ${tx.description} on ${tx.date}`;
}

// Builds an accessible label for one row's Remove button - 23 identical bare "Remove" buttons
// with no way to tell them apart is the same problem one level up. Uses a 1-based row number
// (screen reader users, like sighted users, count rows starting at 1, not 0).
export function buildRemoveLabel(index, tx) {
  return `Remove row ${index + 1}: ${tx.description}, ${tx.amount}`;
}
