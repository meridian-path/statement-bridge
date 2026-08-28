import { describe, it, expect } from 'vitest';
import { parseGenericStatement } from './generic.js';

describe('parseGenericStatement', () => {
  it('parses a simple date/description/amount line', () => {
    const { transactions } = parseGenericStatement('01/15 AMAZON.COM PURCHASE -42.99');
    expect(transactions).toEqual([
      { date: '01/15', description: 'AMAZON.COM PURCHASE', amount: -42.99 },
    ]);
  });

  it('treats the last of two trailing amounts as a running balance, not the transaction amount', () => {
    const { transactions } = parseGenericStatement('01/16/2026 STARBUCKS #1234 -5.75 1,234.56');
    expect(transactions).toEqual([
      { date: '01/16/2026', description: 'STARBUCKS #1234', amount: -5.75 },
    ]);
  });

  it('treats a parenthesized amount as negative', () => {
    const { transactions } = parseGenericStatement('02/01 SERVICE FEE ($12.00)');
    expect(transactions[0].amount).toBe(-12);
  });

  it('strips a leading dollar sign and thousands separator', () => {
    const { transactions } = parseGenericStatement('03/01 PAYROLL DEPOSIT $1,500.00');
    expect(transactions[0].amount).toBe(1500);
  });

  it('skips lines with no leading date, e.g. headers and footers', () => {
    const { transactions } = parseGenericStatement(
      'Statement Period: Jan 1 - Jan 31\nDate Description Amount'
    );
    expect(transactions).toEqual([]);
  });

  it('reports a dated line with no parseable amount as skipped, not silently dropped', () => {
    const { transactions, skipped } = parseGenericStatement('04/01 ONLINE TRANSFER PENDING');
    expect(transactions).toEqual([]);
    expect(skipped).toEqual(['04/01 ONLINE TRANSFER PENDING']);
  });

  it('parses multiple transaction lines in order', () => {
    const { transactions } = parseGenericStatement(
      ['01/02 GROCERY STORE -63.10', '01/03 PAYROLL DEPOSIT 1200.00'].join('\n')
    );
    expect(transactions).toHaveLength(2);
    expect(transactions[0].description).toBe('GROCERY STORE');
    expect(transactions[1].amount).toBe(1200);
  });
});
