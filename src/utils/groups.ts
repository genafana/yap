import { BUNDLED_GROUPS_RESOURCE } from './settings/defaults';
import { fetchExtensionText } from './extension-resource';
import { parseLooseJson } from './loose-json';

export interface RawUserGroup {
  users?: string | string[];
  ignore?: boolean;
  color?: string;
}

export type RawUserGroupMap = Record<string, RawUserGroup>;

export interface UserGroupEntry {
  group: string;
  ignore?: boolean;
  color?: string;
}

export type UserGroupLookup = Record<string, UserGroupEntry>;

export function normalizeGroupUsers(users: RawUserGroup['users']): string[] {
  if (Array.isArray(users)) {
    return users.map((value) => value.trim()).filter(Boolean);
  }

  if (typeof users === 'string') {
    return users.split(/\s+/).map((value) => value.trim()).filter(Boolean);
  }

  return [];
}

export function invertUserGroups(groups: RawUserGroupMap): UserGroupLookup {
  const users: UserGroupLookup = {};

  for (const [group, info] of Object.entries(groups)) {
    for (const user of normalizeGroupUsers(info.users)) {
      users[user] = {
        group,
        ...(info.ignore ? { ignore: true } : {}),
        ...(info.color ? { color: info.color } : {})
      };
    }
  }

  return users;
}

export async function loadUserGroupLookup(): Promise<UserGroupLookup> {
  const rawText = await fetchExtensionText(BUNDLED_GROUPS_RESOURCE);
  const groups = parseLooseJson<RawUserGroupMap>(rawText);
  return invertUserGroups(groups);
}
