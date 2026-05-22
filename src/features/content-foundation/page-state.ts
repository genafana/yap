export const FILTERED_USER_STORAGE_KEY = 'filtered_nik_name';
export const SCROLL_POSITION_STORAGE_KEY = 'scrollPosition';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function getFilteredUserName(storage: StorageLike): string | null {
  return storage.getItem(FILTERED_USER_STORAGE_KEY);
}

export function clearFilteredUserName(storage: StorageLike): void {
  storage.removeItem(FILTERED_USER_STORAGE_KEY);
}

export function saveScrollPosition(storage: StorageLike, yOffset: number): void {
  storage.setItem(SCROLL_POSITION_STORAGE_KEY, String(yOffset));
}

export function parseSavedScrollPosition(rawValue: string | null): number | null {
  if (rawValue == null || rawValue.trim() === '') {
    return null;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function shouldRestoreScrollPosition(navigationType: string | undefined): boolean {
  return navigationType === 'reload';
}

export function consumeSavedScrollPosition(
  storage: StorageLike,
  navigationType: string | undefined
): number | null {
  const rawValue = storage.getItem(SCROLL_POSITION_STORAGE_KEY);
  const parsed = parseSavedScrollPosition(rawValue);

  if (parsed == null || !shouldRestoreScrollPosition(navigationType)) {
    return null;
  }

  storage.removeItem(SCROLL_POSITION_STORAGE_KEY);
  return parsed;
}

