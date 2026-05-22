export type SettingPrimitive = string | number | boolean;
export type SettingKind = 'string' | 'integer' | 'boolean' | 'enum';

export interface SettingDefinition<T extends SettingPrimitive> {
  readonly labelMessage: string;
  readonly type: SettingKind;
  readonly defaultValue: T;
  readonly descriptionMessage?: string;
  readonly values?: readonly T[];
  readonly valueLabelMessages?: readonly string[];
}

export interface ExtensionSettings {
  left_col_width: string;
  left_col_right_border: string;
  hor_separate_border: string;
  user_pic_size: number;
  nik_on_top: boolean;
  show_date_or_age: 'date' | 'age';
  self_highlight_bg: string;
  self_highlight_border: string;
  title_bg_color: string;
  message_bg_color: string;
  citate_bg_color: string;
  msg_menu_type: 'icon' | 'text';
  reduce_ad_block: boolean;
  origin_scroll_top: '' | 'hide' | 'moveleft';
  apply_context_menu: boolean;
  privat_mail_type: 'msg_menu' | 'avatar_rkm';
  response_form: 'always' | 'toggle';
  smilies_show_all: 'always' | 'simple' | '';
  smilies_text: 'bottom' | 'title' | '';
  smilies_columns: '2' | '3' | '4' | '5';
}

export interface SettingsDocument {
  version: number;
  settings: ExtensionSettings;
}

export type SettingsInput = Partial<Record<keyof ExtensionSettings, unknown>>;

export const SETTINGS_VERSION = 1;
export const SETTINGS_STORAGE_KEY = 'yap-lamp-settings';
export const LEGACY_PAGE_STORAGE_KEY = 'yap_plugin_conf_klassika';
export const BUNDLED_CONFIG_RESOURCE = '/config.json';
export const BUNDLED_GROUPS_RESOURCE = '/groups.json';

export const settingDefinitions: {
  readonly [K in keyof ExtensionSettings]: SettingDefinition<ExtensionSettings[K]>;
} = {
  left_col_width: {
    labelMessage: 'setting_left_col_width_label',
    type: 'string',
    defaultValue: '9em',
    descriptionMessage: 'setting_left_col_width_description'
  },
  left_col_right_border: {
    labelMessage: 'setting_left_col_right_border_label',
    type: 'string',
    defaultValue: '1px solid silver',
    descriptionMessage: 'setting_left_col_right_border_description'
  },
  hor_separate_border: {
    labelMessage: 'setting_hor_separate_border_label',
    type: 'string',
    defaultValue: '1px ridge silver',
    descriptionMessage: 'setting_hor_separate_border_description'
  },
  user_pic_size: {
    labelMessage: 'setting_user_pic_size_label',
    type: 'integer',
    defaultValue: 70,
    descriptionMessage: 'setting_user_pic_size_description'
  },
  nik_on_top: {
    labelMessage: 'setting_nik_on_top_label',
    type: 'boolean',
    defaultValue: true,
    descriptionMessage: 'setting_nik_on_top_description'
  },
  show_date_or_age: {
    labelMessage: 'setting_show_date_or_age_label',
    type: 'enum',
    defaultValue: 'date',
    values: ['date', 'age'],
    valueLabelMessages: ['setting_show_date_or_age_value_date', 'setting_show_date_or_age_value_age'],
    descriptionMessage: 'setting_show_date_or_age_description'
  },
  self_highlight_bg: {
    labelMessage: 'setting_self_highlight_bg_label',
    type: 'string',
    defaultValue: 'Gainsboro',
    descriptionMessage: 'setting_self_highlight_bg_description'
  },
  self_highlight_border: {
    labelMessage: 'setting_self_highlight_border_label',
    type: 'string',
    defaultValue: '1px solid silver',
    descriptionMessage: 'setting_self_highlight_border_description'
  },
  title_bg_color: {
    labelMessage: 'setting_title_bg_color_label',
    type: 'string',
    defaultValue: '#FAF8F8',
    descriptionMessage: 'setting_title_bg_color_description'
  },
  message_bg_color: {
    labelMessage: 'setting_message_bg_color_label',
    type: 'string',
    defaultValue: 'white',
    descriptionMessage: 'setting_message_bg_color_description'
  },
  citate_bg_color: {
    labelMessage: 'setting_citate_bg_color_label',
    type: 'string',
    defaultValue: 'white',
    descriptionMessage: 'setting_citate_bg_color_description'
  },
  msg_menu_type: {
    labelMessage: 'setting_msg_menu_type_label',
    type: 'enum',
    defaultValue: 'icon',
    values: ['icon', 'text'],
    valueLabelMessages: ['setting_msg_menu_type_value_icon', 'setting_msg_menu_type_value_text']
  },
  reduce_ad_block: {
    labelMessage: 'setting_reduce_ad_block_label',
    type: 'boolean',
    defaultValue: false,
    descriptionMessage: 'setting_reduce_ad_block_description'
  },
  origin_scroll_top: {
    labelMessage: 'setting_origin_scroll_top_label',
    type: 'enum',
    defaultValue: '',
    values: ['', 'hide', 'moveleft'],
    valueLabelMessages: [
      'setting_origin_scroll_top_value_keep',
      'setting_origin_scroll_top_value_hide',
      'setting_origin_scroll_top_value_moveleft'
    ]
  },
  apply_context_menu: {
    labelMessage: 'setting_apply_context_menu_label',
    type: 'boolean',
    defaultValue: true,
    descriptionMessage: 'setting_apply_context_menu_description'
  },
  privat_mail_type: {
    labelMessage: 'setting_privat_mail_type_label',
    type: 'enum',
    defaultValue: 'msg_menu',
    values: ['msg_menu', 'avatar_rkm'],
    valueLabelMessages: [
      'setting_privat_mail_type_value_msg_menu',
      'setting_privat_mail_type_value_avatar_rkm'
    ],
    descriptionMessage: 'setting_privat_mail_type_description'
  },
  response_form: {
    labelMessage: 'setting_response_form_label',
    type: 'enum',
    defaultValue: 'always',
    values: ['always', 'toggle'],
    valueLabelMessages: [
      'setting_response_form_value_always',
      'setting_response_form_value_toggle'
    ],
    descriptionMessage: 'setting_response_form_description'
  },
  smilies_show_all: {
    labelMessage: 'setting_smilies_show_all_label',
    type: 'enum',
    defaultValue: 'always',
    values: ['always', 'simple', ''],
    valueLabelMessages: [
      'setting_smilies_show_all_value_always',
      'setting_smilies_show_all_value_simple',
      'setting_smilies_show_all_value_none'
    ],
    descriptionMessage: 'setting_smilies_show_all_description'
  },
  smilies_text: {
    labelMessage: 'setting_smilies_text_label',
    type: 'enum',
    defaultValue: 'title',
    values: ['bottom', 'title', ''],
    valueLabelMessages: [
      'setting_smilies_text_value_bottom',
      'setting_smilies_text_value_title',
      'setting_smilies_text_value_none'
    ],
    descriptionMessage: 'setting_smilies_text_description'
  },
  smilies_columns: {
    labelMessage: 'setting_smilies_columns_label',
    type: 'enum',
    defaultValue: '2',
    values: ['2', '3', '4', '5'],
    valueLabelMessages: ['2', '3', '4', '5'],
    descriptionMessage: 'setting_smilies_columns_description'
  }
};

