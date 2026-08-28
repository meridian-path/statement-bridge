import { describe, it, expect } from 'vitest';
import { parseStatement } from './index.js';

const CHASE_SAMPLE = `
JPMorgan Chase Bank, N.A.
DEPOSITS AND ADDITIONS
DATE DESCRIPTION AMOUNT
01/03 Zelle payment from JANE SMITH 1,200.00
`;

const BOA_SAMPLE = `
Bank of America, N.A.
Deposits and other credits
Date Description Amount
01/04 Direct Deposit - EMPLOYER INC 1,800.00
`;

const WELLS_FARGO_SAMPLE = `
Wells Fargo Bank, N.A.
Transaction History
Date Description Amount Ending Daily Balance
01/06 Purchase authorized on 01/05 TARGET 55.12 1,794.88
`;

const UNRECOGNIZED_BANK_SAMPLE = '01/15 AMAZON.COM PURCHASE -42.99';

describe('parseStatement registry', () => {
  it('routes a Chase-signature statement to the Chase parser', () => {
    const result = parseStatement(CHASE_SAMPLE);
    expect(result.matchedBank).toBe('Chase');
    expect(result.transactions).toEqual([
      { date: '01/03', description: 'Zelle payment from JANE SMITH', amount: 1200 },
    ]);
  });

  it('routes a Bank of America-signature statement to the Bank of America parser', () => {
    const result = parseStatement(BOA_SAMPLE);
    expect(result.matchedBank).toBe('Bank of America');
    expect(result.transactions).toEqual([
      { date: '01/04', description: 'Direct Deposit - EMPLOYER INC', amount: 1800 },
    ]);
  });

  it('routes a Wells Fargo-signature statement to the Wells Fargo parser', () => {
    const result = parseStatement(WELLS_FARGO_SAMPLE);
    expect(result.matchedBank).toBe('Wells Fargo');
    expect(result.transactions).toEqual([
      { date: '01/06', description: 'Purchase authorized on 01/05 TARGET', amount: -55.12 },
    ]);
  });

  it('falls back to the generic parser for a statement matching no known bank signature', () => {
    const result = parseStatement(UNRECOGNIZED_BANK_SAMPLE);
    expect(result.matchedBank).toBeNull();
    expect(result.transactions).toEqual([
      { date: '01/15', description: 'AMAZON.COM PURCHASE', amount: -42.99 },
    ]);
  });

  it('falls back to generic when a bank signature is present but no section header matches', () => {
    const result = parseStatement('Chase Bank\n01/15 SOME PURCHASE -42.99');
    expect(result.matchedBank).toBeNull();
  });
});
