import { describe, it, expect } from 'vitest';
import { looksLikeMatch, parse } from './wellsFargo.js';

// All figures and names below are fabricated for this test only, synthesized from Wells
// Fargo's own published checking-statement layout convention (section headers, a running
// daily balance printed alongside each transaction's own amount) - not real customer data.
const SAMPLE_STATEMENT = `
Wells Fargo Bank, N.A.
Everyday Checking
Statement Period 01/01/2026 to 01/31/2026

Deposits and Other Credits
Date Description Amount
01/04 Payroll Deposit EMPLOYER INC 1,850.00

Transaction History
Date Description Amount Ending Daily Balance
01/06 Purchase authorized on 01/05 TARGET 55.12 1,794.88
01/15 Recurring Payment NETFLIX.COM 15.99 1,778.89
01/20 ATM Withdrawal 100.00 1,678.89
`;

describe('wells fargo parser', () => {
  it('recognizes a statement carrying both the Wells Fargo signature and a known section header', () => {
    expect(looksLikeMatch(SAMPLE_STATEMENT)).toBe(true);
  });

  it('does not match a statement with no Wells Fargo signature', () => {
    expect(looksLikeMatch('Transaction History\n01/06 Purchase 55.12 1,794.88')).toBe(false);
  });

  it('reads the transaction amount, not the trailing running balance, as the amount', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);

    expect(transactions).toEqual([
      { date: '01/04', description: 'Payroll Deposit EMPLOYER INC', amount: 1850 },
      { date: '01/06', description: 'Purchase authorized on 01/05 TARGET', amount: -55.12 },
      { date: '01/15', description: 'Recurring Payment NETFLIX.COM', amount: -15.99 },
      { date: '01/20', description: 'ATM Withdrawal', amount: -100 },
    ]);
  });
});
