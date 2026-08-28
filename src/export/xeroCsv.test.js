import { describe, it, expect } from 'vitest';
import { transactionsToXeroCsv } from './xeroCsv.js';

const REFERENCE = new Date(2026, 5, 15);

describe('transactionsToXeroCsv', () => {
  it('writes a Date/Description/Amount header with a US-format date and signed amount', () => {
    const csv = transactionsToXeroCsv(
      [{ date: '1/5/2026', description: 'AMAZON.COM PURCHASE', amount: -42.99 }],
      { referenceDate: REFERENCE }
    );
    expect(csv).toBe('Date,Description,Amount\r\n01/05/2026,AMAZON.COM PURCHASE,-42.99\r\n');
  });

  it('keeps a positive amount positive for money in', () => {
    const csv = transactionsToXeroCsv([{ date: '1/6/2026', description: 'Payroll Deposit', amount: 1500 }], {
      referenceDate: REFERENCE,
    });
    expect(csv).toContain('01/06/2026,Payroll Deposit,1500.00');
  });

  it('defaults a year-less date to the reference year', () => {
    const csv = transactionsToXeroCsv([{ date: '3/1', description: 'Fee', amount: -5 }], {
      referenceDate: REFERENCE,
    });
    expect(csv).toContain('03/01/2026,Fee,-5.00');
  });

  it('quotes a description containing a comma', () => {
    const csv = transactionsToXeroCsv([{ date: '1/1/2026', description: 'ACME, INC', amount: 10 }], {
      referenceDate: REFERENCE,
    });
    expect(csv).toContain('"ACME, INC"');
  });
});
