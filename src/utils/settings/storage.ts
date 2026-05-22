import { getBrowser } from '../browser-api';
import { fetchExtensionJson } from '../extension-resource';
import {
  BUNDLED_CONFIG_RESOURCE,
  createSettingsDocument,
  defaultSettings,
  LEGACY_PAGE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  SETTINGS_VERSION,
  serializeSettingsForExport,
  type ExtensionSettings,
  type SettingsDocument,
  type SettingsInput
} from './defaults';

export interface LegacyStorageLike {
  getItem(key: string): string | null;
}

export function parseLegacySettingsJson(raw: string | null): SettingsInput | undefined {
  if (raw == null || raw.trim() === '') {
    return undefined;
  }

  try {
    return JSON.parse(raw) as SettingsInput;
  } catch (error) {
    console.warn('Failed to parse legacy settings JSON:', error);
    return undefined;
  }
}

export function readLegacySettingsFromPageStorage(
  storage: LegacyStorageLike | null | undefined
): SettingsInput | undefined {
  return parseLegacySettingsJson(storage?.getItem(LEGACY_PAGE_STORAGE_KEY) ?? null);
}

export async function loadBundledSettings(): Promise<ExtensionSettings> {
  try {
    const bundled = await fetchExtensionJson<SettingsInput>(BUNDLED_CONFIG_RESOURCE);
    return createSettingsDocument(bundled).settings;
  } catch (error) {
    console.warn('Failed to load bundled config.json, using schema defaults:', error);
    return defaultSettings;
  }
}

function normalizeStoredDocument(stored: SettingsDocument | undefined): SettingsDocument | undefined {
  if (stored == null) {
    return undefined;
  }

  return {
    version: stored.version ?? SETTINGS_VERSION,
    settings: createSettingsDocument(stored.settings).settings
  };
}

export async function initializeSettingsDocument(options?: {
  legacyStorage?: LegacyStorageLike | null;
}): Promise<SettingsDocument> {
  const browser = await getBrowser();
  const result = await browser.storage.local.get(SETTINGS_STORAGE_KEY);
  const existing = normalizeStoredDocument(result[SETTINGS_STORAGE_KEY] as SettingsDocument | undefined);

  if (existing != null) {
    return existing;
  }

  const bundledSettings = await loadBundledSettings();
  const legacySettings = readLegacySettingsFromPageStorage(options?.legacyStorage);
  const nextDocument = createSettingsDocument({
    ...bundledSettings,
    ...legacySettings
  });

  await browser.storage.local.set({
    [SETTINGS_STORAGE_KEY]: nextDocument
  });

  return nextDocument;
}

export async function getSettingsDocument(options?: {
  legacyStorage?: LegacyStorageLike | null;
}): Promise<SettingsDocument> {
  const browser = await getBrowser();
  const result = await browser.storage.local.get(SETTINGS_STORAGE_KEY);
  const stored = normalizeStoredDocument(result[SETTINGS_STORAGE_KEY] as SettingsDocument | undefined);

  if (stored != null) {
    return stored;
  }

  return initializeSettingsDocument(options);
}

export async function saveSettings(nextSettings: SettingsInput): Promise<SettingsDocument> {
  const browser = await getBrowser();
  const current = await getSettingsDocument();
  const nextDocument = createSettingsDocument({
    ...current.settings,
    ...nextSettings
  });

  await browser.storage.local.set({
    [SETTINGS_STORAGE_KEY]: nextDocument
  });

  return nextDocument;
}

export async function replaceSettings(nextSettings: SettingsInput): Promise<SettingsDocument> {
  const browser = await getBrowser();
  const nextDocument = createSettingsDocument(nextSettings);

  await browser.storage.local.set({
    [SETTINGS_STORAGE_KEY]: nextDocument
  });

  return nextDocument;
}

export async function resetSettingsToBundledDefaults(): Promise<SettingsDocument> {
  const bundledSettings = await loadBundledSettings();
  return replaceSettings(bundledSettings);
}

export async function exportSettingsJson(): Promise<string> {
  const { settings } = await getSettingsDocument();
  return serializeSettingsForExport(settings);
}

export async function seedDefaultSettings(): Promise<void> {
  await initializeSettingsDocument();
}
