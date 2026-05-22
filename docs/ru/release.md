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

## GitHub Actions в репозитории

Сейчас release automation в репозитории разделена на два уровня:

- `ci.yml` — проверка кода на каждом push / pull request;
- `release-artifacts.yml` — сборка релизных ZIP-артефактов и создание draft release по тегам `v*`;
- `submit-stores.yml` — submit в Chrome / Firefox / Edge через store APIs.

### Как запускается release

#### Автоматически

- push тега вида `v1.2.3`:
  - собирает артефакты;
  - создаёт draft release;
  - запускает submit в Chrome / Firefox / Edge.

#### Вручную

`submit-stores.yml` можно запускать через `workflow_dispatch`:

- `target`: `all`, `chrome`, `firefox`, `edge`
- `dry_run`: `true/false`

Это удобно для:

- проверки credentials;
- ручной переотправки;
- первого тестирования automation без публикации.

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

Для GitHub Actions понадобятся environment secrets:

- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`

## Microsoft Edge Add-ons

1. Зарегистрироваться в Partner Center.
2. Создать listing.
3. Подготовить пакет:

   ```bash
   npm run zip:edge
   ```

4. Загрузить ZIP в Edge Add-ons.

Для GitHub Actions понадобятся:

- `EDGE_PRODUCT_ID`
- `EDGE_CLIENT_ID`
- `EDGE_API_KEY`

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

Для GitHub Actions понадобятся:

- `FIREFOX_EXTENSION_ID`
- `FIREFOX_JWT_ISSUER`
- `FIREFOX_JWT_SECRET`

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

### Статус Safari в текущем проекте

Safari сейчас **не входит** в автоматический submit pipeline.

Это сознательное ограничение:

- WXT не поддерживает automated Safari publishing;
- Safari требует Apple-specific packaging/signing flow;
- для полного CI/CD нужен отдельный macOS workflow с Xcode / App Store Connect tooling.

То есть Safari сейчас — **TODO / manual lane**.

## Где хранить секреты

Никогда не хранить store secrets в git.

Использовать один из вариантов:

- локальный `.env.submit`;
- GitHub Actions secrets;
- organization-level secrets.

### Рекомендуемая схема в GitHub

Создать environments:

- `chrome-store`
- `firefox-store`
- `edge-store`

И класть store credentials именно туда.

Плюсы:

- изоляция production secrets;
- возможность approval перед submit;
- более понятный audit trail.

## Рекомендуемый порядок настройки подписей

1. Создать карточки расширения во всех store вручную.
2. Выполнить `npm run submit:init`.
3. Заполнить локальный `.env.submit`.
4. Продублировать значения в CI secrets.
5. Проверить automation на тестовом обновлении.

## Минимальный production-ready порядок действий

1. вручную создать listing в Chrome / Edge / AMO;
2. получить credentials;
3. создать GitHub environments и secrets;
4. запустить `submit-stores.yml` в `dry_run=true`;
5. выпустить тег `v*` и проверить draft release + submit jobs.
