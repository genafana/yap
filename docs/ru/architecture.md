# Архитектура проекта

## Что это за проект

`browser-extention-yap` — кросс-браузерное WebExtension-расширение для переработки интерфейса YAP. Проект собирается из одного исходного дерева и выпускается для Chrome/Chromium, Edge, Opera, Firefox и Safari.

## Технологический стек

- **WXT** — сборка, генерация manifest, мультибраузерные таргеты.
- **TypeScript** — типизированный код расширения.
- **webextension-polyfill** — единый API поверх `chrome` / `browser`.
- **Vitest** — unit tests для переносимой логики.

## Главные каталоги

- `src/entrypoints/` — точки входа расширения:
  - `background.ts` — lifecycle расширения;
  - `yap-init.content/` — ранний `document_start` guard;
  - `yap.content/` — основной content runtime;
  - `options/` — страница настроек;
  - `popup/` — popup.
- `src/features/` — пользовательские фичи и page-runtime:
  - `content-foundation/` — lifecycle, page helpers, scroll/filter state;
  - `forum/` — визуальная переработка ленты, menu actions, FBO helpers, smiles.
- `src/utils/` — общие утилиты:
  - `settings/` — схема, нормализация и storage;
  - `groups.ts` — опциональная загрузка и инверсия групп пользователей;
  - `loose-json.ts` — парсинг нестрогого JSON;
  - `browser-api.ts` — браузерный polyfill bridge.
- `public/` — статические ресурсы расширения:
  - `config.json`

## Конфигурация и данные

### Настройки

Источник правды для настроек:

1. схема и типы в `src/utils/settings/defaults.ts`;
2. persisted settings в `browser.storage.local`;
3. bundled defaults в `public/config.json`.

При первом запуске проект:

1. читает bundled config;
2. при наличии мигрирует legacy-настройки;
3. нормализует значения;
4. сохраняет документ настроек в extension storage.

### Группы пользователей

Если в каталоге расширения присутствует `groups.json`, он загружается как ресурс расширения и превращается в lookup вида:

- пользователь;
- имя группы;
- `ignore`;
- `color`.

Если `groups.json` отсутствует, используется пустой lookup. Этот lookup применяется при трансформации ленты.

## Контентный runtime

Жизненный цикл страницы разделён на два этапа:

1. `yap-init.content` на `document_start` ставит visibility guard, чтобы не показывать неготовую разметку.
2. `yap.content` на `document_end`:
   - инициализирует настройки;
   - загружает группы пользователей;
   - восстанавливает page-state;
   - трансформирует сообщения;
   - подключает context menu, фильтр, FBO helpers и smiles;
   - помечает документ как `plugin-ready`.

## Manifest strategy

Проект использует **один исходный manifest** в `wxt.config.ts`.

Браузерные различия обрабатываются через:

- `targetBrowsers`;
- browser-specific sections (`browser_specific_settings.gecko`);
- отдельные build/zip команды, а не через ручное поддержание нескольких manifest-файлов.

## Почему Safari выделен отдельно

Safari использует тот же исходный код расширения, но packaging и publication идут через Apple tooling. Поэтому сборка есть в общем pipeline, а публикация и подпись выполняются через Xcode / App Store Connect.
