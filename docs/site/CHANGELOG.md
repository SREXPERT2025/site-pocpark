# РОСПАРК — журнал изменений сайта

Статус: рабочая документация v1  
Дата создания: 2026-05-03

## Назначение

Этот файл фиксирует крупные изменения сайта человеческим языком. Он не заменяет git, но помогает быстро понять историю развития проекта.

## 2026-07-27 — документационный пакет `AI-WIDGET-0`

- добавлен ограниченный профиль закрытого агента и изолированный
  `cascade v3` adapter поверх проверенного test-only движка;
- adapter разрешает только loopback Ollama и `Qwen3.6-27B`, запрещает запись
  результатов в рабочий `POCPARK_AI` и не включает MAX, production registry
  или OpenClaw `main`;
- короткий прогон из 15 сценариев прошёл 15/15, включая цену, совместимость,
  заявки с именем и без имени, prompt injection, чужие данные и ложный
  handoff; внешних отправок — 0;
- добавлен машинно-читаемый validation-отчёт с актуальными именами полей;
- корпоративные факты направлены в точные FAQ-шаблоны без раскрытия внутренних
  источников и служебных статусов;
- создан allowlist актуальных источников `widget-kb-v1`;
- подготовлен FAQ-кандидат: 26 ответов, шесть границ знаний, lead и security
  templates;
- создан claim ledger из 37 утверждений со статусами `ALLOW`, `CONDITIONAL`,
  `OWNER_REVIEW` и `DENY`;
- отделены справочный диалог, обезличенная аналитика и consent flow лида;
- директор подтвердил собственную разработку и производство, работу с
  парковками с 2010 года и более 350 реализованных объектов;
- имя обязательно только при передаче реального обращения; для справочного
  диалога представляться не требуется;
- цены отдельных элементов в виджете не публикуются;
- подтверждены retention и закрытый пилот на Mac Studio;
- runtime, модель, widget UI, production lead registry, MAX и VPS не
  изменялись;
- следующий gate — полный `cascade v3` прогон 230 сообщений и ручной QA.

## 2026-07-25 — production-входы в demo/quiz `ANALYTICS-001-C`

- production fast-forward:
  `26740a5a0fe485b6ff3427283f3461d4dddd22ba` →
  `89c045d79535169527347c40c438971fb560995d`;
- backup:
  `/root/rospark-backups/analytics-funnel-20260725T125007Z`;
- production build ID: `bYt3AjLTGWWnwnpg84KWl`;
- PM2 online, outbox и cleanup timers active, обе SQLite прошли
  `quick_check`;
- outbox `ready=0`, новых сообщений в MAX не отправлялось;
- создана восьмая ручная цель Метрики
  `Воронка — вход в demo/quiz`, ID `588884963`, event
  `rospark_funnel_entry`;
- на production выполнено по одному контролируемому переходу с
  `/resheniya/biznes-centry` в `/demo` и `/quiz?source=request`;
- формы не отправлялись, PII не создавались;
- после обработки отчёт новой цели зарегистрировал один целевой визит и
  четыре просмотра в нём; оба перехода выполнялись внутри одного визита,
  доставка цели подтверждена;
- rollback build сохранён:
  `/var/www/rospark-release-builds/next-26740a5-20260725T125007Z`.

## 2026-07-25 — production server-side сводка `ANALYTICS-001-C`

- production fast-forward:
  `61a4694bee55426e72bdfbb42008730c3cb2b444` →
  `26740a5a0fe485b6ff3427283f3461d4dddd22ba`;
- backup env, demo SQLite и lead registry:
  `/root/rospark-backups/analytics-server-summary-20260725T115320Z`;
- staging lead registry/admin/CLI tests, analytics privacy test, typecheck,
  lint и Node.js 22 production build прошли;
- production build ID: `hpgikJ4D38MvlFmCENRHP`;
- PM2 остаётся online, outbox и cleanup timers активны;
- обе SQLite прошли `quick_check`, foreign key errors отсутствуют;
- outbox не создавал новых отправок: `sent=1`, `ready=0`;
- внешний вход Андрея подтверждён;
- production-сводка показывает один закрытый TEST-лид, первый контакт за
  5 минут, `100%` соблюдения срока, один источник и ноль повторов;
- в агрегированном блоке отсутствуют имя, телефон и lead ID;
- admin не загружает Метрику и публичный layout; desktop/mobile overflow и
  browser console errors отсутствуют;
- rollback build сохранён:
  `/var/www/rospark-release-builds/next-61a4694`.

## 2026-07-24 — локальная server-side сводка `ANALYTICS-001-C`

- в закрытый реестр лидов добавлена агрегированная воронка
  `received → assigned → contacted → closed`;
- добавлены повторные submissions и разбивка по техническому источнику и
  pathname;
- добавлен расчёт первого контакта по рабочему графику пн–пт,
  `10:00–18:00 Europe/Moscow`, с целевым сроком один рабочий час;
- ожидающие заявки не ухудшают процент соблюдения срока до его истечения;
- API агрегатов не содержит имени, телефона, сообщения, lead ID и submission
  ID;
- серверные статусы не отправляются в Яндекс Метрику;
- `test:lead-admin`, lint, Node.js 22 build и локальный browser smoke пройдены;
- этот локальный этап позднее опубликован отдельным release от 2026-07-25.

## 2026-07-24 — production `LEAD-OPS-002 / L4`

- выполнен проверенный backup env, release state и demo SQLite:
  `/root/rospark-backups/lead-ops-l4-20260724T122213Z`;
- production fast-forward:
  `c2a0e955b8747e3005da28e3fe9981f01fa45488` →
  `61a4694bee55426e72bdfbb42008730c3cb2b444`;
- staging `npm ci`, три lead-теста, typecheck, lint и build прошли;
- создан отдельный registry
  `/var/lib/rospark-leads/lead-registry.sqlite`;
- `.env.production`, registry и каталог приведены к mode `600/600/700`;
- включены registry, защищённый admin и outbox processing;
- подтверждены персональные роли Андрея и Сергея;
- внешний desktop/mobile smoke подтвердил noindex, отсутствие Метрики,
  публичного layout, overflow и console errors;
- одна маркированная TEST-заявка доставлена в MAX ровно один раз;
- outbox завершён `sent`, `attempts=1`, `error=none`;
- workflow завершён
  `new → assigned(sergey) → contacted → closed(test)`;
- systemd outbox/cleanup timers установлены, активны и завершаются успешно;
- PM2 остаётся online, SQLite integrity и foreign keys проверены;
- TEST-лид и rollback build сохранены как acceptance evidence.

## 2026-07-24 — локальные L1–L3 `LEAD-OPS-002`

### Подтверждено

- основной `/api/lead` доставляет уведомления в Email / Telegram / MAX, но не
  сохраняет постоянный операционный реестр;
- demo feedback сохраняется consent-aware и idempotently на 30 дней, но не
  имеет outbox, назначения ответственного и status history;
- schema допускает `new | contacted | closed`, но roadmap требует также
  `assigned`;
- код не содержит status update для `demo_feedback_leads`;
- TTL cleanup выполняется только при следующей demo-операции;
- backup от 2026-07-23 содержал 7 технических/QA feedback leads; это не семь
  подтверждённых бизнес-лидов.

### Решение принято

Создан decision packet:
`docs/site/LEAD_OPS_002_DECISION_20260724.md`.

Директор подтвердил:

- отдельный registry на VPS, потому что интеграция существующей CRM пока не
  настроена;
- owner — директор;
- резервный ответственный — Сергей, РОП;
- рабочие часы — понедельник–пятница, `10:00–18:00` по Москве;
- первый контакт — в течение одного рабочего часа;
- основной канал — MAX-группа отдела продаж;
- Email будет резервным после настройки;
- обычный лид хранится 60 дней, demo feedback — 30 дней;
- повтор — тот же телефон в течение 24 часов от последней заявки при
  незакрытом лиде;
