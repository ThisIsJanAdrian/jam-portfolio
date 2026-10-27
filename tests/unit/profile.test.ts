import { describe, expect, it } from 'vitest';
import {
  credentials,
  disciplines,
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
  it.each(['2026-00', '2026-13', '2026-1', '26-06', '2026/06', '', 'present'])(
    'rejects %j',
    (value) => {
      expect(() => formatMonth(value)).toThrow(/Invalid month/);
    },
  );

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

  it('shows just the date when there is no end (a single milestone)', () => {
    expect(formatPeriod('2026-01')).toBe('January 2026');
  });

  // Regressions: a doubled dash ("June 2026 – – Present") and a trailing space ("January 2026 ").
  it.each([
    formatPeriod('2026-06', null),
    formatPeriod('2026-01'),
    formatPeriod('2025-07', '2025-08'),
  ])('has no doubled dashes or stray spaces: %j', (text) => {
    expect(text).not.toMatch(/– –/);
    expect(text).toBe(text.trim());
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

  it('has no duplicate skills', () => {
    const lower = skills.map((s) => s.name.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it('files every skill under at least one known discipline, once each', () => {
    const known = disciplines.map((d) => d.id);
    for (const skill of skills) {
      expect(skill.disciplines.length, skill.name).toBeGreaterThan(0);
      expect(new Set(skill.disciplines).size, skill.name).toBe(skill.disciplines.length);
      for (const d of skill.disciplines) expect(known, skill.name).toContain(d);
    }
  });

  it('has at least one skill for every discipline', () => {
    for (const d of disciplines) {
      expect(
        skills.some((s) => s.disciplines.includes(d.id)),
        d.label,
      ).toBe(true);
    }
  });
});
