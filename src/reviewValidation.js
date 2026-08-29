// Pure validation logic for the review-before-export table, kept separate from main.js's own
// DOM-wiring code so it can be unit tested even though main.js itself stays untested integration
// glue (the same reasoning src/pdf/extractText.js's own header comment already gives for why
// that module isn't unit-tested either).

// A full-string match, not a leading-prefix parse: parseFloat("12abc") happily returns 12,
// silently dropping the trailing garbage - exactly the kind of partial-garbage edit this exists
// to catch and flag instead of silently accepting a truncated number.
const FULL_NUMBER_RE = /^-?\d+(\.\d+)?$/;

export function validateAmount(rawValue) {
  return FULL_NUMBER_RE.test(String(rawValue).trim());
}
