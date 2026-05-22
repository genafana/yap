import { describe, expect, it } from 'vitest';

import { resolveSelectOptionLabel } from '../../src/entrypoints/options/select-labels';

describe('resolveSelectOptionLabel', () => {
  it('uses localized labels when they are present', () => {
    expect(resolveSelectOptionLabel('Two columns', '2')).toBe('Two columns');
  });

  it('falls back to the raw option value when localization is empty', () => {
    expect(resolveSelectOptionLabel('', '2')).toBe('2');
    expect(resolveSelectOptionLabel(undefined, 3)).toBe('3');
  });
});
