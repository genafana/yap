import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createSettingsDocument,
  defaultSettings,
  LEGACY_PAGE_STORAGE_KEY,
  normalizeSettings,
  serializeSettingsForExport,
  SETTINGS_VERSION
} from '../../src/utils/settings/defaults';
import {
  parseLegacySettingsJson,
  readLegacySettingsFromPageStorage
} from '../../src/utils/settings/storage';

describe('settings schema', () => {
  it('creates a versioned settings document', () => {
    expect(createSettingsDocument()).toEqual({
      version: SETTINGS_VERSION,
      settings: defaultSettings
    });
  });

  it('normalizes settings and keeps compatibility rules', () => {
    expect(
      normalizeSettings({
        user_pic_size: '80',
        primary_tag_full_user_bg: true,
        apply_context_menu: false,
        privat_mail_type: 'avatar_rkm'
      })
    ).toMatchObject({
      ...defaultSettings,
      user_pic_size: 80,
      primary_tag_full_user_bg: true,
      apply_context_menu: false,
      privat_mail_type: 'msg_menu'
    });
  });

  it('serializes settings export in config-compatible shape', () => {
    const json = serializeSettingsForExport(defaultSettings);
    expect(JSON.parse(json)).toEqual(defaultSettings);
  });
});

describe('legacy settings migration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('parses legacy JSON payloads', () => {
    expect(parseLegacySettingsJson('{"user_pic_size":90}')).toEqual({
      user_pic_size: 90
    });
  });

  it('returns undefined for malformed legacy JSON', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parseLegacySettingsJson('{oops}')).toBeUndefined();
  });

  it('reads the legacy page storage key', () => {
    const storage = {
      getItem(key: string) {
        if (key === LEGACY_PAGE_STORAGE_KEY) {
          return '{"msg_menu_type":"text"}';
        }

        return null;
      }
    };

    expect(readLegacySettingsFromPageStorage(storage)).toEqual({
      msg_menu_type: 'text'
    });
  });
});