- результаты закрытия — обработан, нет связи, нецелевой, дубль, тест.
- Андрей имеет полный административный доступ, экспорт и исключительное ручное
  удаление;
- Сергей, РОП, может просматривать, обрабатывать и экспортировать лиды, но не
  удалять их и не получает VPS/SSH.

### Реализовано локально

- отдельный registry path вне Git checkout для будущего production;
- migration `lead_registry_foundation`;
- таблицы lead records, submissions и status events;
- hard idempotency по `submission_id`;
- привязка 24-часового повтора к открытому лиду;
- строгие переходы `new → assigned → contacted → closed`;
- outcomes и retention 60/30 дней;
- cascade cleanup;
- migration `lead_notification_outbox`;
- атомарная регистрация submission/lead/outbox;
- стабильный browser `submissionId` для безопасного повтора формы;
- feature-gated подключение основного и demo feedback API;
- MAX/Email worker с lease, retry/backoff и dead state;
- безопасные error codes без payload и provider details;
- защищённый `/admin/leads` с персональным входом;
- роли: Андрей `director`, Сергей `sales_head`;
- поиск, фильтры, сводка статусов/outbox и workflow
  `new → assigned → contacted → closed`;
- CSV export для обеих ролей с защитой от formula injection;
- ручное удаление только для директора с подтверждением ID и причины;
- append-only audit login/logout/list/export/status/delete без PII;
- HMAC-сессия, scrypt password hashes, same-origin и login rate-limit;
- `noindex`, `no-store`, запрет iframe и исключение Метрики из admin;
- целевые автоматические и browser/API smoke без внешних сообщений.

Оба feature gate выключены, поэтому production-поведение не изменено и реальные
сообщения не отправлялись. Production SQLite, admin-учётные записи и worker не
создавались; L4 остаётся отдельным согласуемым этапом.

Изолированный localhost smoke с включённым registry и выключленным worker
подтвердил: первая заявка — `200 created:true`, точный повтор —
`200 created:false`, другой payload с тем же `submissionId` — `409`; в
SQLite остались ровно один lead, одна submission и один pending MAX outbox.
`PRAGMA quick_check` вернул `ok`, foreign key errors отсутствуют. Временная
тестовая база после проверки удалена.

L3 production-preview подтвердил:

- login без Origin — `403`, login Андрея и Сергея — `200`;
- list и CSV — `200`;
- назначение, первый контакт и закрытие — `200`;
- удаление Сергеем — `403`, удаление Андреем — `200`;
- audit сохранил delete event после cascade удаления лида;
- desktop и mobile 390 px — без горизонтального переполнения;
- browser console — без ошибок;
- Метрика, публичные header/footer и cookie banner в admin отсутствуют;
- production build под Node.js 22 сформировал 103 статические страницы и
  динамические admin routes.

В ходе smoke исправлены две ошибки до коммита:

- same-origin теперь учитывает фактический `Host` и `X-Forwarded-Proto` за
  reverse proxy;
- GET list/export явно помечены `force-dynamic`, чтобы feature gate не
  фиксировался в `404` во время build.

### Подготовлен ops-пакет L4

- worker и cleanup явно загружают `.env.production`;
- retention cleanup вынесена в отдельную one-shot команду и не зависит от
  доступности MAX;
- env configurator меняет только allowlisted lead-ключи, создаёт backup,
  устраняет дубли, пишет атомарно и не выводит секреты;
- systemd templates запускают worker раз в минуту и cleanup ежедневно;
- общий `flock` исключает гонку cleanup с сетевой outbox-попыткой;
- автоматический CLI smoke проверяет production env loading, mode `700/600`,
  migrations `1–3`, `quick_check`, пустой no-send worker и безопасное
  обновление env;
- staged release, acceptance и rollback записаны в
  `docs/production/LEAD_OPS_L4_RUNBOOK_20260724.md`.

Read-only VPS preflight выполнен 2026-07-24:

- production остаётся на
  `c2a0e955b8747e3005da28e3fe9981f01fa45488`,
  branch `release/demo-production-ready-20260723`;
- PM2 `rospark-site` online, Node.js `22.23.1`;
- `sqlite3`, `flock`, MAX lead token/chat и `32G` свободного места доступны;
- новый registry и systemd units ещё не созданы;
- `.env.production` пока mode `644`; L4 configurator должен атомарно привести
  его к `600`.

VPS, release-ветка, PM2, `.env.production`, SQLite, systemd и MAX при preflight
не изменялись. Следующий шаг — отдельное подтверждение maintenance window,
backup и staged L4.

## 2026-07-24 — первый growth dashboard и изоляция QA-аналитики

### Подтверждено в кабинетах

- Google sitemap — успешно, 75 страниц, 0 видео;
- Google index coverage ещё обрабатывается;
- Яндекс Вебмастер — 0 ошибок, 3 рекомендации, 0 кликов, свежих данных обхода
  ещё нет;
- Метрика — 1 целевой визит и 11 достижений цели открытия сценария;
- event parameters — 23 отправки, включая
  `demo_name = guest_request_portal`.

### Исправлено и опубликовано

- выявлено, что 10 QA-событий с `127.0.0.1:3210` попали в production-счётчик;
- loader Метрики ограничен production-host
  `www.xn--80aukedde.xn--p1ai`;
- локальная сборка продолжает формировать privacy-safe `dataLayer`, но не
  загружает `tag.js` и не отправляет данные во внешний счётчик;
- browser smoke подтвердил 0 запросов к `mc.yandex.ru` на localhost.

### Release

```text
c2a0e955b8747e3005da28e3fe9981f01fa45488
release/demo-production-ready-20260723
```

- backup env и состояния release:
  `/root/rospark-backups/analytics-host-guard-20260724T070217Z`;
- fast-forward выполнен с
  `80d64da4b2cdd3b6af7f837709722db66702930d`;
- SQLite, Nginx, DNS, MAX, WhatsApp и зависимости не изменялись.

### Проверка

- privacy smoke — пройден;
- typecheck и lint — пройдены;
- production build на Node.js 22 — пройден, 100 маршрутов;
- PM2 `rospark-site` после restart — `online`;
- `/`, `/demo`, `/demo/gostevaya-zayavka` — `200`;
- `/api/demo/requests` без сессии — `401`;
- внешний smoke подтвердил публичную demo-страницу и
  `tag.js?id=110980303`;
- browser console — без ошибок.

### Dashboard

Создан первый технический baseline:
`docs/site/GROWTH_DASHBOARD_20260724.md`. Текущие цели классифицированы как QA,
а не как реальная бизнес-конверсия.

## 2026-07-24 — цели Метрики и production reliability release

### Release

```text
80d64da4b2cdd3b6af7f837709722db66702930d
release/demo-production-ready-20260723
```

### Что настроено в Метрике

- в production-счётчике `110980303` создано семь целей;
- целями покрыты `/demo`, открытие сценария, создание гостевой заявки,
  завершение попытки оплаты, детализация владельца, результат feedback-лида и
  успешная отправка формы;
- публичный SPA-переход подтвердил отправку
  `rospark_demo_scenario_view` с `demo_name` без PII;
- полный реестр записан в `docs/site/ANALYTICS_GOALS_20260724.md`.

### Что опубликовано

- privacy-safe событие записывается в `dataLayer` до browser event;
- очередь `rospark_*` воспроизводится после подключения слушателя Метрики;
- повторная обработка объекта и одинаковые события одного render transition
  не создают дубль цели;
- hard load и SPA-переход проверены отдельно: по одной отправке
  `rospark_demo_scenario_view`.

