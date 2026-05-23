import { describe, expect, it } from 'vitest';
import { getContrastColor } from '../../src/utils/color';

describe('getContrastColor', () => {
  it('returns dark text for light backgrounds', () => {
    expect(getContrastColor('#ffffff')).toBe('#333333'); // white
    expect(getContrastColor('#ffff00')).toBe('#333333'); // yellow
    expect(getContrastColor('#f0f0f0')).toBe('#333333'); // light gray
    expect(getContrastColor('#80c0ff')).toBe('#333333'); // light blue
  });

  it('returns light text for dark backgrounds', () => {
    expect(getContrastColor('#000000')).toBe('#ffffff'); // black
    expect(getContrastColor('#0000ff')).toBe('#ffffff'); // blue
    expect(getContrastColor('#333333')).toBe('#ffffff'); // dark gray
    expect(getContrastColor('#800000')).toBe('#ffffff'); // dark red
  });

  it('returns dark text for mid-bright colors', () => {
    expect(getContrastColor('#90ee90')).toBe('#333333'); // light green
  });

  it('returns light text for mid-dark colors', () => {
    expect(getContrastColor('#556b2f')).toBe('#ffffff'); // dark olive
  });

  it('falls back to dark text for invalid input', () => {
    expect(getContrastColor('')).toBe('#333333');
    expect(getContrastColor('#xyz')).toBe('#333333');
    expect(getContrastColor('#fff')).toBe('#333333'); // 3-digit hex — not supported
  });
});
