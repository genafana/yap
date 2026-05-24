import { describe, expect, it } from 'vitest';

import { matchesTagFilter } from '../../src/features/forum/tag-filter';

describe('matchesTagFilter', () => {
  it('matches all tags when filter is empty', () => {
    expect(matchesTagFilter('Игнор', '')).toBe(true);
    expect(matchesTagFilter('Игнор', '   ')).toBe(true);
  });

  it('matches case-insensitively', () => {
    expect(matchesTagFilter('Massimo35', 'massi')).toBe(true);
    expect(matchesTagFilter('Massimo35', 'MASSI')).toBe(true);
  });

  it('matches by substring in the middle of the tag name', () => {
    expect(matchesTagFilter('VeryLongTagName', 'LongTag')).toBe(true);
    expect(matchesTagFilter('VeryLongTagName', 'yLong')).toBe(true);
  });

  it('returns false when there is no match', () => {
    expect(matchesTagFilter('VeryLongTagName', 'xyz')).toBe(false);
  });
});
