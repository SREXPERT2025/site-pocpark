# РОСПАРК — техническая архитектура сайта

Статус: рабочая документация v2
Дата актуализации: 2026-07-23
Проект: `rospark-frontend`
Production release: `881ff3cf846ae270042ccf5f55e281d98b124145`

## Назначение

Документ описывает фактическую архитектуру коммерческого сайта и Demo Release
v1. Текущее production-состояние хранится отдельно:

`docs/production/PRODUCTION_STATE_2026_07_23.md`.

Текущий план развития:

`docs/site/SITE_DEVELOPMENT_ROADMAP_20260723.md`.

## Стек

- Next.js 14.2.35;
- App Router;
- React 18;
- TypeScript;
- Tailwind CSS;
- Node.js 22;
- SQLite / `better-sqlite3`;
- PM2 как process manager;
- Nginx как production reverse proxy;
- GitHub как источник release-кода.

Next.js 14.2.35 является текущим production-фактом, а не целевой версией.
Обновление зависимостей вынесено в отдельный `SECURITY-RELEASE-2`.

## Архитектурные контуры

### 1. Публичный коммерческий сайт

Содержит:

- главную страницу;
- решения по ролям и типам объектов;
- каталог оборудования;
- кейсы;
- возможности;
- статьи;
- контакты и юридические документы;
- формы и квиз;
- индексируемый demo-хаб.

Основная задача контура — объяснить предложение, подтвердить компетенцию,
провести посетителя к demo или заявке.

### 2. Контентный контур

Markdown хранится в `content/`. `lib/content-parser.ts` отвечает за чтение,
нормализацию и publication gate.

Публичный материал должен:

- не иметь `status: draft`;
- иметь подтверждённые metadata;
- не содержать неподтверждённых цен, сроков, кейсов и интеграций;
- проходить preview и SEO/GEO QA.

Draft-файлы сохраняются, но не публикуются.

### 3. Lead-контур

Основной endpoint — `/api/lead`.

Контракт:

- строгое `consent: true`;
- имя и корректный российский телефон;
- honeypot;
- source/intent/product/package/source URL;
- UTM/yclid/gclid;
- частичный успех: заявка успешна, если доставлена минимум в один настроенный
  канал;
- Email, Telegram и внутренний MAX — каналы уведомления, а не источник истины.

Операционный источник истины и SLA должны быть определены отдельно.
Фактический разрыв между основным lead endpoint и demo feedback, варианты
реестра и требуемые решения зафиксированы в
`docs/site/LEAD_OPS_002_DECISION_20260724.md`.

### 4. Demo-контур

Demo Release v1 — серверное приложение внутри того же Next.js checkout.

Состав:

- cookie session;
- гостевые заявки;
- публичные token-ссылки;
- QR;
- парковочные сессии;
- оплата парковки гостей;
- historical/current owner reporting;
- feedback consent;
- SQLite migrations;
- MAX/share integration.

Demo не управляет реальным шлагбаумом, не выполняет реальные списания и не
является production-контроллером парковки.

### 5. AI-виджет

AI-виджет пока не входит в production-архитектуру сайта.

План:

`docs/site/AI_WIDGET_ROADMAP_20260723.md`.

Публичный AI должен работать только через отдельный restricted gateway и не
получать доступ к OpenClaw `main`, терминалу, файлам, браузеру, Codex или
оборудованию.

## Основные директории

| Директория | Назначение |
|---|---|
| `app/` | Next.js routes и UI |
| `app/(narrow)/` | Основные страницы с общим layout |
| `app/api/` | Lead и demo API |
| `app/components/` | Layout, формы, контент, demo |
| `app/lib/` | Client/server domain helpers |
| `content/` | Markdown-контент |
| `lib/` | Общий parser и lead logic |
| `public/` | Активные и master assets |
| `scripts/` | Изолированные demo-smoke тесты |
| `docs/` | Архитектура, roadmap, runbooks и production state |

## SQLite

### Схема

Миграции создаются приложением и фиксируются в
`demo_schema_migrations`.

Текущие версии:

```text
1|baseline_guest_requests
2|tenant_parking_discount_foundation
3|demo_feedback_leads
```

### Текущий production-путь

```text
/var/www/rospark-site/.data/guest-requests.sqlite
```

### Целевой production-путь

```text
/var/lib/rospark-demo/guest-requests.sqlite
```

Перенос ещё не выполнен. Нельзя удалять или копировать работающую базу без учёта
WAL/SHM. Backup выполняется через SQLite `.backup`, затем проверяются:

```text
PRAGMA integrity_check;
PRAGMA foreign_key_check;
```

## Session и data boundaries

- пользовательские demo-записи изолированы по cookie session;
- public token открывает только безопасную карточку;
- телефон не возвращается на public token page;
- owner DTO не должен содержать phone, session ID и public token;
- пользовательские demo-записи имеют ограниченный срок жизни;
- consented feedback lead хранится отдельно и идемпотентно;
- аналитика не должна содержать PII.

## Индексация

Индексируются:

- коммерческие страницы;
- статьи, кейсы и оборудование;
- `/demo` как объясняющий коммерческий хаб.

Не индексируются:

- `/quiz`;
- внутренние demo-кабинеты;
- public token pages;
- API;
- draft content.

Robots/sitemap не заменяют page-level `noindex` для приватных страниц.

## Production runtime

Подтверждённые свойства:

- Linux/VPS;
- Node.js 22;
- PM2;
- Nginx;
- release branch и exact SHA.

Имя PM2-процесса, порт, пользователь, env-файл и restart-команда всегда
проверяются read-only на VPS перед действием. Их нельзя брать из старых
Windows/demoserver-документов или предполагать.

## Node.js и нативные зависимости

`better-sqlite3` зависит от Node ABI.

Правила:

- major Node должен совпадать с `.nvmrc` и `engines`;
- `npm ci`, build и runtime выполняются под одной версией Node;
- после смены Node проверить загрузку `better-sqlite3`;
- ошибка ABI не маскируется изменением application code;
- Node.js 26 не является поддерживаемым runtime этого release.

## Security boundary

Нельзя без отдельного выпуска:

- обновлять Next.js в production;
- менять Nginx, DNS, SSL, PM2 или порт;
- переносить SQLite;
- включать новые внешние интеграции;
- менять секреты;
- давать AI-виджету доступ к внутренним инструментам;
- расширять demo до реального управления оборудованием.

Текущие dependency findings обрабатываются отдельным Security Release 2.

## Проверки

Минимум перед commit:

```bash
npm run typecheck
npm run lint
npm run build
git diff --check
```

При изменении demo:

- отдельная SQLite в `/private/tmp`;
- production preview под Node.js 22;
- Stage B и Stage C server tests;
- desktop/mobile/a11y;
- noindex/sitemap;
- session/PII isolation.

При изменении lead:

- не выполнять реальную отправку без подтверждения;
- проверить payload и consent локально;
- отдельно проверить каждый production delivery channel в согласованное окно.

## Release protocol

1. Зафиксировать approved branch и exact SHA.
2. Проверить чистое production-дерево.
3. Проверить Node 22, npm, process manager, port, user и env.
4. Создать backup env и SQLite.
5. Выполнить `npm ci`, typecheck, lint и build.
6. Проверить нативный SQLite-модуль.
7. Выполнить согласованный restart.
8. Проверить миграции и integrity.
9. Выполнить полный commercial/demo smoke.
10. Проверить логи.
11. Зафиксировать production state и rollback.

Ни один пункт не даёт автоматического разрешения на deploy.
