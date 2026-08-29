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

  it('guards against CSV/formula injection: a description starting with =, +, or @ is neutralized with a leading quote', () => {
    const csv = transactionsToCsv([
      { date: '01/15', description: '=1+1', amount: 5 },
      { date: '01/16', description: '+cmd|/c calc', amount: 5 },
      { date: '01/17', description: '@SUM(A1:A9)', amount: 5 },
    ]);
    expect(csv).toContain("01/15,'=1+1,5.00");
    expect(csv).toContain("01/16,'+cmd|/c calc,5.00");
    expect(csv).toContain("01/17,'@SUM(A1:A9),5.00");
  });

  it('never neutralizes the Amount column - a real negative amount must stay a plain, sum-able number, never text', () => {
    const csv = transactionsToCsv([{ date: '01/18', description: 'Debit Card Purchase', amount: -42.99 }]);
    // The amount must appear as a bare "-42.99", never prefixed with a quote - that would turn
    // a real negative number into a text string in the accounting software importing this file.
    expect(csv).toContain('Debit Card Purchase,-42.99');
    expect(csv).not.toContain("'-42.99");
  });

  it('does not double-guard a description that merely contains a dash mid-string, only a leading one', () => {
    const csv = transactionsToCsv([{ date: '01/19', description: 'Refund - overpaid', amount: 10 }]);
    expect(csv).toContain('01/19,Refund - overpaid,10.00');
  });
});