export const settingKeys = Object.keys(settingDefinitions) as Array<keyof ExtensionSettings>;

export const defaultSettings: ExtensionSettings = {
  left_col_width: settingDefinitions.left_col_width.defaultValue,
  left_col_right_border: settingDefinitions.left_col_right_border.defaultValue,
  hor_separate_border: settingDefinitions.hor_separate_border.defaultValue,
  user_pic_size: settingDefinitions.user_pic_size.defaultValue,
  nik_on_top: settingDefinitions.nik_on_top.defaultValue,
  show_date_or_age: settingDefinitions.show_date_or_age.defaultValue,
  self_highlight_bg: settingDefinitions.self_highlight_bg.defaultValue,
  self_highlight_border: settingDefinitions.self_highlight_border.defaultValue,
  title_bg_color: settingDefinitions.title_bg_color.defaultValue,
  message_bg_color: settingDefinitions.message_bg_color.defaultValue,
  citate_bg_color: settingDefinitions.citate_bg_color.defaultValue,
  msg_menu_type: settingDefinitions.msg_menu_type.defaultValue,
  reduce_ad_block: settingDefinitions.reduce_ad_block.defaultValue,
  origin_scroll_top: settingDefinitions.origin_scroll_top.defaultValue,
  apply_context_menu: settingDefinitions.apply_context_menu.defaultValue,
  privat_mail_type: settingDefinitions.privat_mail_type.defaultValue,
  response_form: settingDefinitions.response_form.defaultValue,
  smilies_show_all: settingDefinitions.smilies_show_all.defaultValue,
  smilies_text: settingDefinitions.smilies_text.defaultValue,
  smilies_columns: settingDefinitions.smilies_columns.defaultValue
};

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return fallback;
}

function normalizeInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeString(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    return value;
  }

  return fallback;
}

function normalizeEnum<T extends string>(
  value: unknown,
  fallback: T,
  allowedValues: readonly T[]
): T {
  if (typeof value === 'string' && allowedValues.includes(value as T)) {
    return value as T;
  }

  return fallback;
}

export function applySettingsCompatibilityRules(settings: ExtensionSettings): ExtensionSettings {
  if (!settings.apply_context_menu) {
    return {
      ...settings,
      privat_mail_type: 'msg_menu'
    };
  }

  return settings;
}

export function normalizeSettings(input: SettingsInput | undefined): ExtensionSettings {
  const normalized: Partial<ExtensionSettings> = {};

  for (const key of settingKeys) {
    const definition = settingDefinitions[key];
    const rawValue = input?.[key];

    switch (definition.type) {
      case 'boolean':
        normalized[key] = normalizeBoolean(rawValue, definition.defaultValue as boolean) as never;
        break;
      case 'integer':
        normalized[key] = normalizeInteger(rawValue, definition.defaultValue as number) as never;
        break;
      case 'enum':
        normalized[key] = normalizeEnum(
          rawValue,
          definition.defaultValue as string,
          (definition.values ?? []) as readonly string[]
        ) as never;
        break;
      case 'string':
      default:
        normalized[key] = normalizeString(rawValue, definition.defaultValue as string) as never;
    }
  }

  return applySettingsCompatibilityRules(normalized as ExtensionSettings);
}

export function createSettingsDocument(input?: SettingsInput): SettingsDocument {
  return {
    version: SETTINGS_VERSION,
    settings: normalizeSettings(input)
  };
}

export function serializeSettingsForExport(settings: ExtensionSettings): string {
  return JSON.stringify(settings, null, 4);
}
