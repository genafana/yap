import { getBrowser } from './browser-api';

export async function fetchExtensionText(path: string): Promise<string> {
  const browser = await getBrowser();
  const response = await fetch(browser.runtime.getURL(path));

  if (!response.ok) {
    throw new Error(`Failed to fetch extension resource "${path}": ${response.status}`);
  }

  return response.text();
}

export async function fetchExtensionJson<T>(path: string): Promise<T> {
  const text = await fetchExtensionText(path);
  return JSON.parse(text) as T;
}
