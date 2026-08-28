import { describe, it, expect } from 'vitest';
import { normalizeDateParts, toOfxDate, toOfxDateTime, toUsSlashDate } from './dateFormat.js';

const REFERENCE = new Date(2026, 5, 15); // June 15, 2026 - used whenever a date has no year

describe('normalizeDateParts', () => {
  it('uses the explicit year when the date string carries one', () => {
    expect(normalizeDateParts('01/16/2026', REFERENCE)).toEqual({ year: 2026, month: 1, day: 16 });
  });

  it('expands a 2-digit year into the 2000s', () => {
    expect(normalizeDateParts('01/16/26', REFERENCE)).toEqual({ year: 2026, month: 1, day: 16 });
  });

  it('falls back to the reference date\'s year when none is present', () => {
    expect(normalizeDateParts('01/16', REFERENCE)).toEqual({ year: 2026, month: 1, day: 16 });
  });

  it('returns null for a string with no recognizable date shape', () => {
    expect(normalizeDateParts('not a date', REFERENCE)).toBeNull();
  });
});

describe('toOfxDate', () => {
  it('formats as YYYYMMDD', () => {
    expect(toOfxDate('01/16/2026', REFERENCE)).toBe('20260116');
  });

  it('zero-pads single-digit month and day', () => {
    expect(toOfxDate('1/5/2026', REFERENCE)).toBe('20260105');
  });

  it('returns null for an unparseable date', () => {
    expect(toOfxDate('garbage', REFERENCE)).toBeNull();
  });
});

describe('toOfxDateTime', () => {
  it('formats as YYYYMMDDHHMMSS', () => {
    const d = new Date(2026, 0, 5, 9, 3, 7);
    expect(toOfxDateTime(d)).toBe('20260105090307');
  });
});

describe('toUsSlashDate', () => {
  it('formats as MM/DD/YYYY', () => {
    expect(toUsSlashDate('1/5/2026', REFERENCE)).toBe('01/05/2026');
  });

  it('defaults the year from the reference date when absent', () => {
    expect(toUsSlashDate('1/5', REFERENCE)).toBe('01/05/2026');
  });
});
