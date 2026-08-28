import { describe, it, expect } from 'vitest';
import { transactionsToQbo, stableFitid } from './qbo.js';

const REFERENCE = new Date(2026, 5, 15, 12, 0, 0);

const TRANSACTIONS = [
  { date: '1/5/2026', description: 'AMAZON.COM PURCHASE', amount: -42.99 },
  { date: '1/6/2026', description: 'Payroll Deposit', amount: 1500 },
];

describe('transactionsToQbo', () => {
  it('produces a valid-shaped OFX document with one STMTTRN block per transaction', () => {
    const qbo = transactionsToQbo(TRANSACTIONS, { now: REFERENCE });
    expect(qbo).toContain('OFXHEADER:100');
    expect(qbo).toContain('<BANKTRANLIST>');
    expect((qbo.match(/<STMTTRN>/g) || []).length).toBe(2);
  });

  it('sets TRNTYPE to DEBIT for a negative amount and CREDIT for a positive one', () => {
    const qbo = transactionsToQbo(TRANSACTIONS, { now: REFERENCE });
    expect(qbo).toMatch(/<TRNTYPE>DEBIT\n<DTPOSTED>20260105\n<TRNAMT>-42.99/);
    expect(qbo).toMatch(/<TRNTYPE>CREDIT\n<DTPOSTED>20260106\n<TRNAMT>1500.00/);
  });

  it('produces IDENTICAL FITIDs across two separate exports of the same transaction list', () => {
    const first = transactionsToQbo(TRANSACTIONS, { now: REFERENCE });
    const second = transactionsToQbo(TRANSACTIONS, { now: REFERENCE });

    const extractFitids = (doc) => [...doc.matchAll(/<FITID>([0-9a-f]+)/g)].map((m) => m[1]);

    const firstFitids = extractFitids(first);
    const secondFitids = extractFitids(second);

    expect(firstFitids).toHaveLength(2);
    expect(firstFitids).toEqual(secondFitids);
  });

  it('gives two same-day, same-description, same-amount transactions DIFFERENT FITIDs so neither is dropped as a duplicate', () => {
    const duplicateDayTx = [
      { date: '1/5/2026', description: 'Vending Machine', amount: -1.5 },
      { date: '1/5/2026', description: 'Vending Machine', amount: -1.5 },
    ];
    const qbo = transactionsToQbo(duplicateDayTx, { now: REFERENCE });
    const fitids = [...qbo.matchAll(/<FITID>([0-9a-f]+)/g)].map((m) => m[1]);
    expect(fitids[0]).not.toBe(fitids[1]);
  });

  it('keeps that same pair of duplicate FITIDs stable across repeated exports too', () => {
    const duplicateDayTx = [
      { date: '1/5/2026', description: 'Vending Machine', amount: -1.5 },
      { date: '1/5/2026', description: 'Vending Machine', amount: -1.5 },
    ];
    const first = transactionsToQbo(duplicateDayTx, { now: REFERENCE });
    const second = transactionsToQbo(duplicateDayTx, { now: REFERENCE });
    expect(first).toBe(second);
  });
});

describe('stableFitid', () => {
  it('is a pure function of the transaction, its occurrence index, and the reference date', () => {
    const tx = { date: '1/5/2026', description: 'AMAZON.COM PURCHASE', amount: -42.99 };
    expect(stableFitid(tx, 0, REFERENCE)).toBe(stableFitid(tx, 0, REFERENCE));
  });

  it('differs when the occurrence index differs', () => {
    const tx = { date: '1/5/2026', description: 'Vending Machine', amount: -1.5 };
    expect(stableFitid(tx, 0, REFERENCE)).not.toBe(stableFitid(tx, 1, REFERENCE));
  });
});
