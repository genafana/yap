import type { SettingPrimitive } from '../../utils/settings/defaults';

export function resolveSelectOptionLabel(
  localizedLabel: string | undefined,
  optionValue: SettingPrimitive,
): string {
  return localizedLabel || String(optionValue);
}