### Проверка

- `npm run typecheck` под Node.js 22 — пройден;
- `npm run lint` — пройден без предупреждений и ошибок;
- production build на Node.js 22 — пройден, сгенерированы 100 маршрутов;
- `node scripts/test_analytics_privacy.mjs` — пройден;
- browser network smoke hard load / SPA — `1 / 1`, без дублей.
- PM2 `rospark-site` после restart — `online`;
- `/`, `/demo` и `/demo/gostevaya-zayavka` — `200`;
- `/api/demo/requests` без сессии — `401`;
- browser console — без ошибок и предупреждений.

### Backup и границы

- backup env и состояния release:
  `/root/rospark-backups/analytics-goals-20260724T051826Z`;
- SQLite, Nginx, DNS, MAX, WhatsApp, Node.js и зависимости не изменялись;
- `npm ci` повторно показал 13 известных audit findings
  (`1 moderate`, `12 high`); автоматическое исправление не запускалось,
  `SECURITY-RELEASE-2` остаётся последним этапом roadmap.

## 2026-07-24 — production release аналитики и demo-growth

### Release

```text
9ae9579c63dc8c3c7af96a1e46d87ee0081b56da
release/demo-production-ready-20260723
```

### Что опубликовано

- прямой consent-gated loader Яндекс Метрики `110980303`;
- privacy-safe pageview и demo/form events через `reachGoal` без PII;
- постоянная кнопка повторного открытия cookie-настроек;
- metadata и self-canonical юридических страниц;
- контекстные входы в три demo-сценария со страницы бизнес-центров и
  релевантных возможностей.

### Production-проверка

- backup:
  `/root/rospark-backups/analytics-release-20260724T043201Z`;
- checksum и `PRAGMA quick_check` online backup — успешно;
- `npm ci`, typecheck, lint и production build — успешно;
- сгенерированы 100 маршрутов;
- PM2 `rospark-site` после restart — `online`;
- локальный и публичный HTTP smoke — успешно;
- `/api/demo/requests` без сессии — `401`;
- SQLite после restart — `quick_check=ok`, migrations `1–3`;
- до согласия ресурсы `mc.yandex.ru` отсутствуют;
- после согласия загружен `tag.js?id=110980303` и отправлен pageview;
- после отказа и reload ресурсы Метрики отсутствуют;
- новый demo-callout подтверждён на публичной странице бизнес-центров;
- browser console — без ошибок и предупреждений.

### Не изменялось

SQLite осталась по текущему пути внутри checkout. MAX, WhatsApp, Nginx, DNS,
Node.js, Next.js и зависимости не изменялись. `PROD-DATA-OPS` остаётся
отложенным, `SECURITY-RELEASE-2` — последним этапом roadmap.

### Контрольный SEO-срез

- Google Search Console обработал sitemap со статусом «Успешно»;
- обнаружено 75 страниц и 0 видео;
- отчёт индексирования Google ещё формируется;
- Яндекс сохраняет sitemap в очереди на обработку;
- в Яндексе пока 0 добавленных, 0 удалённых и нет свежих изменений
  индексирования.

## 2026-07-23 — локальная коммерческая упаковка demo

### Что изменено

- создан единый контекстный блок с тремя demo-сценариями;
- блок добавлен на страницу решения для бизнес-центров;
- блок добавлен на страницы возможностей для арендаторов, гостей и
  онлайн-оплаты;
- подготовлен внутренний сценарий коммерческого показа на 5–8 минут;
- roadmap дополнен статусом `DEMO-GROWTH-001`.

### Не изменялось

Demo API, формы, персональные данные, sitemap, robots, metadata, аналитика,
production, VPS, Nginx, Caddy, SQLite и зависимости не изменялись.

### Рабочая ветка

```text
feature/site-20260723-demo-growth-entry
```

### Локальная проверка

- `npm run typecheck` под Node.js 22 — пройден;
- `npm run lint` — пройден без предупреждений и ошибок;
- `npm run build` — пройден, сгенерированы 100 маршрутов;
- desktop и 390 px browser smoke — пройдены без horizontal overflow;
- на четырёх целевых маршрутах подтверждены `/demo` и три scenario-ссылки;
- на контрольной странице постоянных клиентов callout отсутствует;
- browser console — без ошибок и предупреждений.

## 2026-07-23 — локальная analytics-основа

### Что изменено

- cookie banner и analytics dispatcher используют единый consent-helper;
- analytics-события работают только после `accepted` и fail-closed при отказе,
  отсутствии выбора или недоступном storage;
- `dataLayer` создаётся только после согласия и первого разрешённого события;
- payload строится из явного privacy allowlist;
- `source_page` очищается от query string и click identifiers;
- события добавлены для гостевых заявок, оплаты парковки и owner cabinet;
- добавлен воспроизводимый privacy smoke dispatcher;
- создан `docs/site/ANALYTICS_PLAN_20260723.md`.

### Дополнение `ANALYTICS-001-B`

- выбран прямой loader Яндекс Метрики без GTM/GA4;
- создан и подтверждён счётчик `110980303`;
- ID добавлен в `.env.example` как
  `NEXT_PUBLIC_YANDEX_METRIKA_ID=110980303`;
- loader не создаёт запросов до `accepted`;
- Webvisor, clickmap, e-commerce и передача title выключены;
- e-commerce и встроенный Yandex Tag Manager выключены в настройках счётчика;
- client-side pageview и privacy-safe события передаются через `hit` и
  `reachGoal`;
- в footer добавлена кнопка `Настройки cookie`;
- browser smoke подтвердил отсутствие скрипта до согласия, загрузку
  `tag.js?id=110980303` после согласия и отсутствие скрипта после отзыва и
  reload.

### Не изменялось

GTM, GA4, Webvisor, DNS, production, VPS, формы API, SQLite, персональные
данные и зависимости не изменялись.

### Рабочая ветка

```text
feature/site-20260723-analytics-foundation
```

### Локальная проверка

- `npm run typecheck` под Node.js 22 — пройден;
- `npm run lint` — пройден без предупреждений и ошибок;
- `npm run build` — пройден, сгенерированы 100 маршрутов;
- `node scripts/test_analytics_privacy.mjs` — пройден;
- browser smoke: decline сохраняется, события при отказе отсутствуют,
  demo-вход работает, ошибок console нет.

## 2026-07-23 — локальное исправление metadata юридических страниц

### Что изменено

- `/privacy` получил уникальные title, description и self-canonical;
- `/soglasie-na-obrabotku-personalnyh-dannyh` получил уникальные title,
  description и self-canonical;
- canonical формируется через общий `canonicalUrl(...)`;
- roadmap и SEO/GEO baseline дополнены локальным статусом
  `SEO-META-LEGAL-001`.

### Не изменялось

Юридический текст, sitemap, robots, формы, API, аналитика, DNS, поисковые
кабинеты, production, Nginx, Caddy, SQLite и зависимости не изменялись.

### Рабочая ветка

```text
fix/site-20260723-legal-metadata
```

### Затронутые файлы

```text
app/(narrow)/privacy/page.tsx
app/(narrow)/soglasie-na-obrabotku-personalnyh-dannyh/page.tsx
docs/site/SEO_GEO_BASELINE_20260723.md
docs/site/SITE_DEVELOPMENT_ROADMAP_20260723.md
docs/site/CHANGELOG.md
```

### Локальная проверка

- `npm run typecheck` под Node.js 22 — пройден;
- `npm run lint` — пройден без предупреждений и ошибок;
- `npm run build` — пройден, обе страницы статически сгенерированы;
- в сгенерированном HTML подтверждены уникальные title, description и
  self-canonical обеих страниц;
- canonical домена сериализован URL API в эквивалентной Punycode-форме
  `www.xn--80aukedde.xn--p1ai`.

