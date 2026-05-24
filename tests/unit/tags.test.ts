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
  ensureIgnoreTag,
  findPrimaryTagBgColor,
  normalizeLegacyUsers,
  parseImport,
  importTagsData,
  loadUserTagsLookup,
  deleteTag,
  renameTag,
  mergeTag,
  type LegacyTagsJson,
  type TagsMap,
  type UsersMap,
  IGNORE_TAG_NAME,
  TAGS_STORAGE_KEY,
  USERS_STORAGE_KEY
} from '../../src/utils/tags';
import { parseLooseJson } from '../../src/utils/loose-json';

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

    expect(tags['Developers']).toEqual({ bgColor: 'Khaki', primary: true });
    expect(tags['Muted']).toEqual({ ignore: true, primary: true });
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
    expect(tags['Silent']).toEqual({ primary: true });
  });

  it('splits space-separated string users', () => {
    const raw: LegacyTagsJson = { Разрабы: { color: 'Khaki', users: 'Dmitry1971 DimiDron' } };
    const { tags, users } = convertLegacyFormat(raw);
    expect(tags['Разрабы']).toEqual({ bgColor: 'Khaki', primary: true });
    expect(users['Dmitry1971']).toEqual({ tags: ['Разрабы'] });
    expect(users['DimiDron']).toEqual({ tags: ['Разрабы'] });
  });

  it('sets ignore flag and no bgColor for ignore-only groups', () => {
    const raw: LegacyTagsJson = { Игнор: { ignore: true, users: 'Ник1 Ник2 Ник3' } };
    const { tags, users } = convertLegacyFormat(raw);
    expect(tags['Игнор']).toEqual({ ignore: true, primary: true });
    expect(Object.keys(users)).toHaveLength(3);
    expect(users['Ник1']).toEqual({ tags: ['Игнор'] });
  });

  it('handles adjacent-string-literal users via parseLooseJson pipeline', () => {
    // Simulates the real orig format where long user lists span multiple JSON strings
    const looseText = `{
      "Наши": { "color": "Lime", "users": "alice bob "
                                           "charlie dave" }
    }`;
    const parsed = parseLooseJson<LegacyTagsJson>(looseText);
    const { tags, users } = convertLegacyFormat(parsed);
    expect(tags['Наши']).toEqual({ bgColor: 'Lime', primary: true });
    expect(users['alice']).toEqual({ tags: ['Наши'] });
    expect(users['charlie']).toEqual({ tags: ['Наши'] });
    expect(users['dave']).toEqual({ tags: ['Наши'] });
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

    // primary defaults to true when absent from TagDefinition
    expect(lookup['alice']).toEqual([{ name: 'Team', bgColor: 'Khaki', primary: true }]);
    expect(lookup['bob']).toEqual([
      { name: 'Team', bgColor: 'Khaki', primary: true },
      { name: 'Ignore', ignore: true, primary: true }
    ]);
    expect(lookup['spam-user']).toEqual([{ name: 'Ignore', ignore: true, primary: true }]);
  });

  describe('findPrimaryTagBgColor', () => {
    it('returns the first primary tag color in user tag order', () => {
      const tags: TagsMap = {
        A: { bgColor: '#111', primary: false },
        B: { bgColor: '#222', primary: true },
        C: { bgColor: '#333', primary: true }
      };
      expect(findPrimaryTagBgColor(['A', 'B', 'C'], tags)).toBe('#222');
    });

    it('treats missing primary as true and missing tag defs as primary', () => {
      const tags: TagsMap = {
        X: { bgColor: '#abc' },
        Y: { primary: false, bgColor: '#def' }
      };
      expect(findPrimaryTagBgColor(['Y', 'Z', 'X'], tags)).toBe('#abc');
    });

    it('returns undefined when no primary colored tags exist', () => {
      const tags: TagsMap = {
        A: { primary: false, bgColor: '#111' },
        B: { primary: false }
      };
      expect(findPrimaryTagBgColor(['A', 'B'], tags)).toBeUndefined();
    });
  });

  it('handles tags not found in TagsMap gracefully (treated as primary)', () => {
    const tags: TagsMap = {};
    const users: UsersMap = { alice: { tags: ['UnknownTag'] } };

    const lookup = buildUserTagsLookup(tags, users);
    expect(lookup['alice']).toEqual([{ name: 'UnknownTag', primary: true }]);
  });

  it('omits primary flag when tag has primary: false', () => {
    const tags: TagsMap = { SecondaryTag: { bgColor: '#abc', primary: false } };
    const users: UsersMap = { alice: { tags: ['SecondaryTag'] } };

    const lookup = buildUserTagsLookup(tags, users);
    expect(lookup['alice']).toEqual([{ name: 'SecondaryTag', bgColor: '#abc' }]);
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
    expect(result?.tags['Devs']).toEqual({ bgColor: 'Khaki', primary: true });
    expect(result?.users['alice']).toEqual({ tags: ['Devs'] });
  });

  it('converts legacy format with space-separated string users', () => {
    const legacy = { Разрабы: { color: 'Khaki', users: 'Dmitry1971 DimiDron' } };
    const result = parseImport(legacy);
    expect(result?.tags['Разрабы']).toEqual({ bgColor: 'Khaki', primary: true });
    expect(result?.users['Dmitry1971']).toEqual({ tags: ['Разрабы'] });
    expect(result?.users['DimiDron']).toEqual({ tags: ['Разрабы'] });
  });

  it('converts legacy format with ignore group', () => {
    const legacy = { Игнор: { ignore: true, users: 'Ник1 Ник2 Ник3' } };
    const result = parseImport(legacy);
    expect(result?.tags['Игнор']).toEqual({ ignore: true, primary: true });
    expect(result?.users['Ник1']).toEqual({ tags: ['Игнор'] });
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

  it('replaces existing data in replace mode, but always preserves the ignore tag', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { OldTag: { bgColor: 'Red' } };
    mockStorage[USERS_STORAGE_KEY] = { oldUser: { tags: ['OldTag'] } };

    await importTagsData(
      { tags: { NewTag: { bgColor: 'Blue' } }, users: { newUser: { tags: ['NewTag'] } } },
      'replace'
    );

    const savedTags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(savedTags['NewTag']).toEqual({ bgColor: 'Blue' });
    expect(savedTags[IGNORE_TAG_NAME]).toEqual({ ignore: true, primary: true });
    expect(savedTags).not.toHaveProperty('OldTag');

    const savedUsers = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(savedUsers['newUser']).toEqual({ tags: ['NewTag'] });
    expect(savedUsers).not.toHaveProperty('oldUser');
  });

  it('merges data in merge mode, always enforces ignore tag', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { TagA: { bgColor: 'Red' } };
    mockStorage[USERS_STORAGE_KEY] = { alice: { tags: ['TagA'] } };

    await importTagsData(
      { tags: { TagB: { bgColor: 'Blue' } }, users: { alice: { tags: ['TagB'] }, bob: { tags: ['TagB'] } } },
      'merge'
    );

    const savedTags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(savedTags['TagA']).toEqual({ bgColor: 'Red' });
    expect(savedTags['TagB']).toEqual({ bgColor: 'Blue' });
    expect(savedTags[IGNORE_TAG_NAME]).toEqual({ ignore: true, primary: true });

    const savedUsers = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(savedUsers['alice'].tags).toContain('TagA');
    expect(savedUsers['alice'].tags).toContain('TagB');
    expect(savedUsers['bob']).toEqual({ tags: ['TagB'] });
  });

  it('replace mode preserves existing ignore-tag users not in the import', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { [IGNORE_TAG_NAME]: { ignore: true }, TagA: {} };
    mockStorage[USERS_STORAGE_KEY] = { spammer: { tags: [IGNORE_TAG_NAME] } };

    await importTagsData(
      { tags: { NewTag: {} }, users: { bob: { tags: ['NewTag'] } } },
      'replace'
    );

    const savedUsers = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(savedUsers['spammer']?.tags).toContain(IGNORE_TAG_NAME);
    expect(savedUsers['bob']?.tags).toEqual(['NewTag']);
  });

  it('replace mode merges incoming ignore users into preserved ignore list', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { [IGNORE_TAG_NAME]: { ignore: true } };
    mockStorage[USERS_STORAGE_KEY] = { existing: { tags: [IGNORE_TAG_NAME] } };

    await importTagsData(
      { tags: { [IGNORE_TAG_NAME]: { ignore: true } }, users: { newcomer: { tags: [IGNORE_TAG_NAME] } } },
      'replace'
    );

    const savedUsers = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(savedUsers['existing']?.tags).toContain(IGNORE_TAG_NAME);
    expect(savedUsers['newcomer']?.tags).toContain(IGNORE_TAG_NAME);
  });
});

