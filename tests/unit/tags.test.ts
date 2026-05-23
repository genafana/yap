import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockStorage: Record<string, unknown> = {};

vi.mock('../../src/utils/browser-api', () => ({
  getBrowser: vi.fn().mockResolvedValue({
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
        set: vi.fn(async (obj: Record<string, unknown>) => {
          Object.assign(mockStorage, obj);
        })
      }
    }
  })
}));

import {
  buildUserTagsLookup,
  buildNativeExport,
  convertLegacyFormat,
  detectImportFormat,
  normalizeLegacyUsers,
  parseImport,
  importTagsData,
  loadUserTagsLookup,
  type LegacyTagsJson,
  type TagsMap,
  type UsersMap,
  TAGS_STORAGE_KEY,
  USERS_STORAGE_KEY
} from '../../src/utils/tags';

describe('normalizeLegacyUsers', () => {
  it('splits whitespace-delimited strings', () => {
    expect(normalizeLegacyUsers('one   two\nthree')).toEqual(['one', 'two', 'three']);
  });

  it('trims and filters empty entries from arrays', () => {
    expect(normalizeLegacyUsers(['alice', ' bob ', ''])).toEqual(['alice', 'bob']);
  });

  it('returns empty array for undefined', () => {
    expect(normalizeLegacyUsers(undefined)).toEqual([]);
  });
});

describe('convertLegacyFormat', () => {
  it('converts old groups.json format to tags+users', () => {
    const raw: LegacyTagsJson = {
      Developers: { color: 'Khaki', users: ['alice', 'bob'] },
      Muted: { ignore: true, users: 'spam-user' }
    };

    const { tags, users } = convertLegacyFormat(raw);

    expect(tags['Developers']).toEqual({ bgColor: 'Khaki' });
    expect(tags['Muted']).toEqual({ ignore: true });
    expect(users['alice']).toEqual({ tags: ['Developers'] });
    expect(users['bob']).toEqual({ tags: ['Developers'] });
    expect(users['spam-user']).toEqual({ tags: ['Muted'] });
  });

  it('merges tags when a user appears in multiple groups', () => {
    const raw: LegacyTagsJson = {
      GroupA: { color: 'Lime', users: ['user1'] },
      GroupB: { color: 'Salmon', users: ['user1', 'user2'] }
    };

    const { users } = convertLegacyFormat(raw);

    expect(users['user1'].tags).toHaveLength(2);
    expect(users['user1'].tags).toContain('GroupA');
    expect(users['user1'].tags).toContain('GroupB');
    expect(users['user2']).toEqual({ tags: ['GroupB'] });
  });

  it('omits bgColor when color is absent', () => {
    const raw: LegacyTagsJson = { Silent: { users: ['user1'] } };
    const { tags } = convertLegacyFormat(raw);
    expect(tags['Silent']).toEqual({});
  });
});

describe('buildUserTagsLookup', () => {
  it('resolves tag definitions for each user', () => {
    const tags: TagsMap = {
      Team: { bgColor: 'Khaki' },
      Ignore: { ignore: true }
    };
    const users: UsersMap = {
      alice: { tags: ['Team'] },
      bob: { tags: ['Team', 'Ignore'] },
      'spam-user': { tags: ['Ignore'] }
    };

    const lookup = buildUserTagsLookup(tags, users);

    expect(lookup['alice']).toEqual([{ name: 'Team', bgColor: 'Khaki' }]);
    expect(lookup['bob']).toEqual([
      { name: 'Team', bgColor: 'Khaki' },
      { name: 'Ignore', ignore: true }
    ]);
    expect(lookup['spam-user']).toEqual([{ name: 'Ignore', ignore: true }]);
  });

  it('handles tags not found in TagsMap gracefully', () => {
    const tags: TagsMap = {};
    const users: UsersMap = { alice: { tags: ['UnknownTag'] } };

    const lookup = buildUserTagsLookup(tags, users);
    expect(lookup['alice']).toEqual([{ name: 'UnknownTag' }]);
  });

  it('omits users with no tags', () => {
    const lookup = buildUserTagsLookup({}, { alice: { tags: [] } });
    expect(lookup['alice']).toBeUndefined();
  });
});

