import { describe, it, expect } from 'vitest';
import { looksLikeMatch, parse } from './usBank.js';

// All figures and names below are fabricated for this test only, synthesized from U.S. Bank's
// own published checking-statement layout convention (section headers implying sign, no
// trailing balance column) - not real customer data.
const SAMPLE_STATEMENT = `
U.S. Bank
Gold Checking
Statement Period 01/01/2026 to 01/31/2026

Deposits/Credits
Date Description Amount
01/03 Direct Deposit EMPLOYER LLC 2,100.00

Card Withdrawals
Date Description Amount
01/07 Debit Card Purchase COFFEE SHOP 6.75

Other Withdrawals
Date Description Amount
01/12 Online Transfer to Savings 300.00

Checks Paid
Date Description Amount
01/18 Check 1042 125.00
`;

describe('U.S. Bank parser', () => {
  it('recognizes a statement carrying both the U.S. Bank signature and a known section header', () => {
    expect(looksLikeMatch(SAMPLE_STATEMENT)).toBe(true);
  });

  it('recognizes the signature with no periods ("US Bank")', () => {
    expect(
      looksLikeMatch('US Bank\nCard Withdrawals\n01/07 Purchase 6.75')
    ).toBe(true);
  });

  it('does not match a statement with no U.S. Bank signature', () => {
    expect(looksLikeMatch('Card Withdrawals\n01/07 Purchase 6.75')).toBe(false);
  });

  it('applies the correct sign per section, with no trailing balance column', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);

    expect(transactions).toEqual([
      { date: '01/03', description: 'Direct Deposit EMPLOYER LLC', amount: 2100 },
      { date: '01/07', description: 'Debit Card Purchase COFFEE SHOP', amount: -6.75 },
      { date: '01/12', description: 'Online Transfer to Savings', amount: -300 },
      { date: '01/18', description: 'Check 1042', amount: -125 },
    ]);
  });
});
