import { describe, it, expect } from 'vitest';
import { csvEscapeField, rowsToCsv } from './csvUtils.js';

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
