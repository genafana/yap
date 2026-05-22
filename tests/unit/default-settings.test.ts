import { describe, expect, it } from 'vitest';

import {
  createDefaultSettingsDocument,
  defaultSettings,
  normalizeSettings,
  SETTINGS_VERSION
} from '../../src/utils/settings/defaults';

describe('settings defaults', () => {
  it('creates a versioned settings document', () => {
    expect(createDefaultSettingsDocument()).toEqual({
      version: SETTINGS_VERSION,
      settings: defaultSettings
    });
  });

  it('merges partial settings with defaults', () => {
    expect(
      normalizeSettings({
        showFloatingBadge: true
      })
    ).toEqual({
      ...defaultSettings,
      showFloatingBadge: true
    });
  });
});
