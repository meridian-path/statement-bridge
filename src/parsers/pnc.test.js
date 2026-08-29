import { describe, it, expect } from 'vitest';
import { looksLikeMatch, parse } from './pnc.js';

// All figures and names below are fabricated for this test only, synthesized from PNC's own
// published checking-statement layout convention (section headers implying sign, no trailing
// balance column) - not real customer data.
const SAMPLE_STATEMENT = `
PNC Bank
Virtual Wallet
Statement Period 01/01/2026 to 01/31/2026

Deposits and Other Additions
Date Description Amount
01/02 Direct Deposit PAYROLL INC 1,975.50

Banking/Debit Card Withdrawals and Purchases
Date Description Amount
01/09 Debit Card Purchase GROCERY STORE 84.23

Other Deductions
Date Description Amount
01/22 Monthly Service Charge 10.00
`;

describe('PNC parser', () => {
  it('recognizes a statement carrying both the PNC signature and a known section header', () => {
    expect(looksLikeMatch(SAMPLE_STATEMENT)).toBe(true);
  });

  it('does not match a statement with no PNC signature', () => {
    expect(looksLikeMatch('Other Deductions\n01/22 Monthly Service Charge 10.00')).toBe(false);
  });

  it('applies the correct sign per section, with no trailing balance column', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);

    expect(transactions).toEqual([
      { date: '01/02', description: 'Direct Deposit PAYROLL INC', amount: 1975.5 },
      { date: '01/09', description: 'Debit Card Purchase GROCERY STORE', amount: -84.23 },
      { date: '01/22', description: 'Monthly Service Charge', amount: -10 },
    ]);
  });
});
