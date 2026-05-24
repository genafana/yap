import { getBrowser } from './browser-api';

// ── Storage keys ─────────────────────────────────────────────────────────────

export const TAGS_STORAGE_KEY = 'yap-lamp-tags';
export const USERS_STORAGE_KEY = 'yap-lamp-users';

/** The name of the protected system ignore tag. Always present; cannot be deleted, renamed, or merged away. */
export const IGNORE_TAG_NAME = 'Игнор';

// ── Core domain types ─────────────────────────────────────────────────────────

export interface TagDefinition {
  bgColor?: string;
  /** When true, comments by users who carry this tag are hidden entirely. */
  ignore?: boolean;
  /**
   * When true (or absent — treated as true for backward compatibility), the tag's bgColor
   * is applied as a background highlight to the user's avatar, nickname, and status info.
   */
  primary?: boolean;
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
  /** Mirrors TagDefinition.primary — true when the tag should highlight the user's UI areas. */
  primary?: boolean;
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

/**
 * Ensures the system ignore tag exists in storage with ignore: true and primary: true.
 * Idempotent — safe to call on every startup and before rendering.
 */
export async function ensureIgnoreTag(): Promise<void> {
  const tags = await loadTags();
  const existing = tags[IGNORE_TAG_NAME];
  if (existing?.ignore === true && existing?.primary === true) return;
  await saveTags({
    ...tags,
    [IGNORE_TAG_NAME]: { ...(existing ?? {}), ignore: true, primary: true }
  });
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
      // Absence of `primary` means the tag IS primary (backward compat).
      if (tagDef == null || tagDef.primary !== false) {
        entry.primary = true;
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
    const tagDef: TagDefinition = { primary: true };
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
  const [existingTags, existingUsers] = await Promise.all([loadTags(), loadUsers()]);

  // Snapshot users currently in the ignore list — preserved across all import modes.
  const existingIgnoreUsers = new Set(
    Object.entries(existingUsers)
      .filter(([, def]) => def.tags.includes(IGNORE_TAG_NAME))
      .map(([username]) => username)
  );

  let finalTags: TagsMap;
  let finalUsers: UsersMap;

  if (mode === 'replace') {
    finalTags = { ...incoming.tags };
    finalUsers = { ...incoming.users };
  } else {
    // merge: union of tags per user; imported tag definitions override existing
    finalTags = { ...existingTags, ...incoming.tags };
    finalUsers = { ...existingUsers };
    for (const [username, userDef] of Object.entries(incoming.users)) {
      const existing = finalUsers[username];
      if (existing == null) {
        finalUsers[username] = userDef;
      } else {
        const combined = Array.from(new Set([...existing.tags, ...userDef.tags]));
        finalUsers[username] = { tags: combined };
      }
    }
  }

  // Always enforce: ignore tag exists with ignore: true and primary: true.
  finalTags[IGNORE_TAG_NAME] = {
    ...(finalTags[IGNORE_TAG_NAME] ?? {}),
    ignore: true,
    primary: true
  };

  // Always preserve users who were in the ignore list before the import.
  for (const username of existingIgnoreUsers) {
    const userEntry = finalUsers[username];
    if (userEntry == null) {
      finalUsers[username] = { tags: [IGNORE_TAG_NAME] };
    } else if (!userEntry.tags.includes(IGNORE_TAG_NAME)) {
      finalUsers[username] = { ...userEntry, tags: [...userEntry.tags, IGNORE_TAG_NAME] };
    }
  }

  await saveTags(finalTags);
  await saveUsers(finalUsers);
}

// ── Delete tag ────────────────────────────────────────────────────────────────

/**
 * Removes a tag from TagsMap and strips it from every user's tag array.
 * Users whose tag list becomes empty are removed from UsersMap entirely.
 */
export async function deleteTag(tagName: string): Promise<void> {
  if (tagName === IGNORE_TAG_NAME) return;
  const [tags, users] = await Promise.all([loadTags(), loadUsers()]);

  const newTags = Object.fromEntries(
    Object.entries(tags).filter(([k]) => k !== tagName)
  );

  const newUsers: UsersMap = {};
  for (const [username, userDef] of Object.entries(users)) {
    const filtered = userDef.tags.filter((t) => t !== tagName);
    if (filtered.length > 0) {
      newUsers[username] = { ...userDef, tags: filtered };
    }
  }

  await Promise.all([saveTags(newTags), saveUsers(newUsers)]);
}

// ── Rename tag ────────────────────────────────────────────────────────────────

/**
 * Renames a tag in TagsMap and updates every user's tag array.
 * Throws if newName already exists or equals oldName.
 */
export async function renameTag(oldName: string, newName: string): Promise<void> {
  if (oldName === IGNORE_TAG_NAME) return;
  if (oldName === newName) return;

  const [tags, users] = await Promise.all([loadTags(), loadUsers()]);

  if (newName in tags) {
    throw new Error(`Tag "${newName}" already exists`);
  }

  const newTags: TagsMap = {};
  for (const [k, v] of Object.entries(tags)) {
    newTags[k === oldName ? newName : k] = v;
  }

  const newUsers: UsersMap = {};
  for (const [username, userDef] of Object.entries(users)) {
    newUsers[username] = {
      ...userDef,
      tags: userDef.tags.map((t) => (t === oldName ? newName : t))
    };
  }

  await Promise.all([saveTags(newTags), saveUsers(newUsers)]);
}

// ── Merge tag ─────────────────────────────────────────────────────────────────

/**
 * Merges sourceTag into targetTag: for every user who carries sourceTag,
 * removes it and ensures targetTag is present. Removes sourceTag from TagsMap.
 */
export async function mergeTag(sourceTag: string, targetTag: string): Promise<void> {
  if (sourceTag === IGNORE_TAG_NAME) return;
  if (sourceTag === targetTag) return;

  const [tags, users] = await Promise.all([loadTags(), loadUsers()]);

  const newTags = Object.fromEntries(
    Object.entries(tags).filter(([k]) => k !== sourceTag)
  );

  const newUsers: UsersMap = {};
  for (const [username, userDef] of Object.entries(users)) {
    if (!userDef.tags.includes(sourceTag)) {
      newUsers[username] = userDef;
      continue;
    }
    const filtered = userDef.tags.filter((t) => t !== sourceTag);
    const merged = filtered.includes(targetTag) ? filtered : [...filtered, targetTag];
    newUsers[username] = { ...userDef, tags: merged };
  }

  await Promise.all([saveTags(newTags), saveUsers(newUsers)]);
}
