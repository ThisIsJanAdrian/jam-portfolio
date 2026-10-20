import { describe, expect, it } from 'vitest';
import {
  credentials,
  education,
  experience,
  formatMonth,
  formatPeriod,
  skills,
} from '../../src/data/profile';

describe('formatMonth()', () => {
  it('formats a YYYY-MM string', () => {
    expect(formatMonth('2026-06')).toBe('June 2026');
  });

  // Boundary values for the month part.
  it.each(['2026-00', '2026-13', '2026-1', '26-06', '2026/06', ''])('rejects %j', (value) => {
    expect(() => formatMonth(value)).toThrow(/Invalid month/);
  });

  it('is not shifted by the machine time zone (January 1st stays January)', () => {
    expect(formatMonth('2026-01')).toBe('January 2026');
    expect(formatMonth('2025-12')).toBe('December 2025');
  });
});

describe('formatPeriod()', () => {
  it('shows "Present" for an open-ended role', () => {
    expect(formatPeriod('2026-06', null)).toBe('June 2026 – Present');
  });

  it('shows both ends of a closed period', () => {
    expect(formatPeriod('2024-01', '2025-03')).toBe('January 2024 – March 2025');
  });
});

describe('profile data integrity', () => {
  it('has well-formed experience entries with valid, ordered dates', () => {
    expect(experience.length).toBeGreaterThan(0);
    for (const job of experience) {
      expect(job.role.trim()).not.toBe('');
      expect(job.company.trim()).not.toBe('');
      expect(() => formatMonth(job.start)).not.toThrow();
      if (job.end) expect(job.end >= job.start).toBe(true);
    }
  });

  it('has education with valid dates that end after they start', () => {
    for (const e of education) {
      expect(() => formatPeriod(e.start, e.end)).not.toThrow();
      expect(e.end >= e.start).toBe(true);
    }
  });

  it('has valid credential dates', () => {
    for (const c of credentials) expect(() => formatMonth(c.issued)).not.toThrow();
  });

  it('has no duplicate skills within a group', () => {
    for (const group of skills) {
      const lower = group.items.map((s) => s.toLowerCase());
      expect(new Set(lower).size).toBe(lower.length);
    }
  });
});
