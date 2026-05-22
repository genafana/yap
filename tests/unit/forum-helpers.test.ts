import { describe, expect, it } from 'vitest';

import { calculateMenuPosition } from '../../src/features/forum/context-menu';
import {
  extractCitationAuthor,
  normalizeMessageContent,
  scaleDimensions,
  shouldHideFilteredTable
} from '../../src/features/forum/legacy-compat';

describe('forum helper logic', () => {
  it('scales avatar dimensions proportionally', () => {
    expect(scaleDimensions(70, 140, 70)).toEqual({ h: '70', w: '35' });
    expect(scaleDimensions(70, 70, 140)).toEqual({ h: '35', w: '70' });
  });

  it('normalizes repeated breaks around quote markers', () => {
    expect(normalizeMessageContent('a<br><br><br>b')).toBe('a<br><br>b');
  });

  it('extracts citation author names', () => {
    expect(extractCitationAuthor('(Mooniz @ 12:30)')).toBe('Mooniz');
    expect(extractCitationAuthor('no citation')).toBeNull();
  });

  it('calculates safe menu coordinates inside viewport', () => {
    expect(
      calculateMenuPosition({
        x: 790,
        y: 590,
        viewportW: 800,
        viewportH: 600,
        menuW: 220,
        menuH: 100
      })
    ).toEqual({ left: 565, top: 485 });
  });

  it('hides non-matching tables only when user filter is active', () => {
    expect(shouldHideFilteredTable('Alice', 'Bob')).toBe(true);
    expect(shouldHideFilteredTable('Alice', 'Alice')).toBe(false);
    expect(shouldHideFilteredTable(null, 'Alice')).toBe(false);
  });
});
