# Разработка

## Требования

- Node.js 22+
- npm 10+
- для Safari packaging: macOS + Xcode Command Line Tools

## Установка зависимостей

```bash
npm install
```

## Режим разработки

```bash
npm run dev
```

Дополнительные варианты:

```bash
npm run dev:firefox
npm run dev:edge
npm run dev:opera
```

## Основные команды

### Проверки

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
```

Это базовый цикл проверки перед коммитом и перед выпуском.

### Сборка

```bash
npm run build
```

Отдельные таргеты:

```bash
npm run build:chrome
npm run build:firefox
npm run build:edge
npm run build:opera
npm run build:safari
```

### Архивы для публикации

```bash
npm run zip
```

Отдельно:

```bash
npm run zip:chrome
npm run zip:firefox
npm run zip:edge
npm run zip:opera
```

## Работа с настройками

- схема настроек описана в `src/utils/settings/defaults.ts`;
- страница настроек живёт в `src/entrypoints/options/`;
- значения сохраняются в `browser.storage.local`.

Bundled defaults лежат в `public/config.json`.

## Теги и пользователи

Теги и привязка пользователей хранятся в `browser.storage.local`. Управление ими доступно в разделе **Tags & Users** на странице настроек:

- **Импорт** — принимает старый формат `groups.json` или новый нативный формат. Режим «добавить» или «заменить» выбирается галкой.
- **Экспорт** — сохраняет `tags-users.json` в нативном формате (`version: 1`, `tags`, `users`).

## Локальный запуск CI-проверок

Перед комитом и пушем можно локально запускать тот же набор проверок, что и в workflow `CI`.

Linux/macOS:

```bash
bash ./scripts/run-ci-checks.sh
```

Windows:

```bat
scripts\run-ci-checks.bat
```

Скрипт сам делает `npm ci`, затем запускает verify-набор (`lint`, `typecheck`, `test:unit`, `build`, `lint:firefox`). Если доступен диапазон коммитов, он дополнительно запускает `commitlint`.

## Где находится основная логика интерфейса

- page lifecycle и базовые helpers — `src/features/content-foundation/`;
- переработка ленты, цитаты, фильтр, context menu, FBO, smiles — `src/features/forum/`.

## Рекомендации по изменениям

1. выносить чистую логику в функции, пригодные для unit tests;
2. не дублировать browser-specific manifest-файлы;
3. не хранить store credentials в репозитории;
4. перед пушем предпочитать `scripts/run-ci-checks.sh` или `scripts\run-ci-checks.bat`, чтобы локально повторить CI.
