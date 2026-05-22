import { getBrowser } from '../browser-api';
import {
  createDefaultSettingsDocument,
  normalizeSettings,
  SETTINGS_STORAGE_KEY,
  SETTINGS_VERSION,
  type ExtensionSettings,
  type SettingsDocument
} from './defaults';

export async function getSettingsDocument(): Promise<SettingsDocument> {
  const browser = await getBrowser();
  const result = await browser.storage.local.get(SETTINGS_STORAGE_KEY);
  const stored = result[SETTINGS_STORAGE_KEY] as SettingsDocument | undefined;

  if (stored == null) {
    return createDefaultSettingsDocument();
  }

  return {
    version: stored.version ?? SETTINGS_VERSION,
    settings: normalizeSettings(stored.settings)
  };
}

export async function saveSettings(
  nextSettings: Partial<ExtensionSettings>
): Promise<SettingsDocument> {
  const browser = await getBrowser();
  const current = await getSettingsDocument();
  const nextDocument: SettingsDocument = {
    version: SETTINGS_VERSION,
    settings: normalizeSettings({
      ...current.settings,
      ...nextSettings
    })
  };

  await browser.storage.local.set({
    [SETTINGS_STORAGE_KEY]: nextDocument
  });

  return nextDocument;
}

export async function seedDefaultSettings(): Promise<void> {
  const browser = await getBrowser();
  const result = await browser.storage.local.get(SETTINGS_STORAGE_KEY);

  if (result[SETTINGS_STORAGE_KEY] == null) {
    await browser.storage.local.set({
      [SETTINGS_STORAGE_KEY]: createDefaultSettingsDocument()
    });
  }
}

