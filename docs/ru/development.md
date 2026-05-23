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

## Работа с группами пользователей

`groups.json` больше не входит в дистрибутив по умолчанию.

Если рядом с установленным unpacked-расширением есть файл `groups.json`, runtime загрузит его как обычный JSON-документ. Если файла нет, расширение продолжит работать без пользовательских групп.

## Где находится основная логика интерфейса

- page lifecycle и базовые helpers — `src/features/content-foundation/`;
- переработка ленты, цитаты, фильтр, context menu, FBO, smiles — `src/features/forum/`.

## Рекомендации по изменениям

1. выносить чистую логику в функции, пригодные для unit tests;
2. не дублировать browser-specific manifest-файлы;
3. не хранить store credentials в репозитории;
4. проверять изменения минимум через `lint`, `typecheck`, `test:unit`, `build`.
