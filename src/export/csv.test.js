import { describe, it, expect } from 'vitest';
import { transactionsToCsv } from './csv.js';

describe('transactionsToCsv', () => {
  it('writes a header row plus one row per transaction, amount fixed to 2 decimals', () => {
    const csv = transactionsToCsv([{ date: '01/15', description: 'AMAZON.COM PURCHASE', amount: -42.99 }]);
    expect(csv).toBe('Date,Description,Amount\r\n01/15,AMAZON.COM PURCHASE,-42.99\r\n');
  });

  it('quotes a description containing a comma', () => {
    const csv = transactionsToCsv([{ date: '02/01', description: 'ACME, INC', amount: 10 }]);
    expect(csv).toContain('"ACME, INC"');
  });

  it('doubles an embedded quote inside a quoted field', () => {
    const csv = transactionsToCsv([{ date: '02/02', description: 'CHECK "1001"', amount: 5 }]);
    expect(csv).toContain('"CHECK ""1001"""');
  });

  it('produces a header-only CSV for zero transactions, not an empty string', () => {
    expect(transactionsToCsv([])).toBe('Date,Description,Amount\r\n');
  });
});
