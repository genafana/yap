import { describe, expect, it } from 'vitest';

import { normalizeAuthorSearchCellHtml } from '../../src/features/content-foundation/link-rewrite';

describe('author search link normalization', () => {
  it('replaces legacy icons with quote marks', () => {
    expect(normalizeAuthorSearchCellHtml('abc 🔗 def ↗ ghi')).toBe('abc « def « ghi');
  });
});
