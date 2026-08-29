import { describe, it, expect } from 'vitest';
import { looksLikeMatch, parse } from './ally.js';

// All figures and names below are fabricated for this test only, synthesized from a real
// fabricated-template Ally Bank "Combined Customer Statement" sample's own layout - including
// the "- $" (space between the minus sign and the dollar sign) spacing that pdf.js's own
// positional text reconstruction actually produces for a Debits value, confirmed via a real
// hands-on browser check against that PDF - not "-$" adjacency, which was this parser's
// original (wrong) assumption before that check caught it. Beginning/Ending Balance summary
// rows carry a leading date in the real layout too, unlike the section-header family.
const SAMPLE_STATEMENT = `
Ally Bank
Combined Customer Statement
Money Market Savings
Activity
Date Description Credits Debits Balance
01/06/2023 Beginning Balance $1,000.00
01/06/2023 ATM Withdrawal $0.00 - $503.00 $497.00
BANCO POPULAR AGUADILLA, PR
Transaction Fee: $ 3.00
01/09/2023 Direct Deposit $1,500.00 - $0.00 $1,997.00
PAYPAL TRANSFER
01/10/2023 Check Card Purchase $0.00 - $29.23 $1,9 67 . 77
AMERICAN GASOLINE AGUA AGUADILLA, PR
01/14/2023
Check Card Purchase $0.00 - $16.00 $1,951.77
PUMA MEGA STA AGUADILLA, PR
02/05/2023 ATM Fee Reimbursement $10.00 - $0.00 $2,007.00
02/05/2023 Ending Balance $2,007.00
`;

describe('Ally parser', () => {
  it('recognizes a statement carrying the Ally Bank signature and the Activity/Credits/Debits column headers', () => {
    expect(looksLikeMatch(SAMPLE_STATEMENT)).toBe(true);
  });

  it('does not match a statement with no Ally Bank signature', () => {
    expect(
      looksLikeMatch('Activity\nDate Description Credits Debits Balance\n01/06/2023 Withdrawal $0.00 -$503.00 $497.00')
    ).toBe(false);
  });

  it('does not match an Ally-mentioning statement with no Activity/Credits/Debits columns', () => {
    expect(looksLikeMatch('Ally Bank\nSome other kind of document')).toBe(false);
  });

  it('picks whichever of Credits/Debits is non-zero as the signed amount, ignoring the running balance', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);

    expect(transactions).toEqual([
      { date: '01/06/2023', description: 'ATM Withdrawal', amount: -503 },
      { date: '01/09/2023', description: 'Direct Deposit', amount: 1500 },
      { date: '01/10/2023', description: 'Check Card Purchase', amount: -29.23 },
      { date: '01/14/2023', description: 'Check Card Purchase', amount: -16 },
      { date: '02/05/2023', description: 'ATM Fee Reimbursement', amount: 10 },
    ]);
  });

  it('still reads Credits/Debits when the trailing running-balance token is malformed (a real pdf.js quirk: a stray internal space, e.g. "$1,9 67 . 77")', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);

    const gasPurchase = transactions.find((t) => t.date === '01/10/2023');
    expect(gasPurchase).toEqual({ date: '01/10/2023', description: 'Check Card Purchase', amount: -29.23 });
  });

  it('recovers a transaction whose date landed on its own extracted line, separate from its description/amounts line', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);

    const pumaPurchase = transactions.find((t) => t.date === '01/14/2023');
    expect(pumaPurchase).toEqual({ date: '01/14/2023', description: 'Check Card Purchase', amount: -16 });
  });

  it('skips Beginning Balance and Ending Balance rows (dated, but only one trailing amount each)', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);

    expect(transactions.some((t) => t.description.includes('Beginning Balance'))).toBe(false);
    expect(transactions.some((t) => t.description.includes('Ending Balance'))).toBe(false);
  });

  it('does not stitch a wrapped merchant/fee sub-line onto the transaction description (known limitation)', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);

    const atmWithdrawal = transactions.find((t) => t.description === 'ATM Withdrawal');
    expect(atmWithdrawal).toBeDefined();
    expect(atmWithdrawal.amount).toBe(-503);
  });
});
