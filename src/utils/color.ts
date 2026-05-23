/**
 * Calculates accessible text color (dark or light) for a given hex background.
 * Uses the WCAG relative luminance formula.
 */
export function getContrastColor(hexBg: string): '#333333' | '#ffffff' {
  if (!/^#[0-9a-fA-F]{6}$/.test(hexBg)) {
    return '#333333';
  }

  const r = parseInt(hexBg.slice(1, 3), 16) / 255;
  const g = parseInt(hexBg.slice(3, 5), 16) / 255;
  const b = parseInt(hexBg.slice(5, 7), 16) / 255;

  const toLinear = (c: number): number =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;

  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return luminance > 0.179 ? '#333333' : '#ffffff';
}