## 2026-07-23 — публичный SEO/GEO baseline

### Что проверено

- выполнен read-only аудит публичного `robots.txt`, sitemap, canonical,
  metadata, H1, JSON-LD и границ индексации demo;
- sitemap содержит 75 уникальных URL на `www`, все 75 отвечают `200`;
- среди URL sitemap нет `noindex`, отсутствующих title/description, ошибок H1
  или страниц без JSON-LD;
- подтверждено, что `/demo` индексируем, а внутренние demo-сценарии и `/quiz`
  исключены из sitemap и закрыты `noindex`;
- выявлены две юридические страницы без собственных metadata/canonical;
- выявлена доступность HTTPS non-`www` с ответом `200` вместо постоянного
  redirect на `www`;
- подготовлен безопасный пакет сбора baseline из Google Search Console и
  Яндекс Вебмастера;
- в текущих авторизованных аккаунтах созданы Domain property Google и сайт
  Яндекс Вебмастера;
- Google/Yandex verification TXT добавлены через DNS REG.RU и подтверждены на
  авторитетных и публичных DNS resolver;
- Google Domain property успешно подтверждена;
- Яндекс не подтвердил конкретный `www`-host, потому что исходная TXT была
  размещена только на корне;
- отдельная Yandex TXT на `www` добавлена и подтверждена на авторитетных и
  публичных DNS resolver;
- права Яндекса успешно подтверждены, аккаунт получил роль «Владелец»;
- Google ещё обрабатывает данные; Яндекс не сформировал свежую статистику;
- в Яндексе нет текущих ошибок и массовых дублей, но видна legacy-история
  обхода 2024 года;
- проверенный sitemap отправлен в Google и Яндекс;
- Google подтвердил отправку и ожидает первое получение файла;
- Яндекс поставил файл в очередь на обработку со сроком до 1–2 недель;
- `SEO-SITEMAP-SUBMIT-001` завершён, следующий шаг — контрольный срез после
  обработки;
- roadmap и контентный backlog связаны с результатами baseline.

### Не изменялось

Код приложения, production, Nginx, DNS, metadata, sitemap, поисковые кабинеты,
аналитика, формы, SQLite и внешние каналы не изменялись.

### Затронутые документы

```text
docs/site/SEO_GEO_BASELINE_20260723.md
docs/site/SITE_DEVELOPMENT_ROADMAP_20260723.md
docs/site/CONTENT_SEO_GEO_BACKLOG_20260723.md
docs/site/CHANGELOG.md
```

## 2026-07-23 — read-only подготовка PROD-DATA-OPS

### Что изменено

- проведён локальный аудит SQLite-подключения, WAL, миграций и runtime;
- выполнен read-only VPS preflight без остановки процессов и изменений;
- подтверждены один writer в fork mode, Node.js 22, активные WAL/SHM, миграции
  `1–3`, целостность базы, row counts, место и целевой каталог;
- создан свежий online backup рабочей SQLite и текущего `.env.production`;
- checksum, миграции, целостность и агрегированные row counts backup проверены;
- подготовлен отдельный план переноса production SQLite из Git checkout;
- по решению владельца перенос отложен: исправная рабочая база остаётся на
  текущем пути, задача возвращается перед крупным production-изменением;
- следующим активным этапом roadmap назначен `SEO-OPS-001`;
- добавлены GO/NO-GO, агрегированная сверка таблиц, порядок backup/cutover,
  функциональный smoke и два режима rollback;
- roadmap и production-state связаны с новым планом.

### Не изменялось

Production, PM2, `.env.production`, SQLite, MAX, WhatsApp, Nginx, код приложения
и зависимости не изменялись. Maintenance window не выполнялось.

### Затронутые документы

```text
docs/production/PROD_DATA_OPS_PLAN_20260723.md
docs/production/PRODUCTION_STATE_2026_07_23.md
docs/site/SITE_DEVELOPMENT_ROADMAP_20260723.md
docs/site/CHANGELOG.md
```

## 2026-07-23 — сверка документации после Demo Release v1

### Что изменено

- создан актуальный roadmap развития сайта после production-выпуска demo;
- создан отдельный поэтапный план AI-виджета;
- структура и архитектура сайта сверены с текущими коммерческими, demo и API
  контурами;
- старые roadmap, improvement plan и SEO/GEO backlog помечены как исторические;
- создан новый контентный SEO/GEO backlog;
- production-state отделён от исходных предположений первого deploy-runbook;
- старые Windows demo-server инструкции и планы помечены как исторические;
- добавлен единый актуальный контекст для AI-ролей;
- зафиксированы следующие приоритеты: перенос SQLite, SEO/GEO baseline,
  аналитика, lead operations, коммерческая упаковка demo и AI-виджет;
- по решению владельца `SECURITY-RELEASE-2` перенесён на последний этап с
  сохранением условий его досрочного возврата.

### Не изменялось

Продуктовый код, production, зависимости, Caddy, Nginx, PM2, env, SQLite и
реальные каналы отправки не изменялись.

### Затронутые документы

```text
docs/site/SITE_DEVELOPMENT_ROADMAP_20260723.md
docs/site/AI_WIDGET_ROADMAP_20260723.md
docs/site/CONTENT_SEO_GEO_BACKLOG_20260723.md
docs/site/SITE_STRUCTURE.md
docs/site/ARCHITECTURE.md
docs/agents/CURRENT_PROJECT_CONTEXT_20260723.md
docs/agents/AI_TEAM_ORCHESTRATION.md
docs/agents/AI_TEAM.md
docs/agents/subagents/README.md
docs/agents/ROSPARK_SITE_ARCHITECT_GPT_INSTRUCTIONS.md
docs/agents/ROSPARK_SITE_ARCHITECT_WORKFLOW.md
docs/agents/ROSPARK_SITE_ARCHITECT_KNOWLEDGE_UPLOAD.md
docs/agents/ROSPARK_SITE_ARCHITECT_GPT_CARD.md
docs/agents/ROSPARK_SITE_ARCHITECT_START_PROMPTS.md
docs/agents/frontend-coder/ROSPARK_FRONTEND_CODER_KNOWLEDGE.md
docs/agents/ai-marketer/ROSPARK_AI_MARKETER_GPT.md
docs/site/SITE_DEVELOPMENT_ROADMAP_20260707.md
docs/site/IMPROVEMENT_PLAN_20260706.md
docs/site/ARTICLES_SEO_GEO_BACKLOG_20260706.md
docs/site/rospark_next_day_prod_plan.md
docs/production/PRODUCTION_STATE_2026_07_23.md
docs/deployment/AFTER_DEPLOY_GUEST_DEMO_MAX.md
docs/deployment/DEPLOY_DEMO_SERVER.md
docs/site/CHANGELOG.md
```

## 2026-06-08 — P0: cookie-баннер

Рабочая ветка:

```text
dev-p1-visible-copy-001
```

### Что изменено

Добавлен баннер уведомления об использовании cookie:

- создан клиентский компонент `app/components/legal/CookieBanner.tsx`;
- компонент подключён в `app/layout.tsx`;
- выбор пользователя сохраняется в `localStorage` с ключом `rospark_cookie_consent`;
- поддержаны значения `accepted` и `declined`;
- баннер скрывается после выбора и не появляется после обновления страницы;
- добавлена ссылка на `/privacy`;
- вёрстка сделана безопасной для мобильной ширины 360 px.

### Не трогалось

Формы, API, MAX, email, env, Header, MobileMenu, privacy-страницы и sitemap не изменялись.

### Затронутые файлы

```text
app/components/legal/CookieBanner.tsx
app/layout.tsx
docs/site/CHANGELOG.md
```


