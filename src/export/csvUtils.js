// Shared CSV field-escaping and row-joining, used by every CSV-shaped export format (the
// plain baseline export and the Xero-specific export both need identical quoting rules).

export function csvEscapeField(value) {
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv(rows) {
  return rows.map((row) => row.map(csvEscapeField).join(',')).join('\r\n') + '\r\n';
}

// CSV/Formula Injection guard (OWASP): a spreadsheet app (Excel, Google Sheets, LibreOffice)
// treats a cell whose content starts with =, +, -, @, a tab, or a carriage return as a formula
// to evaluate rather than plain text once the CSV is opened - a real risk here specifically
// because a transaction's Description comes from the uploaded PDF's own text (attacker-
// controllable if the source PDF is itself malicious) and both Description and Date are further
// free-text-editable by the user in the review-before-export table before this runs. Prefixing
// a lone leading single quote is the standard spreadsheet-native mitigation: it forces text
// interpretation without altering the value a person actually sees once the cell is opened.
//
// Deliberately NOT applied to the Amount column (nor folded into csvEscapeField/rowsToCsv
// above, which every column - Amount included - still goes through for ordinary CSV quoting):
// Amount legitimately starts with "-" for every debit transaction, and prefixing that would
// turn a real negative number into a text string in the target accounting software - the
// single highest-stakes correctness failure this product exists to prevent. Only call this on
// text fields (Description, Date), never on the formatted Amount string.
const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;

export function csvSafeText(value) {
  const str = String(value);
  return FORMULA_TRIGGER_RE.test(str) ? `'${str}` : str;
}
