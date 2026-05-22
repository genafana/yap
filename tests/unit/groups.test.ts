import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  invertUserGroups,
  normalizeGroupUsers,
  type RawUserGroupMap
} from '../../src/utils/groups';
import { parseLooseJson } from '../../src/utils/loose-json';

describe('group loading helpers', () => {
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

  it('parses the bundled groups resource', () => {
    const groupsText = readFileSync(
      new URL('../../public/groups.json', import.meta.url),
      'utf8'
    );
    const parsed = parseLooseJson<RawUserGroupMap>(groupsText);
    const lookup = invertUserGroups(parsed);

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
});