describe('detectImportFormat', () => {
  it('detects native format by version field', () => {
    expect(detectImportFormat({ version: 1, tags: {}, users: {} })).toBe('native');
  });

  it('detects legacy format by object structure', () => {
    const legacy = { GroupA: { color: 'Lime', users: ['u1'] } };
    expect(detectImportFormat(legacy)).toBe('legacy');
  });

  it('returns legacy for empty object', () => {
    expect(detectImportFormat({})).toBe('legacy');
  });

  it('returns unknown for non-objects', () => {
    expect(detectImportFormat(null)).toBe('unknown');
    expect(detectImportFormat('string')).toBe('unknown');
  });
});

describe('parseImport', () => {
  it('parses native format', () => {
    const input = {
      version: 1,
      tags: { Devs: { bgColor: 'Khaki' } },
      users: { alice: { tags: ['Devs'] } }
    };
    const result = parseImport(input);
    expect(result?.tags['Devs']).toEqual({ bgColor: 'Khaki' });
    expect(result?.users['alice']).toEqual({ tags: ['Devs'] });
  });

  it('converts legacy format during parse', () => {
    const legacy = { Devs: { color: 'Khaki', users: ['alice'] } };
    const result = parseImport(legacy);
    expect(result?.tags['Devs']).toEqual({ bgColor: 'Khaki' });
    expect(result?.users['alice']).toEqual({ tags: ['Devs'] });
  });

  it('returns null for unknown format', () => {
    expect(parseImport(42)).toBeNull();
  });
});

describe('buildNativeExport', () => {
  it('produces a version-1 export', () => {
    const tags: TagsMap = { QA: { bgColor: 'Moccasin' } };
    const users: UsersMap = { alice: { tags: ['QA'] } };
    expect(buildNativeExport(tags, users)).toEqual({ version: 1, tags, users });
  });
});

describe('importTagsData', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  });

  it('replaces existing data in replace mode', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { OldTag: { bgColor: 'Red' } };
    mockStorage[USERS_STORAGE_KEY] = { oldUser: { tags: ['OldTag'] } };

    await importTagsData(
      { tags: { NewTag: { bgColor: 'Blue' } }, users: { newUser: { tags: ['NewTag'] } } },
      'replace'
    );

    expect(mockStorage[TAGS_STORAGE_KEY]).toEqual({ NewTag: { bgColor: 'Blue' } });
    expect(mockStorage[USERS_STORAGE_KEY]).toEqual({ newUser: { tags: ['NewTag'] } });
  });

  it('merges data in merge mode', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { TagA: { bgColor: 'Red' } };
    mockStorage[USERS_STORAGE_KEY] = { alice: { tags: ['TagA'] } };

    await importTagsData(
      { tags: { TagB: { bgColor: 'Blue' } }, users: { alice: { tags: ['TagB'] }, bob: { tags: ['TagB'] } } },
      'merge'
    );

    const savedTags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(savedTags['TagA']).toEqual({ bgColor: 'Red' });
    expect(savedTags['TagB']).toEqual({ bgColor: 'Blue' });

    const savedUsers = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(savedUsers['alice'].tags).toContain('TagA');
    expect(savedUsers['alice'].tags).toContain('TagB');
    expect(savedUsers['bob']).toEqual({ tags: ['TagB'] });
  });
});

describe('loadUserTagsLookup', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  });

  it('returns empty lookup when storage is empty', async () => {
    await expect(loadUserTagsLookup()).resolves.toEqual({});
  });

  it('builds lookup from stored tags and users', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Devs: { bgColor: 'Khaki' } };
    mockStorage[USERS_STORAGE_KEY] = { alice: { tags: ['Devs'] } };

    const lookup = await loadUserTagsLookup();
    expect(lookup['alice']).toEqual([{ name: 'Devs', bgColor: 'Khaki' }]);
  });
});
