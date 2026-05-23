import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getBrowser } = vi.hoisted(() => ({
  getBrowser: vi.fn(async () => ({
    runtime: {
      getURL: (path: string) => `chrome-extension://test${path}`
    }
  }))
}));

vi.mock('../../src/utils/browser-api', () => ({
  getBrowser
}));

import {
  fetchExtensionText,
  fetchOptionalExtensionText
} from '../../src/utils/extension-resource';

describe('extension resource loading', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getBrowser.mockClear();
  });

  it('returns undefined for optional missing resources', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 }))
    );

    await expect(fetchOptionalExtensionText('/groups.json')).resolves.toBeUndefined();
  });

  it('throws for required missing resources', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 404 }))
    );

    await expect(fetchExtensionText('/config.json')).rejects.toThrow(
      'Failed to fetch extension resource "/config.json": 404'
    );
  });

  it('returns text for successful resource fetches', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    );

    await expect(fetchOptionalExtensionText('/groups.json')).resolves.toBe('{"ok":true}');
  });
});
