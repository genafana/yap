import { getBrowser } from './browser-api';

// ── Storage keys ─────────────────────────────────────────────────────────────

export const TAGS_STORAGE_KEY = 'yap-lamp-tags';
export const USERS_STORAGE_KEY = 'yap-lamp-users';

// ── Core domain types ─────────────────────────────────────────────────────────

export interface TagDefinition {
  bgColor?: string;
  /** When true, comments by users who carry this tag are hidden entirely. */
  ignore?: boolean;
}

/** Tags (formerly "groups") map: tagName → definition */
export type TagsMap = Record<string, TagDefinition>;

export interface UserDefinition {
  tags: string[];
}

/** Users map: username → { tags } */
export type UsersMap = Record<string, UserDefinition>;

// ── Rendering lookup ──────────────────────────────────────────────────────────

export interface UserTagData {
  name: string;
  bgColor?: string;
  ignore?: boolean;
}

/** username → resolved tag objects (for rendering in the forum) */
export type UserTagsLookup = Record<string, UserTagData[]>;

// ── Legacy import types ───────────────────────────────────────────────────────

export interface LegacyTagEntry {
  users?: string | string[];
  ignore?: boolean;
  color?: string;
}

export type LegacyTagsJson = Record<string, LegacyTagEntry>;

// ── Native export/import format ───────────────────────────────────────────────

export interface NativeExportFormat {
  version: 1;
  tags: TagsMap;
  users: UsersMap;
}

// ── Storage helpers ───────────────────────────────────────────────────────────

export async function loadTags(): Promise<TagsMap> {
  const browser = await getBrowser();
  const result = await browser.storage.local.get(TAGS_STORAGE_KEY);
  return (result[TAGS_STORAGE_KEY] as TagsMap | undefined) ?? {};
}

export async function loadUsers(): Promise<UsersMap> {
  const browser = await getBrowser();
  const result = await browser.storage.local.get(USERS_STORAGE_KEY);
  return (result[USERS_STORAGE_KEY] as UsersMap | undefined) ?? {};
}

export async function saveTags(tags: TagsMap): Promise<void> {
  const browser = await getBrowser();
  await browser.storage.local.set({ [TAGS_STORAGE_KEY]: tags });
}

export async function saveUsers(users: UsersMap): Promise<void> {
  const browser = await getBrowser();
  await browser.storage.local.set({ [USERS_STORAGE_KEY]: users });
}

// ── Lookup builder ────────────────────────────────────────────────────────────

export function buildUserTagsLookup(tags: TagsMap, users: UsersMap): UserTagsLookup {
  const lookup: UserTagsLookup = {};

  for (const [username, userDef] of Object.entries(users)) {
    const resolved: UserTagData[] = [];

    for (const tagName of userDef.tags) {
      const tagDef = tags[tagName];
      const entry: UserTagData = { name: tagName };
      if (tagDef?.bgColor != null) {
        entry.bgColor = tagDef.bgColor;
      }
      if (tagDef?.ignore === true) {
        entry.ignore = true;
      }
      resolved.push(entry);
    }

    if (resolved.length > 0) {
      lookup[username] = resolved;
    }
  }

  return lookup;
}

export async function loadUserTagsLookup(): Promise<UserTagsLookup> {
  try {
    const [tags, users] = await Promise.all([loadTags(), loadUsers()]);
    return buildUserTagsLookup(tags, users);
  } catch (error) {
    console.warn('Failed to load user tags lookup, falling back to empty:', error);
    return {};
  }
}

// ── Legacy format conversion ──────────────────────────────────────────────────

export function normalizeLegacyUsers(users: LegacyTagEntry['users']): string[] {
  if (Array.isArray(users)) {
    return users.map((v) => v.trim()).filter(Boolean);
  }
  if (typeof users === 'string') {
    return users.split(/\s+/).map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

export function convertLegacyFormat(raw: LegacyTagsJson): { tags: TagsMap; users: UsersMap } {
  const tags: TagsMap = {};
  const tempUsers: Record<string, Set<string>> = {};

  for (const [tagName, info] of Object.entries(raw)) {
    const tagDef: TagDefinition = {};
    if (info.color != null && info.color !== '') {
      tagDef.bgColor = info.color;
    }
    if (info.ignore === true) {
      tagDef.ignore = true;
    }
    tags[tagName] = tagDef;

    for (const username of normalizeLegacyUsers(info.users)) {
      if (tempUsers[username] == null) {
        tempUsers[username] = new Set();
      }
      tempUsers[username].add(tagName);
    }
  }

  const users: UsersMap = {};
  for (const [username, tagSet] of Object.entries(tempUsers)) {
    users[username] = { tags: Array.from(tagSet) };
  }

  return { tags, users };
}

// ── Import format detection ───────────────────────────────────────────────────

export function detectImportFormat(json: unknown): 'legacy' | 'native' | 'unknown' {
  if (typeof json !== 'object' || json === null) {
    return 'unknown';
  }

  if ('version' in json && (json as Record<string, unknown>)['version'] === 1) {
    return 'native';
  }

  // Legacy: top-level values are objects with a `users` or `color` or `ignore` key
  const entries = Object.values(json as Record<string, unknown>);
  if (entries.length === 0) {
    return 'legacy';
  }
  if (entries.every((v) => typeof v === 'object' && v !== null)) {
    return 'legacy';
  }

  return 'unknown';
}

export function parseImport(json: unknown): { tags: TagsMap; users: UsersMap } | null {
  const format = detectImportFormat(json);

  if (format === 'native') {
    const native = json as NativeExportFormat;
    return {
      tags: (native.tags as TagsMap | undefined) ?? {},
      users: (native.users as UsersMap | undefined) ?? {}
    };
  }

  if (format === 'legacy') {
    return convertLegacyFormat(json as LegacyTagsJson);
  }

  return null;
}

// ── Export ────────────────────────────────────────────────────────────────────

export function buildNativeExport(tags: TagsMap, users: UsersMap): NativeExportFormat {
  return { version: 1, tags, users };
}

export async function exportTagsJson(): Promise<string> {
  const [tags, users] = await Promise.all([loadTags(), loadUsers()]);
  return JSON.stringify(buildNativeExport(tags, users), null, 2);
}

// ── Import with merge/replace ─────────────────────────────────────────────────

export async function importTagsData(
  incoming: { tags: TagsMap; users: UsersMap },
  mode: 'replace' | 'merge'
): Promise<void> {
  if (mode === 'replace') {
    await saveTags(incoming.tags);
    await saveUsers(incoming.users);
    return;
  }

  // merge: union of tags per user; imported tag definitions override existing
  const [existingTags, existingUsers] = await Promise.all([loadTags(), loadUsers()]);

  const mergedTags: TagsMap = { ...existingTags, ...incoming.tags };

  const mergedUsers: UsersMap = { ...existingUsers };
  for (const [username, userDef] of Object.entries(incoming.users)) {
    const existing = mergedUsers[username];
    if (existing == null) {
      mergedUsers[username] = userDef;
    } else {
      const combined = Array.from(new Set([...existing.tags, ...userDef.tags]));
      mergedUsers[username] = { tags: combined };
    }
  }

  await saveTags(mergedTags);
  await saveUsers(mergedUsers);
}