describe('ensureIgnoreTag', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  });

  it('creates the ignore tag when storage is empty', async () => {
    await ensureIgnoreTag();
    const tags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(tags[IGNORE_TAG_NAME]).toEqual({ ignore: true, primary: true });
  });

  it('creates the ignore tag when it does not exist yet', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Other: {} };
    await ensureIgnoreTag();
    const tags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(tags[IGNORE_TAG_NAME]).toEqual({ ignore: true, primary: true });
    expect(tags['Other']).toEqual({});
  });

  it('does not write when ignore tag already exists with ignore:true and primary:true', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { [IGNORE_TAG_NAME]: { ignore: true, primary: true } };
    const setBefore = JSON.stringify(mockStorage);
    await ensureIgnoreTag();
    expect(JSON.stringify(mockStorage)).toEqual(setBefore);
  });

  it('fixes ignore tag when primary:true flag is missing', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { [IGNORE_TAG_NAME]: { ignore: true } };
    await ensureIgnoreTag();
    const tags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(tags[IGNORE_TAG_NAME]).toEqual({ ignore: true, primary: true });
  });

  it('fixes ignore tag when ignore:true flag is missing', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { [IGNORE_TAG_NAME]: { bgColor: '#ff0000' } };
    await ensureIgnoreTag();
    const tags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(tags[IGNORE_TAG_NAME]).toEqual({ bgColor: '#ff0000', ignore: true, primary: true });
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
    expect(lookup['alice']).toEqual([{ name: 'Devs', bgColor: 'Khaki', primary: true }]);
  });
});

