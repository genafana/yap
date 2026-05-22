export function parseLooseJson<T>(text: string): T {
  const normalized = text
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*(?=[}\]])/g, '')
    .replace(/"\s*"/g, '');

  return JSON.parse(normalized) as T;
}
