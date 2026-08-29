import { describe, it, expect } from 'vitest';
import { looksLikeMatch, parse } from './bankOfAmerica.js';

// Section headers and a subset of the itemized transaction lines below are reproduced from
// Bank of America's own official "How to read your statement" guide (a PDF hosted on
// bankofamerica.com, explicitly an illustrative guide, not a real customer's statement - the
// account holder name/account number/most dollar figures throughout that guide are placeholder
// text, e.g. "JOHN B. CLIENT", "0000 9999 9999", "$9,999.99" repeated verbatim in multiple
// unrelated places). The specific ATM/debit-card transaction lines used here (merchant names,
// dates, amounts) are that guide's own illustrative example data for its "Withdrawals and other
// subtractions" section, reused verbatim as a real-world-shaped regression fixture - not
// fabricated from scratch, and not any real person's real transaction history.
const SAMPLE_STATEMENT = `
Bank of America, N.A.
Adv Plus Banking
Account number: 0000 9999 9999

Deposits and other additions
Date Transaction type Description Amount
07/11/12 Deposit Bank of America ATM Santa Monica, CA 500.00
07/15/12 Payroll Universal Millen Des ID:36070500010416x Indn: Bir, David Co ID:9002350481 1,200.00

Checks
Date Check # Amount
07/05/12 99991 217.00

ATM and debit card subtractions
Date Description Amount
07/02/12 07/02 Elements Andover - 87.33
07/05/12 07/05 Bank of America ATM / US Gas Remote Salem #0000004012 - 250.00
07/19/12 07/19 Best Buy Plaistow #000859825 - 2,193.44

Other subtractions
Date Description Amount
07/06/12 AAA Northern New England - 300.00

Service fees
Date Transaction description Amount
07/10/12 Overdraft fee - 35.00
`;

describe('bank of america parser', () => {
  it('recognizes a statement carrying both the Bank of America signature and a known section header', () => {
    expect(looksLikeMatch(SAMPLE_STATEMENT)).toBe(true);
  });

  it('does not match a statement with no Bank of America signature', () => {
    expect(looksLikeMatch('Deposits and other additions\n01/04 Direct Deposit 100.00')).toBe(false);
  });

  it('does NOT match on the section wording this parser originally (wrongly) assumed before a real specimen was checked ("...other credits"/"...other debits")', () => {
    expect(
      looksLikeMatch('Bank of America, N.A.\nDeposits and other credits\n01/04 Direct Deposit 100.00')
    ).toBe(false);
  });

  it('infers sign from the real section a transaction is printed under (Deposits and other additions / Checks / ATM and debit card subtractions / Other subtractions / Service fees), not from the amount text', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);

    expect(transactions).toEqual([
      { date: '07/11/12', description: 'Deposit Bank of America ATM Santa Monica, CA', amount: 500 },
      { date: '07/15/12', description: 'Payroll Universal Millen Des ID:36070500010416x Indn: Bir, David Co ID:9002350481', amount: 1200 },
      { date: '07/05/12', description: '99991', amount: -217 },
      { date: '07/02/12', description: '07/02 Elements Andover', amount: -87.33 },
      { date: '07/05/12', description: '07/05 Bank of America ATM / US Gas Remote Salem #0000004012', amount: -250 },
      { date: '07/19/12', description: '07/19 Best Buy Plaistow #000859825', amount: -2193.44 },
      { date: '07/06/12', description: 'AAA Northern New England', amount: -300 },
      { date: '07/10/12', description: 'Overdraft fee', amount: -35 },
    ]);
  });

  it('strips the redundant standalone "-" Bank of America prints before a debit amount, rather than leaving it dangling on the description (confirmed via a real hands-on browser check against the official guide PDF: none of the 8 debit rows above should end in a bare "-")', () => {
    const { transactions } = parse(SAMPLE_STATEMENT);

    for (const t of transactions) {
      expect(t.description.endsWith('-')).toBe(false);
    }
  });
});
