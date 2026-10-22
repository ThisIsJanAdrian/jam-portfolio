import { describe, expect, it } from 'vitest';
import { shortName } from '../../src/utils/names';

describe('shortName()', () => {
  it('joins the nickname and the last word of the full name', () => {
    expect(shortName({ name: 'Jan Adrian Manzanero', nickname: 'Jam' })).toBe('Jam Manzanero');
  });

  it('works for a two-word name', () => {
    expect(shortName({ name: 'Ana Reyes', nickname: 'Ana' })).toBe('Ana Reyes');
  });

  it('ignores extra spaces', () => {
    expect(shortName({ name: '  Jan   Adrian  Manzanero ', nickname: ' Jam ' })).toBe(
      'Jam Manzanero',
    );
  });

  // Boundary: a single-word name is its own last name.
  it('copes with a one-word name', () => {
    expect(shortName({ name: 'Madonna', nickname: 'Mado' })).toBe('Mado Madonna');
  });

  it('copes with an empty name', () => {
    expect(shortName({ name: '', nickname: 'Jam' })).toBe('Jam');
  });
});
