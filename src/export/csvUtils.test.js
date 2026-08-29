import { describe, it, expect } from 'vitest';
import { csvEscapeField, rowsToCsv, csvSafeText } from './csvUtils.js';

describe('csvEscapeField', () => {
  it('leaves a plain field unquoted', () => {
    expect(csvEscapeField('plain')).toBe('plain');
  });

  it('quotes a field containing a comma', () => {
    expect(csvEscapeField('a, b')).toBe('"a, b"');
  });

  it('doubles an embedded quote inside a quoted field', () => {
    expect(csvEscapeField('say "hi"')).toBe('"say ""hi"""');
  });
});

describe('rowsToCsv', () => {
  it('joins rows with CRLF and terminates the file with a trailing CRLF', () => {
    expect(rowsToCsv([['a', 'b'], ['1', '2']])).toBe('a,b\r\n1,2\r\n');
  });
});

describe('csvSafeText', () => {
  it('leaves plain text untouched', () => {
    expect(csvSafeText('AMAZON.COM PURCHASE')).toBe('AMAZON.COM PURCHASE');
    expect(csvSafeText('01/15/2026')).toBe('01/15/2026');
  });

  it('prefixes a leading single quote onto each OWASP CSV-injection trigger character', () => {
    expect(csvSafeText('=1+1')).toBe("'=1+1");
    expect(csvSafeText('+cmd|/c calc')).toBe("'+cmd|/c calc");
    expect(csvSafeText('-2+3+cmd|/c calc')).toBe("'-2+3+cmd|/c calc");
    expect(csvSafeText('@SUM(A1:A9)')).toBe("'@SUM(A1:A9)");
    expect(csvSafeText('\tsneaky')).toBe("'\tsneaky");
  });

  it('only checks the leading character, not a trigger character appearing mid-string', () => {
    expect(csvSafeText('Refund - overpaid')).toBe('Refund - overpaid');
    expect(csvSafeText('Order #123 = paid')).toBe('Order #123 = paid');
  });

  it('composes correctly with csvEscapeField when the guarded text also needs comma/quote escaping', () => {
    expect(csvEscapeField(csvSafeText('=1+1, "gotcha"'))).toBe('"\'=1+1, ""gotcha"""');
  });
});
