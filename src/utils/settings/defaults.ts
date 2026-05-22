export interface ExtensionSettings {
  enabled: boolean;
  debug: boolean;
  applyContextMenu: boolean;
  showFloatingBadge: boolean;
}

export interface SettingsDocument {
  version: number;
  settings: ExtensionSettings;
}

export const SETTINGS_VERSION = 1;
export const SETTINGS_STORAGE_KEY = 'yap-lamp-settings';

export const defaultSettings: ExtensionSettings = {
  enabled: true,
  debug: false,
  applyContextMenu: true,
  showFloatingBadge: false
};

export function normalizeSettings(
  settings: Partial<ExtensionSettings> | undefined
): ExtensionSettings {
  return {
    ...defaultSettings,
    ...settings
  };
}

export function createDefaultSettingsDocument(): SettingsDocument {
  return {
    version: SETTINGS_VERSION,
    settings: defaultSettings
  };
}

