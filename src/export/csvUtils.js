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
