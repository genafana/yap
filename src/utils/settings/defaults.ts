export type SettingPrimitive = string | number | boolean;
export type SettingKind = 'string' | 'integer' | 'boolean' | 'enum';

export interface SettingDefinition<T extends SettingPrimitive> {
  readonly label: string;
  readonly type: SettingKind;
  readonly defaultValue: T;
  readonly description: string;
  readonly values?: readonly T[];
  readonly valueLabels?: readonly string[];
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
    label: 'Ширина левого столбца',
    type: 'string',
    defaultValue: '9em',
    description:
      '<a target="_blank" rel="noopener noreferrer" href="https://learn.javascript.ru/css-units">Единицы измерения в CSS</a>'
  },
  left_col_right_border: {
    label: 'Вертикальная линия левого столбца',
    type: 'string',
    defaultValue: '1px solid silver',
    description:
      'Формат: толщина стиль цвет. <a target="_blank" rel="noopener noreferrer" href="https://htmlbook.ru/css/border-style">Стили линий</a> <a target="_blank" rel="noopener noreferrer" href="https://colorscheme.ru/html-colors.html">Цвета HTML</a>'
  },
  hor_separate_border: {
    label: 'Горизонтальная линия - разделитель сообщений',
    type: 'string',
    defaultValue: '1px ridge silver',
    description:
      'Формат: толщина стиль цвет. <a target="_blank" rel="noopener noreferrer" href="https://htmlbook.ru/css/border-style">Стили линий</a>'
  },
  user_pic_size: {
    label: 'Размер аватарки в пикселях',
    type: 'integer',
    defaultValue: 70,
    description: 'Чем больше число, тем больше размер аватарки, понятное дело'
  },
  nik_on_top: {
    label: 'Ник над аватаркой',
    type: 'boolean',
    defaultValue: true,
    description:
      'При включенной галочке ник выводится в ленте над аватаркой пользователя, при отключенной - под ней.'
  },
  show_date_or_age: {
    label: 'Дата регистрации или возраст на сайте',
    type: 'enum',
    defaultValue: 'date',
    values: ['date', 'age'],
    valueLabels: ['дата', 'возраст'],
    description: 'Вид вывода информации по пользователю'
  },
  self_highlight_bg: {
    label: 'Фон в левом столбце в собственных сообщениях',
    type: 'string',
    defaultValue: 'Gainsboro',
    description:
      'При пустом значении выделения фоном нет. <a target="_blank" rel="noopener noreferrer" href="https://colorscheme.ru/html-colors.html">Цвета HTML</a>'
  },
  self_highlight_border: {
    label: 'Линия-граница в левом столбце в собственных сообщениях',
    type: 'string',
    defaultValue: '1px solid silver',
    description:
      'При пустом значении границы нет. Формат: толщина стиль цвет. <a target="_blank" rel="noopener noreferrer" href="https://htmlbook.ru/css/border-style">Стили линий</a>'
  },
  title_bg_color: {
    label: 'Цвет фона строки-заголовка сообщения и левого столбца',
    type: 'string',
    defaultValue: '#FAF8F8',
    description:
      '<a target="_blank" rel="noopener noreferrer" href="https://colorscheme.ru/html-colors.html">Цвета HTML</a>'
  },
  message_bg_color: {
    label: 'Цвет фона сообщения',
    type: 'string',
    defaultValue: 'white',
    description:
      '<a target="_blank" rel="noopener noreferrer" href="https://colorscheme.ru/html-colors.html">Цвета HTML</a>'
  },
  citate_bg_color: {
    label: 'Цвет фона цитаты в сообщении',
    type: 'string',
    defaultValue: 'white',
    description:
      '<a target="_blank" rel="noopener noreferrer" href="https://colorscheme.ru/html-colors.html">Цвета HTML</a>'
  },
  msg_menu_type: {
    label: 'Тип меню в сообщениях',
    type: 'enum',
    defaultValue: 'icon',
    values: ['icon', 'text'],
    valueLabels: ['иконки', 'текст'],
    description: ''
  },
  reduce_ad_block: {
    label: 'Уменьшить ширину правого столбца',
    type: 'boolean',
    defaultValue: false,
    description:
      'При включенной галочке уменьшение ширины на 20%. Для широких мониторов не актуально.'
  },
  origin_scroll_top: {
    label: 'Появляющаяся оригинальная ссылка "Наверх"',
    type: 'enum',
    defaultValue: '',
    values: ['', 'hide', 'moveleft'],
    valueLabels: ['оставить как есть', 'скрыть', 'переместить ближе к столбцу сообщений'],
    description: ''
  },
  apply_context_menu: {
    label: 'Использовать контекстное меню по ПКМ',
    type: 'boolean',
    defaultValue: true,
    description:
      'Включение/отключение контекстного меню в ленте сообщений по правой кнопке мыши'
  },
  privat_mail_type: {
    label: 'Тип меню "написать в личку"',
    type: 'enum',
    defaultValue: 'msg_menu',
    values: ['msg_menu', 'avatar_rkm'],
    valueLabels: ['в меню сообщения', 'ПКМ на аватаре'],
    description:
      'Способ вызова страницы "лички". При выборе "ПКМ на аватаре" переход в "личку" происходит в контекстном меню по ПКМ. Настройка игнорируется, если контекстное меню по ПКМ отключено.'
  },
  response_form: {
    label: 'Форма быстрого ответа (ФБО)',
    type: 'enum',
    defaultValue: 'always',
    values: ['always', 'toggle'],
    valueLabels: ['есть всегда', 'скрыть/отобразить по кнопке'],
    description:
      'В режиме "скрыть/отобразить по кнопке" не занимает место на экране в скрытом виде'
  },
  smilies_show_all: {
    label: 'Показывать все смайлики непосредственно на ФБО',
    type: 'enum',
    defaultValue: 'always',
    values: ['always', 'simple', ''],
    valueLabels: ['всегда', 'только для простой формы', 'нет'],
    description: 'Если выбрано "нет", используется стандартный функционал сайта'
  },
  smilies_text: {
    label: 'Показывать текстовый эквивалент смайлика',
    type: 'enum',
    defaultValue: 'title',
    values: ['bottom', 'title', ''],
    valueLabels: ['снизу', 'всплывающая подсказка', 'нет'],
    description: 'Настройка используется для включенного режима показа смайликов'
  },
  smilies_columns: {
    label: 'Кол-во столбцов при выводе смайликов на ФБО',
    type: 'enum',
    defaultValue: '2',
    values: ['2', '3', '4', '5'],
    valueLabels: ['2', '3', '4', '5'],
    description: 'Четыре или пять столбцов - скорее для широких мониторов'
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