describe('deleteTag', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  });

  it('removes the tag from TagsMap', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Admin: { bgColor: '#f00' }, Dev: { bgColor: '#0f0' } };
    mockStorage[USERS_STORAGE_KEY] = { alice: { tags: ['Admin'] }, bob: { tags: ['Dev'] } };

    await deleteTag('Admin');

    const saved = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(saved).not.toHaveProperty('Admin');
    expect(saved).toHaveProperty('Dev');
  });

  it('strips the tag from affected users', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Admin: { bgColor: '#f00' }, Dev: { bgColor: '#0f0' } };
    mockStorage[USERS_STORAGE_KEY] = { alice: { tags: ['Admin', 'Dev'] } };

    await deleteTag('Admin');

    const saved = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(saved['alice']?.tags).toEqual(['Dev']);
  });

  it('removes users whose tag list becomes empty after deletion', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Admin: { bgColor: '#f00' } };
    mockStorage[USERS_STORAGE_KEY] = { alice: { tags: ['Admin'] } };

    await deleteTag('Admin');

    const saved = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(saved).not.toHaveProperty('alice');
  });

  it('is a no-op when the tag does not exist', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Dev: { bgColor: '#0f0' } };
    mockStorage[USERS_STORAGE_KEY] = { alice: { tags: ['Dev'] } };

    await deleteTag('NonExistent');

    const savedTags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    const savedUsers = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(savedTags).toHaveProperty('Dev');
    expect(savedUsers['alice']?.tags).toEqual(['Dev']);
  });

  it('is a no-op for the ignore tag', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { [IGNORE_TAG_NAME]: { ignore: true } };
    mockStorage[USERS_STORAGE_KEY] = { spammer: { tags: [IGNORE_TAG_NAME] } };

    await deleteTag(IGNORE_TAG_NAME);

    const savedTags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(savedTags[IGNORE_TAG_NAME]).toEqual({ ignore: true });
    expect((mockStorage[USERS_STORAGE_KEY] as UsersMap)['spammer']?.tags).toContain(IGNORE_TAG_NAME);
  });
});

describe('renameTag', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  });

  it('renames the tag in TagsMap and all user entries', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { OldTag: { bgColor: '#f00' }, Other: {} };
    mockStorage[USERS_STORAGE_KEY] = {
      alice: { tags: ['OldTag', 'Other'] },
      bob: { tags: ['OldTag'] }
    };

    await renameTag('OldTag', 'NewTag');

    const savedTags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(savedTags).not.toHaveProperty('OldTag');
    expect(savedTags['NewTag']).toEqual({ bgColor: '#f00' });
    expect(savedTags['Other']).toEqual({});

    const savedUsers = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(savedUsers['alice'].tags).toContain('NewTag');
    expect(savedUsers['alice'].tags).not.toContain('OldTag');
    expect(savedUsers['bob'].tags).toEqual(['NewTag']);
  });

  it('is a no-op when oldName === newName', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Tag: { bgColor: '#f00' } };
    mockStorage[USERS_STORAGE_KEY] = { alice: { tags: ['Tag'] } };

    await renameTag('Tag', 'Tag');

    expect(mockStorage[TAGS_STORAGE_KEY]).toEqual({ Tag: { bgColor: '#f00' } });
  });

  it('throws when newName already exists', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { TagA: {}, TagB: {} };
    mockStorage[USERS_STORAGE_KEY] = {};

    await expect(renameTag('TagA', 'TagB')).rejects.toThrow();
  });

  it('is a silent no-op when oldName does not exist in TagsMap', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Other: { bgColor: '#0f0' } };
    mockStorage[USERS_STORAGE_KEY] = { alice: { tags: ['Other'] } };

    await renameTag('Ghost', 'GhostNew');

    expect(mockStorage[TAGS_STORAGE_KEY]).toEqual({ Other: { bgColor: '#0f0' } });
    expect((mockStorage[USERS_STORAGE_KEY] as UsersMap)['alice'].tags).toEqual(['Other']);
  });

  it('is a no-op for the ignore tag', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { [IGNORE_TAG_NAME]: { ignore: true } };
    mockStorage[USERS_STORAGE_KEY] = {};

    await renameTag(IGNORE_TAG_NAME, 'NewName');

    const savedTags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(savedTags[IGNORE_TAG_NAME]).toEqual({ ignore: true });
    expect(savedTags).not.toHaveProperty('NewName');
  });
});

