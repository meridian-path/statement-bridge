import { describe, it, expect } from 'vitest';
import { looksLikeMatch, parse } from './chase.js';

// All figures and names below are fabricated for this test only, synthesized from Chase's
// own published checking-statement layout convention (section headers, unsigned amounts
// grouped by section) - not real customer statement data.
const SAMPLE_STATEMENT = `
JPMorgan Chase Bank, N.A.
CHASE TOTAL CHECKING
Statement Period: 01/01/2026 - 01/31/2026

DEPOSITS AND ADDITIONS
DATE DESCRIPTION AMOUNT
01/03 Zelle payment from JANE SMITH 1,200.00
01/15 Payroll Deposit ACME CORP 2,450.00
Total Deposits and Additions $3,650.00

ELECTRONIC WITHDRAWALS
DATE DESCRIPTION AMOUNT
01/05 Recurring Card Purchase NETFLIX.COM 15.99
01/20 Online Transfer to Savings 500.00
Total Electronic Withdrawals $515.99

ATM & DEBIT CARD WITHDRAWALS
DATE DESCRIPTION AMOUNT
01/10 Debit Card Purchase TARGET STORE #1234 84.23
Total ATM & Debit Card Withdrawals $84.23

FEES
DATE DESCRIPTION AMOUNT
01/31 Monthly Service Fee 12.00
Total Fees $12.00
`;

describe('chase parser', () => {
  it('recognizes a statement carrying both the Chase signature and a known section header', () => {
    expect(looksLikeMatch(SAMPLE_STATEMENT)).toBe(true);
  });

  it('does not match plain text that merely mentions Chase with no section headers', () => {
    expect(looksLikeMatch('01/05 CHASE QUICKPAY TRANSFER -50.00')).toBe(false);
  });

  it('does not match a statement with no Chase signature at all', () => {
    expect(looksLikeMatch('Deposits and other credits\n01/04 Direct Deposit 100.00')).toBe(false);
  });

  it('infers sign from the section a transaction is printed under, not from the amount text', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);

    expect(transactions).toEqual([
      { date: '01/03', description: 'Zelle payment from JANE SMITH', amount: 1200 },
      { date: '01/15', description: 'Payroll Deposit ACME CORP', amount: 2450 },
      { date: '01/05', description: 'Recurring Card Purchase NETFLIX.COM', amount: -15.99 },
      { date: '01/20', description: 'Online Transfer to Savings', amount: -500 },
      { date: '01/10', description: 'Debit Card Purchase TARGET STORE #1234', amount: -84.23 },
      { date: '01/31', description: 'Monthly Service Fee', amount: -12 },
    ]);
  });

  it('ignores section subtotal and column-header lines rather than misreading them as transactions', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);
    const descriptions = transactions.map((t) => t.description);
    expect(descriptions.some((d) => d.includes('Total'))).toBe(false);
    expect(transactions).toHaveLength(6);
  });
});
