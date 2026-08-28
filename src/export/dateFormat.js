// Normalizes a parsed transaction's own date string - which may or may not carry an explicit
// year, e.g. "01/15" from the generic/bank parsers vs "01/16/2026" or a 2-digit "01/16/26" -
// into a full calendar date. When the source text carried no year at all, this defaults to
// the current calendar year (injectable as `referenceDate` for deterministic testing, and
// implicitly the real clock in production). The review-before-export table lets a user
// correct a row's date before exporting, so a wrong assumed year for an old statement
// exported after the new year turns over is recoverable there, not silently wrong forever.

const DATE_RE = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/;

export function normalizeDateParts(dateStr, referenceDate = new Date()) {
  const match = String(dateStr).trim().match(DATE_RE);
  if (!match) return null;

  const [, mm, dd, yy] = match;
  let year;
  if (!yy) {
    year = referenceDate.getFullYear();
  } else if (yy.length === 2) {
    year = 2000 + parseInt(yy, 10);
  } else {
    year = parseInt(yy, 10);
  }

  return { year, month: parseInt(mm, 10), day: parseInt(dd, 10) };
}

// OFX/QBO's own date format: YYYYMMDD.
export function toOfxDate(dateStr, referenceDate = new Date()) {
  const parts = normalizeDateParts(dateStr, referenceDate);
  if (!parts) return null;
  return `${parts.year}${String(parts.month).padStart(2, '0')}${String(parts.day).padStart(2, '0')}`;
}

// OFX's DTSERVER/DTASOF timestamp format: YYYYMMDDHHMMSS.
export function toOfxDateTime(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

// Xero's US-region CSV date format: MM/DD/YYYY.
export function toUsSlashDate(dateStr, referenceDate = new Date()) {
  const parts = normalizeDateParts(dateStr, referenceDate);
  if (!parts) return null;
  return `${String(parts.month).padStart(2, '0')}/${String(parts.day).padStart(2, '0')}/${parts.year}`;
}