## 2026-06-08 — P0: документы по персональным данным

Рабочая ветка:

```text
dev-p1-visible-copy-001
```

### Что изменено

Добавлен юридический пакет по персональным данным перед production:

- созданы страницы `/privacy` и `/soglasie-na-obrabotku-personalnyh-dannyh`;
- тексты страниц перенесены из `legal/privacy.md` и `legal/personal-data-consent.md`;
- в `LeadForm` чекбокс согласия выключен по умолчанию и сбрасывается после успешной отправки;
- в `QuizForm` чекбокс согласия сбрасывается после успешной отправки;
- текст согласия в формах приведён к единой формулировке со ссылками на документы;
- из `QuizForm` убран текст про Telegram;
- ссылки на документы добавлены в Footer;
- страницы добавлены в sitemap.

### Проверка API

`app/api/lead/route.ts` проверен: заявка без `consent: true` возвращает ошибку 400.

`app/api/quiz/route.ts` не менялся: текущий `QuizForm` отправляет заявку через `/api/lead`.

### Затронутые файлы

```text
app/(narrow)/privacy/page.tsx
app/(narrow)/soglasie-na-obrabotku-personalnyh-dannyh/page.tsx
app/components/forms/LeadForm.tsx
app/components/forms/QuizForm.tsx
app/components/layout/Footer.tsx
app/sitemap.ts
docs/site/CHANGELOG.md
```

## 2026-05-07 — P0/P1 production-readiness: контакты, sitemap, CTA и визуальный контент

Рабочая ветка:

```text
dev-p1-visible-copy-001
```

Checkpoint:

```text
checkpoint-after-p0-demo-readiness-2026-05-07
checkpoint-after-p0-contacts-consistency-2026-05-07
checkpoint-after-p1-sitemap-skladskie-2026-05-07
checkpoint-after-p1-sravnenie-internal-link-2026-05-07
checkpoint-after-p1-content-and-images-2026-05-07
checkpoint-after-p1-comparison-cta-to-quiz-2026-05-07
checkpoint-after-p1-cta-destination-audit-2026-05-07
checkpoint-after-p1-cta-destination-audit-fix-2026-05-07
```

Итоговая стабильная точка:

```text
66ca3a3 fix(p1): correct business centers quiz source
```

### Что изменено

Выполнен безопасный production-readiness проход перед обновлением демо-сервера:

- убрана внутренняя служебная заметка из CTA на странице сравнения подходов;
- контактные email приведены к единой логике;
- складские комплексы добавлены в sitemap.xml;
- добавлена внутренняя ссылка на страницу сравнения подходов со страницы для руководителей;
- на странице `/vozmozhnosti` в карусель добавлены описания возможностей;
- обновлены изображения на главной странице;
- проведён аудит CTA, которые нерелевантно вели на `/contacts`;
- коммерческие CTA переведены на релевантные сценарии `/quiz?source=...`;
- удалены старые файлы-копии страниц `keysy`;
- исправлена опечатка `source=equest` → `source=request`.

### Контакты

Уточнена логика публичных email в `app/config/site.ts`:

```text
is@srexpert.su — основной публичный email для заявок;
rav@srexpert.su — email бухгалтерии для закрывающих документов.
```

Адрес `sales@rospark.ru` удалён из конфигурации, так как такой почты сейчас нет.

Затронутый файл:

```text
app/config/site.ts
```

### Sitemap

В sitemap добавлена существующая коммерческая страница:

```text
/resheniya/skladskie-kompleksy
```

Затронутый файл:

```text
app/sitemap.ts
```

### Страница сравнения подходов

CTA на странице `/resheniya/sravnenie-podhodov` переведены с общей страницы контактов на квиз:

```text
Запросить аудит / КП → /quiz?source=kp
Обсудить проект → /quiz?source=project
```

Затронутые файлы:

```text
app/(narrow)/resheniya/sravnenie-podhodov/components/CallToAction.tsx
app/(narrow)/resheniya/sravnenie-podhodov/components/ApproachCards.tsx
```

### Страница для руководителей

CTA `Получить расчёт` переведён на сценарий расчёта:

```text
/contacts → /quiz?source=price
```

Также добавлена ссылка на страницу сравнения подходов из CTA-блока.

Затронутый файл:

```text
app/(narrow)/resheniya/dlya-rukovoditeley/components/CallToAction.tsx
```

### Инженерная страница

CTA инженерной страницы переведены на релевантные сценарии квиза:

```text
Запросить тех. консультацию → /quiz?source=consult
Связаться с техподдержкой → /quiz?source=consult
Получить техническую консультацию → /quiz?source=consult
Запросить ТКП → /quiz?source=kp
```

Затронутые файлы:

```text
app/(narrow)/resheniya/dlya-inzhenerov/components/Hero.tsx
app/(narrow)/resheniya/dlya-inzhenerov/components/Documentation.tsx
app/(narrow)/resheniya/dlya-inzhenerov/components/Integration.tsx
app/(narrow)/resheniya/dlya-inzhenerov/components/CallToAction.tsx
```

### Страницы объектов

CTA на страницах типов объектов переведены с `/contacts` на квиз:

```text
/resheniya/torgovye-centry
/resheniya/zastroyschiki
/resheniya/biznes-centry
```

Используемые сценарии:

```text
/quiz?source=request
/quiz?source=consult
/quiz?source=price
```

Затронутые файлы:

```text
app/(narrow)/resheniya/torgovye-centry/page.tsx
app/(narrow)/resheniya/zastroyschiki/page.tsx
app/(narrow)/resheniya/biznes-centry/page.tsx
```

### Страница для службы безопасности

CTA переведены на квиз:

```text
Задать вопрос СБ → /quiz?source=consult
Запросить регламент и схемы → /quiz?source=request
```

Дополнительно исправлено окончание строки в `Hero.tsx` после случайного `^M`.

Затронутые файлы:

```text
app/(narrow)/resheniya/dlya-sluzhby-bezopasnosti/components/Hero.tsx
app/(narrow)/resheniya/dlya-sluzhby-bezopasnosti/components/CallToAction.tsx
```

### Кейсы и расширенный контент

CTA в карточках объектов переведён на квиз:

```text
Получить консультацию → /quiz?source=consult
```

В расширенном тексте для руководителей ссылка на расчёт переведена на:

```text
/quiz?source=price
```

Удалены старые файлы-копии:

```text
app/keysy/page.tsx — исходник
app/keysy/[slug]/page.tsx — копия
```

Затронутые файлы:

```text
app/keysy/page.tsx
app/keysy/[slug]/page.tsx
content/extended/resheniya/dlya-rukovoditeley.md
```

### Возможности и изображения

На странице `/vozmozhnosti` в карусель добавлены описания возможностей по материалам маркетолога.

Обновлены изображения на главной странице:

```text
app/components/FeaturesShowcase.tsx
app/components/landing/ObjectTypesSection.tsx
app/components/landing/RoleSelector.tsx
public/images/object-types/*
public/images/roles/*
```

### Что не трогалось

- `main`;
- формы и поля форм;
- `/api/lead`;
- `/api/quiz`;
- отправка заявок на почту, MAX и Telegram;
- переменные окружения;
- PM2/env;
- metadata;
- JSON-LD;
- FAQ;
- `ExtendedInfo`, кроме одной markdown-ссылки в `content/extended/resheniya/dlya-rukovoditeley.md`;
- структура маршрутов;
- мобильная сетка, кроме визуально проверенных изображений и карусели.

### Проверка

Выполнялись проверки:

```bash
npm run build
git diff --check
grep -RIn "/contacts" app components content config lib --exclude-dir=.next --exclude-dir=node_modules
grep -RIn "source=equest" app components content config lib --exclude-dir=.next --exclude-dir=node_modules
grep -RIn "/quiz?source=" app components content config lib --exclude-dir=.next --exclude-dir=node_modules
```

