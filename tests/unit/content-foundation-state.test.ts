import { describe, expect, it } from 'vitest';

import {
  clearFilteredUserName,
  consumeSavedScrollPosition,
  getFilteredUserName,
  parseSavedScrollPosition,
  saveScrollPosition,
  shouldRestoreScrollPosition,
  type StorageLike
} from '../../src/features/content-foundation/page-state';

function createStorage(seed: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...seed };

  return {
    data,
    getItem(key: string) {
      return data[key] ?? null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    removeItem(key: string) {
      delete data[key];
    }
  };
}

describe('content foundation page state', () => {
  it('parses persisted scroll position values', () => {
    expect(parseSavedScrollPosition('123')).toBe(123);
    expect(parseSavedScrollPosition('')).toBeNull();
    expect(parseSavedScrollPosition('oops')).toBeNull();
  });

  it('saves and consumes reload-only scroll state', () => {
    const storage = createStorage();
    saveScrollPosition(storage, 456);

    expect(consumeSavedScrollPosition(storage, 'navigate')).toBeNull();
    expect(consumeSavedScrollPosition(storage, 'reload')).toBe(456);
    expect(storage.data.scrollPosition).toBeUndefined();
  });

  it('reads and clears filtered user state', () => {
    const storage = createStorage({ filtered_nik_name: 'tester' });
    expect(getFilteredUserName(storage)).toBe('tester');
    clearFilteredUserName(storage);
    expect(getFilteredUserName(storage)).toBeNull();
  });

  it('recognizes reload navigation type', () => {
    expect(shouldRestoreScrollPosition('reload')).toBe(true);
    expect(shouldRestoreScrollPosition('navigate')).toBe(false);
  });
});

