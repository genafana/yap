import { getBrowser } from './browser-api';

async function fetchExtensionResource(path: string): Promise<Response> {
  const browser = await getBrowser();
  return fetch(browser.runtime.getURL(path));
}

export async function fetchExtensionText(path: string): Promise<string> {
  const response = await fetchExtensionResource(path);

  if (!response.ok) {
    throw new Error(`Failed to fetch extension resource "${path}": ${response.status}`);
  }

  return response.text();
}

export async function fetchOptionalExtensionText(path: string): Promise<string | undefined> {
  const response = await fetchExtensionResource(path);

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch extension resource "${path}": ${response.status}`);
  }

  return response.text();
}

export async function fetchExtensionJson<T>(path: string): Promise<T> {
  const text = await fetchExtensionText(path);
  return JSON.parse(text) as T;
}