Итог:

- `npm run build`: успешно;
- `/contacts` остался только в допустимых местах: navigation, MobileMenu, BreadcrumbJsonLd, sitemap;
- `source=equest` не найден;
- коммерческие CTA ведут на релевантные сценарии `/quiz?source=...`;
- рабочая ветка `dev-p1-visible-copy-001` синхронизирована с origin;
- checkpoint после исправления создан и запушен.

### Риски / примечания

- демо-сервер ещё нужно обновить с ветки `dev-p1-visible-copy-001`;
- `main` пока не трогать;
- после обновления демо нужно проверить ключевые страницы и сценарии квиза;
- следующим отдельным этапом можно провести аудит самой страницы `/quiz`: как она отображает разные `source` и насколько заголовки соответствуют CTA.

## 2026-05-04 — P1 visible copy follow-up: смягчение рискованных обещаний

Рабочая ветка:

```text
dev-p1-visible-copy-001
```

Коммиты:

```text
7f83bac content(p1): soften risky claims in case pages
d49ee95 content(p1): refine Poklonka Place case wording
ef1c51d docs(agents): add AI assistant working materials
baf93b3 content(p1): soften equipment wording
9e55904 content(p1): soften solutions wording
9623b23 content(nav): clarify solutions menu wording
```

### Что изменено

Выполнен follow-up после P1 visible copy: смягчены рискованные обещания и русифицированы отдельные видимые формулировки в кейсах, карточках оборудования, страницах решений и меню.

### Кейсы

- смягчены рискованные формулировки в 6 кейсах;
- убраны абсолютные обещания вроде `100%`, `полностью исключили`, `мгновенно`, `ликвидированы`;
- удалён остаток англоязычного сокращения `ANPR` из видимого текста кейса;
- отдельно уточнён Poklonka Place: `идеальный клиентский опыт` и `очереди ликвидированы` заменены на более аккуратные формулировки.

Затронутые файлы:

```text
content/keysy/depo3vokzala.md
content/keysy/mosflim.md
content/keysy/odipark.md
content/keysy/petrovsky.md
content/keysy/poklonka-place.md
content/keysy/w-plaza.md
```

### Оборудование

- смягчены описания 9 карточек оборудования;
- `безопасные сценарии`, `надёжная механика`, `закрывает требования безопасности`, `повышает безопасность` заменены на более инженерные формулировки;
- технические термины в характеристиках не вычищались автоматически.

Затронутые файлы:

```text
content/oborudovanie/tablo-svobodnyh-mest-variant-8.md
content/oborudovanie/stoika-rospark-premium-enter.md
content/oborudovanie/stoika-rospark-premium-exit.md
content/oborudovanie/stoika-rospark-standart-enter.md
content/oborudovanie/stoika-rospark-standart-exit.md
content/oborudovanie/shlagbaum-rospark-3.md
content/oborudovanie/shlagbaum-rospark-4.md
content/oborudovanie/shlagbaum-rospark-6.md
content/oborudovanie/svetofor-2sek-200mm-analog.md
```

### Решения

- в видимых блоках страниц решений убраны `100%` и `SLA`;
- `100%` заменено на `Единый учёт`;
- `SLA` заменено на `регламент реакции поддержки`, `сроки реакции поддержки`, `условия сопровождения`;
- смягчены формулировки про невозможность обхода системы и `серые схемы`.

Затронутые файлы:

```text
app/(narrow)/resheniya/dlya-rukovoditeley/components/Metrics.tsx
app/(narrow)/resheniya/sravnenie-podhodov/components/ApproachCards.tsx
app/(narrow)/resheniya/sravnenie-podhodov/components/ComparisonTable.tsx
app/(narrow)/resheniya/sravnenie-podhodov/components/TcoSection.tsx
```

### Навигация

- в меню `Решения` заменены жаргонные термины;
- `антифрод` заменён на `контроль злоупотреблений`;
- `SLA охраны` заменено на `регламенты охраны`;
- `/resheniya/sravnenie-podhodov` в меню не добавлялся;
- `Header` и `MobileMenu` не менялись.

Затронутый файл:

```text
app/config/navigation.ts
```

### AI-агенты

- добавлены рабочие материалы AI-агентов: архитектор сайта, frontend-coder, маркетолог, технический редактор.

Затронутые файлы:

```text
docs/agents/*
```

### Что не трогалось

- `main`;
- URL и маршруты;
- формы и поля форм;
- `app/api/*`;
- `lib/leads.ts`;
- `lib/leads2.ts`;
- `metadata`;
- JSON-LD;
- FAQ;
- `ExtendedInfo`;
- `content/extended/*`;
- PM2/env;
- новые страницы;
- deploy.

### Проверка

- `npm run build`: успешно для content/nav/solutions follow-up задач;
- контрольные grep-проверки по утверждённым рискованным формулировкам выполнены;
- `git diff --check`: успешно после исправления форматирования в solutions follow-up.

### Риски / примечания

- `content/extended/*`, `metadata`, FAQ и JSON-LD не включались в эти правки и требуют отдельного SEO/GEO-review;
- `/resheniya/sravnenie-podhodov` пока остаётся вне меню;
- `main` не трогался, рабочее согласование продолжается в `dev-p1-visible-copy-001`.


## 2026-05-03 — стабилизация мобильной версии

Основной commit:

```text
545fb6c fix(mobile): stabilize responsive pages
```

Теги:

```text
checkpoint-after-mobile-pages-fix-2026-05-03
checkpoint-main-after-mobile-pages-fix-2026-05-03
```

### Что исправлено

- стабилизирована мобильная адаптация главной страницы;
- исправлены переполнения в шапке и меню;
- мобильное меню сделано прокручиваемым;
- исправлены карточки цен;
- исправлена секция возможностей;
- исправлены страницы решений:
  - `/resheniya/dlya-inzhenerov`;
  - `/resheniya/dlya-sluzhby-bezopasnosti`;
  - `/resheniya/torgovye-centry`;
  - `/resheniya/zastroyschiki`;
- исправлена страница `/vozmozhnosti`;
- исправлена карточка оборудования `/oborudovanie/terminal-oplati-rospark-standart`;
- исправлены карточки объектов, включая `/keysy/amaks-otel-kazan`;
- исправлена страница `/contacts`;
- исправлена форма заявки на мобильных экранах.

### Проверка

Локально выполнено:

```bash
npm run build
```

Сборка прошла успешно.

После деплоя демо-сервер проверен с мобильного устройства. Визуально всё работает корректно.

## 2026-05-04 — P0-русификация и мобильная стабилизация

Основной commit:

```text
ae5026b docs(content): document P0 Russian copy and mobile fixes
```

Рабочая ветка:

```text
dev-p0-ru-text-only-001
```

### Что изменено

- выполнена P0-русификация приоритетных страниц сайта;
- тексты приведены к более понятному русскому B2B-стилю;
- снижена доля лишних англицизмов и рекламного шума;
- сохранён инженерный тон: без чрезмерных обещаний и без упрощения смысла;
- выполнены мобильные исправления после русификации;
- обновлена документация по стилю в `docs/content/CONTENT_STYLE_GUIDE.md`;
- демо-сервер обновлён с ветки `dev-p0-ru-text-only-001`.

### Проверенные страницы

- `/`;
- `/contacts`;
- `/quiz`;
- `/keysy`;
- `/keysy/amaks-otel-kazan`;
- `/keysy/arktika`;
- `/resheniya/dlya-rukovoditeley`;
- `/resheniya/torgovye-centry`.

### Что не трогалось