describe('mergeTag', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStorage)) {
      delete mockStorage[k];
    }
  });

  it('removes sourceTag and adds targetTag to affected users', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Src: {}, Tgt: {} };
    mockStorage[USERS_STORAGE_KEY] = {
      alice: { tags: ['Src'] },
      bob: { tags: ['Tgt'] }
    };

    await mergeTag('Src', 'Tgt');

    const savedTags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(savedTags).not.toHaveProperty('Src');
    expect(savedTags).toHaveProperty('Tgt');

    const savedUsers = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(savedUsers['alice'].tags).toEqual(['Tgt']);
    expect(savedUsers['bob'].tags).toEqual(['Tgt']);
  });

  it('does not duplicate targetTag when user already has it', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Src: {}, Tgt: {} };
    mockStorage[USERS_STORAGE_KEY] = { alice: { tags: ['Src', 'Tgt'] } };

    await mergeTag('Src', 'Tgt');

    const savedUsers = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(savedUsers['alice'].tags).toEqual(['Tgt']);
  });

  it('leaves users without sourceTag unchanged', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Src: {}, Tgt: {}, Other: {} };
    mockStorage[USERS_STORAGE_KEY] = {
      alice: { tags: ['Src'] },
      bob: { tags: ['Other'] }
    };

    await mergeTag('Src', 'Tgt');

    const savedUsers = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(savedUsers['bob'].tags).toEqual(['Other']);
  });

  it('is a no-op when source === target', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Tag: {} };
    mockStorage[USERS_STORAGE_KEY] = { alice: { tags: ['Tag'] } };

    await mergeTag('Tag', 'Tag');

    expect(mockStorage[TAGS_STORAGE_KEY]).toEqual({ Tag: {} });
    expect((mockStorage[USERS_STORAGE_KEY] as UsersMap)['alice'].tags).toEqual(['Tag']);
  });

  it('is a silent no-op when sourceTag does not exist', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { Tgt: {} };
    mockStorage[USERS_STORAGE_KEY] = { alice: { tags: ['Tgt'] } };

    await mergeTag('Ghost', 'Tgt');

    expect(mockStorage[TAGS_STORAGE_KEY]).toEqual({ Tgt: {} });
    expect((mockStorage[USERS_STORAGE_KEY] as UsersMap)['alice'].tags).toEqual(['Tgt']);
  });

  it('is a no-op when source is the ignore tag', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { [IGNORE_TAG_NAME]: { ignore: true }, Other: {} };
    mockStorage[USERS_STORAGE_KEY] = { spammer: { tags: [IGNORE_TAG_NAME] } };

    await mergeTag(IGNORE_TAG_NAME, 'Other');

    const savedTags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(savedTags[IGNORE_TAG_NAME]).toEqual({ ignore: true });
    expect((mockStorage[USERS_STORAGE_KEY] as UsersMap)['spammer']?.tags).toContain(IGNORE_TAG_NAME);
  });

  it('allows merging another tag INTO the ignore tag', async () => {
    mockStorage[TAGS_STORAGE_KEY] = { [IGNORE_TAG_NAME]: { ignore: true }, Trash: {} };
    mockStorage[USERS_STORAGE_KEY] = { spammer: { tags: ['Trash'] } };

    await mergeTag('Trash', IGNORE_TAG_NAME);

    const savedTags = mockStorage[TAGS_STORAGE_KEY] as TagsMap;
    expect(savedTags).not.toHaveProperty('Trash');
    expect(savedTags[IGNORE_TAG_NAME]).toEqual({ ignore: true });

    const savedUsers = mockStorage[USERS_STORAGE_KEY] as UsersMap;
    expect(savedUsers['spammer']?.tags).toContain(IGNORE_TAG_NAME);
    expect(savedUsers['spammer']?.tags).not.toContain('Trash');
  });
});
