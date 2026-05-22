import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

type LocaleCatalog = Record<string, { message: string }>;

function readCatalog(locale: string): LocaleCatalog {
  return JSON.parse(
    readFileSync(new URL(`../../public/_locales/${locale}/messages.json`, import.meta.url), 'utf8')
  ) as LocaleCatalog;
}

describe('locale catalogs', () => {
  it('keep the same message keys across en, ru, and uk', () => {
    const en = readCatalog('en');
    const ru = readCatalog('ru');
    const uk = readCatalog('uk');

    const enKeys = Object.keys(en).sort();

    expect(Object.keys(ru).sort()).toEqual(enKeys);
    expect(Object.keys(uk).sort()).toEqual(enKeys);
  });

  it('provide non-empty message values for all locales', () => {
    const catalogs = {
      en: readCatalog('en'),
      ru: readCatalog('ru'),
      uk: readCatalog('uk')
    };

    for (const [locale, catalog] of Object.entries(catalogs)) {
      for (const [key, value] of Object.entries(catalog)) {
        expect(value.message.trim(), `${locale}:${key}`).not.toBe('');
      }
    }
  });
});
