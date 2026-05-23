import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchOptionalExtensionText } = vi.hoisted(() => ({
  fetchOptionalExtensionText: vi.fn<(path: string) => Promise<string | undefined>>()
}));

vi.mock('../../src/utils/extension-resource', () => ({
  fetchOptionalExtensionText
}));

import {
  invertUserGroups,
  loadUserGroupLookup,
  normalizeGroupUsers,
  type RawUserGroupMap
} from '../../src/utils/groups';
import { parseLooseJson } from '../../src/utils/loose-json';

describe('group loading helpers', () => {
  beforeEach(() => {
    fetchOptionalExtensionText.mockReset();
  });

  it('splits whitespace-delimited user strings', () => {
    expect(normalizeGroupUsers('one   two\nthree')).toEqual(['one', 'two', 'three']);
  });

  it('inverts group definitions into a user lookup', () => {
    const lookup = invertUserGroups({
      Team: {
        color: 'Khaki',
        users: ['alice', 'bob']
      },
      Ignore: {
        ignore: true,
        users: 'spam-user'
      }
    });

    expect(lookup).toEqual({
      alice: { group: 'Team', color: 'Khaki' },
      bob: { group: 'Team', color: 'Khaki' },
      'spam-user': { group: 'Ignore', ignore: true }
    });
  });

  it('parses groups from an optional extension resource when present', async () => {
    fetchOptionalExtensionText.mockResolvedValue(`{
      "Muted": {
        "ignore": true,
        "users": ["User1"]
      },
      "Developers": {
        "color": "Khaki",
        "users": ["User2"]
      },
      "perfect": {
        "color": "Lime",
        "users": ["User4"]
      },
      "bad": {
        "color": "Salmon",
        "users": ["User5"]
      },
      "good": {
        "color": "GreenYellow",
        "users": ["User6"]
      },
      "sad": {
        "color": "Red",
        "users": ["User7"]
      }
    }`);

    const lookup = await loadUserGroupLookup();

    expect(lookup.User2).toEqual({
      group: 'Developers',
      color: 'Khaki'
    });
    expect(lookup.User1).toEqual({
      group: 'Muted',
      ignore: true
    });
    expect(lookup.User4).toEqual({
      group: 'perfect',
      color: 'Lime'
    });
    expect(lookup.User5).toEqual({
      group: 'bad',
      color: 'Salmon'
    });
    expect(lookup.User6).toEqual({
      group: 'good',
      color: 'GreenYellow'
    });
    expect(lookup.User7).toEqual({
      group: 'sad',
      color: 'Red'
    });
  });

  it('returns an empty lookup when groups.json is absent', async () => {
    fetchOptionalExtensionText.mockResolvedValue(undefined);

    await expect(loadUserGroupLookup()).resolves.toEqual({});
  });

  it('keeps loose-json compatibility for group documents', () => {
    const parsed = parseLooseJson<RawUserGroupMap>(`{
      "QA": {
        "color": "Moccasin",
        "users": "alice   bob"
      }
    }`);

    expect(invertUserGroups(parsed)).toEqual({
      alice: { group: 'QA', color: 'Moccasin' },
      bob: { group: 'QA', color: 'Moccasin' }
    });
  });
});
