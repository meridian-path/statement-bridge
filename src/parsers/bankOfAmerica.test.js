import { describe, it, expect } from 'vitest';
import { looksLikeMatch, parse } from './bankOfAmerica.js';

// All figures and names below are fabricated for this test only, synthesized from Bank of
// America's own published checking-statement layout convention - not real customer data.
const SAMPLE_STATEMENT = `
Bank of America, N.A.
Adv Plus Banking
Statement Period 01/01/2026 to 01/31/2026

Deposits and other credits
Date Description Amount
01/04 Direct Deposit - EMPLOYER INC 1,800.00
01/18 Mobile Deposit 300.00

Withdrawals and other debits
Date Description Amount
01/06 Debit Card Purchase - WHOLE FOODS 62.14
01/22 Online Banking Transfer to SAV 200.00

Checks
Date Check Number Amount
01/09 1001 150.00

Service fees
Date Description Amount
01/31 Monthly Maintenance Fee 25.00
`;

describe('bank of america parser', () => {
  it('recognizes a statement carrying both the Bank of America signature and a known section header', () => {
    expect(looksLikeMatch(SAMPLE_STATEMENT)).toBe(true);
  });

  it('does not match a statement with no Bank of America signature', () => {
    expect(looksLikeMatch('Deposits and other credits\n01/04 Direct Deposit 100.00')).toBe(false);
  });

  it('infers sign from the section a transaction is printed under, not from the amount text', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);

    expect(transactions).toEqual([
      { date: '01/04', description: 'Direct Deposit - EMPLOYER INC', amount: 1800 },
      { date: '01/18', description: 'Mobile Deposit', amount: 300 },
      { date: '01/06', description: 'Debit Card Purchase - WHOLE FOODS', amount: -62.14 },
      { date: '01/22', description: 'Online Banking Transfer to SAV', amount: -200 },
      { date: '01/09', description: '1001', amount: -150 },
      { date: '01/31', description: 'Monthly Maintenance Fee', amount: -25 },
    ]);
  });
});