- URL и маршруты;
- формы и поля форм;
- `/api/lead`;
- `/api/quiz`;
- отправка заявок на почту, Telegram и MAX;
- `metadata`;
- JSON-LD;
- FAQ;
- `ExtendedInfo`;
- PM2/env;
- структура каталога оборудования;
- структура карточек объектов.

### Проверка

- `npm run build`: успешно;
- демо-сервер обновлён;
- проверка с телефона пройдена успешно;
- критичных горизонтальных выездов не обнаружено;
- главная, страница для руководителей, квиз и страницы объектов отображаются корректно.

### Риски / примечания

- P0 закрыт на уровне архитектуры;
- дальнейшие текстовые и SEO/GEO-правки вынесены в отдельный этап P1;
- новые визуальные замечания после P0 должны оформляться отдельными follow-up задачами.

## 2026-05-04 — P1 visible copy: коммерческие тексты

Основной commit:

```text
756fec9 content(p1): apply visible commercial copy updates
```

Рабочая ветка:

```text
dev-p1-visible-copy-001
```

Checkpoint:

```text
checkpoint-after-dev-p1-visible-copy-001
```

### Что изменено

- внедрены P1-редакторские правки видимых коммерческих текстов;
- усилена ясность офферов на ключевых страницах;
- тексты стали ближе к русскому инженерному B2B-стилю;
- смягчены рискованные обещания по доходности, срокам, стоимости и эффекту;
- усилена объектная польза: контроль, доступ, оплата, отчётность, сопровождение;
- уточнены формулировки для страниц решений, оборудования, объектов, контактов и квиза.

### Затронутые страницы

- `/`;
- `/oborudovanie`;
- `/keysy`;
- `/keysy/[slug]`;
- `/contacts`;
- `/quiz`;
- `/resheniya/dlya-rukovoditeley`;
- `/resheniya/torgovye-centry`;
- `/resheniya/biznes-centry`;
- `/resheniya/zastroyschiki`;
- `/resheniya/dlya-inzhenerov`;
- `/resheniya/dlya-sluzhby-bezopasnosti`.

### Что не трогалось

- URL и маршруты;
- формы и поля форм;
- `/api/lead`;
- `/api/quiz`;
- `metadata`;
- JSON-LD;
- FAQ;
- `ExtendedInfo`;
- PM2/env;
- новые страницы;
- новые разделы.

### Проверка

- `npm run build`: успешно;
- `npm run start`: успешно;
- ветка `dev-p1-visible-copy-001` запушена;
- страницы локально открываются.

### Риски / примечания

- после внедрения текстов были замечены визуальные хвосты по переносам, тяжёлым заголовкам и блокам заявок;
- визуальные правки вынесены в отдельный layout-follow-up, чтобы не смешивать текстовый этап и полировку.

## 2026-05-04 — P1 layout follow-up после текстовых правок

Основной commit:

```text
7fc4009 fix(p1): polish visible copy layout followup
```

Checkpoint:

```text
checkpoint-after-p1-layout-followup-004
```

### Что исправлено

- доработан `PriceList` на главной странице после P1-текстов;
- в блоке «Что входит» пункты приведены к более стабильному отображению;
- снижена визуальная тяжесть крупных заголовков на `/resheniya/dlya-rukovoditeley`;
- снижена визуальная тяжесть карточек и блоков на `/resheniya/dlya-sluzhby-bezopasnosti`;
- выровнены CTA/заявочные блоки на страницах решений;
- доработан блок заявки на `/resheniya/torgovye-centry`;
- выровнен CTA-блок на `/resheniya/dlya-inzhenerov`.

### Затронутые файлы

- `app/components/landing/PriceList.tsx`;
- `app/(narrow)/resheniya/dlya-rukovoditeley/components/PainPoints.tsx`;
- `app/(narrow)/resheniya/dlya-rukovoditeley/components/Solution.tsx`;
- `app/(narrow)/resheniya/dlya-rukovoditeley/components/CallToAction.tsx`;
- `app/(narrow)/resheniya/dlya-sluzhby-bezopasnosti/components/Control.tsx`;
- `app/(narrow)/resheniya/dlya-sluzhby-bezopasnosti/components/Reliability.tsx`;
- `app/(narrow)/resheniya/dlya-sluzhby-bezopasnosti/components/CallToAction.tsx`;
- `app/(narrow)/resheniya/dlya-inzhenerov/components/CallToAction.tsx`;
- `app/(narrow)/resheniya/torgovye-centry/page.tsx`.

### Что не трогалось

- URL и маршруты;
- тексты по смыслу;
- формы и поля форм;
- `/api/lead`;
- `/api/quiz`;
- `metadata`;
- JSON-LD;
- FAQ;
- `ExtendedInfo`;
- PM2/env;
- новые страницы;
- новые разделы.

### Проверка

- `npm run build`: успешно;
- ручная проверка выполнена;
- состояние принято как терпимое для продолжения P1;
- оставшиеся мелкие визуальные нюансы перенесены в будущий этап полировки сайта.

### Риски / примечания

- финальную визуальную полировку лучше делать после завершения текстовых P1/P1.3/P1.4 правок;
- задача закрыта как стабильная промежуточная точка.

## 2026-05-04 — P1.3-light SEO/GEO visible copy

Checkpoint:

```text
checkpoint-after-p1-seo-geo-visible-copy-light-001
```

### Что изменено

- внесены короткие SEO/GEO-уточнения в видимые тексты существующих страниц;
- усилен короткий answer-first на главной;
- уточнено назначение оборудования;
- уточнён смысл раздела реализованных объектов;
- уточнены поводы обращения на странице контактов;
- уточнено, что квиз собирает исходные параметры для предварительной оценки, а не даёт точный расчёт.

### Затронутые страницы

- `/`;
- `/oborudovanie`;
- `/keysy`;
- `/contacts`;
- `/quiz`.

### Что не трогалось

- URL и маршруты;
- формы и поля форм;
- `/api/lead`;
- `/api/quiz`;
- `metadata`;
- JSON-LD;
- FAQ;
- `ExtendedInfo`;
- PM2/env;
- новые страницы;
- новые разделы.

### Проверка

- `npm run build`: успешно;
- ручная проверка выполнена;
- визуально критичных проблем не обнаружено.

### Риски / примечания

- P1.3-light принят на уровне архитектуры;
- дальнейшая работа по оборудованию и объектам вынесена в P1.4;
- `main` пока не трогается, рабочее согласование продолжается в `dev-p1-visible-copy-001`.

## 2026-05-04 — P1.4-light оборудование и реализованные объекты

Основной commit:

```text
fae938b content(p1): refine equipment and case copy
```

Checkpoint:

```text
checkpoint-after-p1-equipment-cases-copy-light-001
checkpoint-after-merge-p1-equipment-cases-copy-light-001
```

Рабочая ветка задачи:

```text
dev-p1-equipment-cases-copy-light-001
```

Итоговая рабочая ветка P1 после merge:

```text
dev-p1-visible-copy-001
```

### Что изменено

- выполнен лёгкий P1.4-проход по оборудованию и реализованным объектам;
- задача была ограничена только `/oborudovanie`, `/oborudovanie/[slug]`, `/keysy`, `/keysy/[slug]`;
- рискованные обещания в карточках объектов смягчены;
- сохранён смысл кейсов без чрезмерных заявлений;
- `content/extended/*` не трогался;
- после проверки задача fast-forward merge в `dev-p1-visible-copy-001`.

### Затронутые файлы

Фактически изменены карточки объектов:

- `content/keysy/chkalovskaya.md`;
- `content/keysy/elektronika-na-presne.md`;
- `content/keysy/elma-kuryanovo.md`;
- `content/keysy/galereya-rasskazovka.md`;
- `content/keysy/hey-balashiha.md`;
- `content/keysy/izumrudnii-kranogorsk.md`;
- `content/keysy/krilya-sovetov.md`;
- `content/keysy/petrovsky.md`;
- `content/keysy/plazma-murmansk.md`;
- `content/keysy/pyatnica.md`;
- `content/keysy/pyatnicki.md`;
- `content/keysy/ryabovskaya-manufaktura.md`;
- `content/keysy/triumphlni.md`;
- `content/keysy/veshnyakovsky-rynok.md`.

### Что смягчено

Удалены или заменены формулировки уровня:

- `100% контроль`;
- `полностью исключено`;
- `абсолютный ноль`;
- `всегда находят свободное место`;
- `безотказная система`;
- чрезмерно точные обещания роста без методики.

Типовые безопасные замены:

```text
100% контроль выручки
→ прозрачный контроль выручки и операций

полностью исключен несанкционированный доступ
→ снижены риски несанкционированного доступа

потери сведены к абсолютному нулю
→ существенно снижены риски потерь от неоплаченных выездов

покупатели всегда находят свободное место
→ покупателям стало проще находить свободные места

безотказная система
→ устойчивая система
```

### Что не трогалось

- `main`;
- URL и маршруты;
- формы и поля форм;
- `/api/lead`;
- `/api/quiz`;
- `metadata`;
- JSON-LD;
- FAQ;
- `ExtendedInfo`;
- `content/extended/*`;
- PM2/env;
- новые страницы;
- новые разделы;
- структура карточек;
- фильтры;
- дизайн карточек;
- навигация.

### Проверка

- `npm run build`: успешно;
- merge в `dev-p1-visible-copy-001`: fast-forward;
- контрольный grep по рискованным обещаниям в `content/keysy` дал пустой вывод.

Контрольный grep:

```bash
grep -RIn \
  -e '100% контроль' \
  -e 'полностью исключ' \
  -e 'абсолютному нулю' \
  -e 'абсолютный ноль' \
  -e 'всегда находят' \
  -e 'безотказная система' \
  -e 'пробки полностью ликвидированы' \
  -e 'полностью исключила оборот наличных' \
  content/keysy \
  --include='*.md'
```

Ожидаемый и полученный результат — пустой вывод.

### Риски / примечания

- оборудование в P1.4-light почти не расширялось: акцент сделан на безопасные формулировки в карточках объектов;
- расширенный контент `ExtendedInfo` отложен на P2/later;
- карточки оборудования можно дорабатывать отдельно в P2 после финальной фиксации P1.

## 2026-05-04 — Hero copy: финальная формулировка первого экрана

Основной commit:

```text
ea59bbb content(p1): update hero copy
```

Checkpoint:

```text
checkpoint-after-hero-p1-copy-change-001
```

Рабочая ветка задачи:

```text
dev-hero-p1-copy-change-001
```

### Что изменено

Точечно обновлён первый экран главной страницы `/` в файле:

```text
app/components/landing/Hero.tsx
```

Финальный hero:

```text
РОСПАРК — парковочные системы под ключ
Парковка работает 24/7 — система под контролем
Въезд · Оплата · Доступ · Отчётность
РОСПАРК помогает превратить парковку из набора оборудования в управляемый актив объекта: с понятным въездом, оплатой, доступом, распознаванием номеров, отчётностью и поддержкой после запуска.
```

### Почему принято

- H1 стал живее и понятнее;
- в первый экран вынесена сильная сторона РОСПАРК: система работает после запуска и остаётся под контролем;
- `24/7` используется как содержательное обещание сопровождения, а не пустой рекламный лозунг;
- термин `актив` перенесён в абзац, где он звучит естественнее и не перегружает H1.

### Что не трогалось

- URL и маршруты;
- формы;
- API;
- `metadata`;
- JSON-LD;
- FAQ;
- `ExtendedInfo`;
- PM2/env;
- структура hero-блока;
- кнопки;
- CTA;
- изображения;
- другие секции.

### Проверка

- демо-сервер обновлён;
- визуальная проверка пройдена успешно;
- первый экран на демо выглядит корректно.

## 2026-05-04 — DOCS-P1-PACKAGE-SYNC-001

Статус:

```text
ready-for-docs-sync
```

### Цель

Синхронизировать документацию и знания агентов после закрытия текущего P1-пакета в ветке:

```text
dev-p1-visible-copy-001
```

### Что нужно обновить

- `docs/site/CHANGELOG.md`;
- свежий `project_full_dump.txt`;
- пакет знаний для агентов.

### Что включить в пакет для агентов

- новый `project_full_dump.txt`;
- обновлённый `docs/site/CHANGELOG.md`;
- `docs/site/ARCHITECTURE.md`;
- `docs/site/SITE_STRUCTURE.md`;
- `docs/content/CONTENT_STYLE_GUIDE.md`;
- `docs/marketing/POSITIONING.md`;
- `docs/deployment/DEPLOY_DEMO_SERVER.md`;
- `docs/agents/AI_TEAM.md`;
- инструкции нового GPT-разработчика, если он используется в процессе.

### Что пока не запускать

До завершения docs sync и финальной демо-проверки P1 не запускать:

- новые тексты по страницам решений;
- новые SEO/GEO-правки;
- `metadata`;
- JSON-LD;
- FAQ;
- `ExtendedInfo`;
- новые страницы;
- новости;
- статьи;
- merge в `main`.

### Следующий выбор после docs sync

После синхронизации можно выбрать направление:

- вариант А — финальная демо-проверка P1 и решение по `main`;
- вариант Б — P2-планирование: новости/статьи, `ExtendedInfo`, metadata/OG, карточки оборудования;
- вариант В — визуальная полировка сайта после всех P1-текстов.

Рекомендация Архитектора: сначала завершить `DOCS-P1-PACKAGE-SYNC-001`, затем провести финальную демо-проверку P1.

## 2026-05-04 — стратегия ветвления для P1

### Решение

`main` временно не сливается с P1-веткой и остаётся стабильной точкой отката.

Рабочая ветка согласования:

```text
dev-p1-visible-copy-001
```

### Правило работы

- демо-сервер можно держать на `dev-p1-visible-copy-001`;
- новые короткие P1/P2-правки делать отдельными ветками от `dev-p1-visible-copy-001`;
- после проверки короткие ветки сливать обратно в `dev-p1-visible-copy-001`;
- в `main` сливать только после финального архитектурного утверждения всего P1-пакета.

### Причина

Так `main` остаётся безопасной стабильной веткой, а `dev-p1-visible-copy-001` используется как рабочая ветка для согласования текстов, мобильной версии, форм, SEO/GEO-уточнений и последующих P1-итераций.

## Текущий статус этапов

```text
P0 — закрыт.
P1.1 — маркетинговый аудит коммерческих страниц: закрыт.
P1.2 — редакторские коммерческие тексты: закрыт.
P1 visible copy — внедрён и принят.
P1 layout follow-up — внедрён и принят как стабильная точка.
P1.3-light SEO/GEO visible copy — внедрён и принят.
P1.4-light оборудование и реализованные объекты — внедрён и принят.
Hero copy change — внедрён и проверен на демо.
DOCS-P1-PACKAGE-SYNC-001 — текущий шаг.
main — пока не трогаем.
dev-p1-visible-copy-001 — рабочая ветка согласования.
```

## Правило ведения changelog

Добавлять запись при каждом крупном изменении:

- мобильная адаптация;
- структура сайта;
- формы;
- SEO/GEO-страницы;
- каталог оборудования;
- карточки объектов;
- интеграции;
- деплойная схема;
- крупные правки текстов.

Формат записи:

```text
## YYYY-MM-DD — краткое название изменения

Commit:
...

Что изменено:
- ...

Проверка:
- ...

Риски / примечания:
- ...
```
