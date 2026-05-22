import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import config from '../../wxt.config';

describe('WXT source archive configuration', () => {
  it('excludes non-review artifacts from sources zip', () => {
    expect(config.zip?.excludeSources).toEqual(
      expect.arrayContaining(['orig-poc-src/**', 'tmp/**', 'tests/**'])
    );
  });

  it('declares a default locale only when locale message files exist', () => {
    const { manifest } = config;

    expect(manifest).toBeDefined();
    expect(typeof manifest).toBe('object');
    expect(manifest).not.toBeNull();
    expect('then' in (manifest as object)).toBe(false);
    expect((manifest as { default_locale?: string }).default_locale).toBe('en');
    expect(existsSync(new URL('../../public/_locales/en/messages.json', import.meta.url))).toBe(true);
  });
});
