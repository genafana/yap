import type Browser from 'webextension-polyfill';

export async function getBrowser(): Promise<typeof Browser> {
  const mod = await import('webextension-polyfill');
  return mod.default;
}

