# Релиз, подписи и публикация

## Общий принцип

Для Chrome/Chromium, Edge, Opera и Firefox используется один WebExtension-код и отдельные store-пакеты. Для Safari используется отдельный packaging/signing flow через Apple tooling.

## Подготовка релиза

1. Обновить версию в `wxt.config.ts`.
2. Прогнать:

   ```bash
   npm run typecheck
   npm run test:unit
   npm run build
   npm run zip
   ```

3. Проверить содержимое `.output/`.

## Chrome Web Store

### Первый выпуск

1. Зарегистрироваться в Chrome Web Store Developer Dashboard.
2. Создать карточку расширения вручную.
3. Собрать пакет:

   ```bash
   npm run zip:chrome
   ```

4. Загрузить ZIP в store.

### Что дальше автоматизировать

После создания первой карточки:

```bash
npm run submit:init
```

Локально появится `.env.submit`, который нужно заполнить store credentials и **не коммитить**.

## Microsoft Edge Add-ons

1. Зарегистрироваться в Partner Center.
2. Создать listing.
3. Подготовить пакет:

   ```bash
   npm run zip:edge
   ```

4. Загрузить ZIP в Edge Add-ons.

## Opera Add-ons

1. Зарегистрироваться в Opera Add-ons developer portal.
2. Создать listing.
3. Подготовить пакет:

   ```bash
   npm run zip:opera
   ```

4. Отправить ZIP на review.

## Firefox / AMO

### Production publication

1. Зарегистрироваться на addons.mozilla.org.
2. Создать listing.
3. Подготовить пакет:

   ```bash
   npm run zip:firefox
   ```

4. Для review также используется source archive, который собирает WXT.

### Подпись

Для постоянной установки в обычном Firefox production-пакет должен быть подписан через AMO.

### Локальная разработка

- Firefox Developer Edition / Nightly / ESR могут использовать developer flows;
- обычный Firefox удобнее использовать через временную загрузку в `about:debugging`.

## Safari

Safari не публикуется через WXT автоматически. Правильный процесс такой:

1. Вступить в **Apple Developer Program**.
2. Собрать Safari-target:

   ```bash
   npm run build:safari
   ```

3. На macOS выполнить:

   ```bash
   npm run package:safari
   ```

4. Дальше открыть проект в Xcode, настроить:
   - Team;
   - Bundle Identifier;
   - Signing;
   - entitlements / capabilities при необходимости.
5. Выполнить archive и distribution через Xcode / App Store Connect.

## Где хранить секреты

Никогда не хранить store secrets в git.

Использовать один из вариантов:

- локальный `.env.submit`;
- GitHub Actions secrets;
- organization-level secrets.

## Рекомендуемый порядок настройки подписей

1. Создать карточки расширения во всех store вручную.
2. Выполнить `npm run submit:init`.
3. Заполнить локальный `.env.submit`.
4. Продублировать значения в CI secrets.
5. Проверить automation на тестовом обновлении.
