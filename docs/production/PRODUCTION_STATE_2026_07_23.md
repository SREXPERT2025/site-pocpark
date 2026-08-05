# РОСПАРК: состояние Production Release v1

Дата последней сверки: 5 августа 2026 года.

## Статус документа

Это фактологическая фиксация уже работающего production-контура, а не инструкция
по развёртыванию. При расхождении с предположениями первого выпуска в
`docs/deployment/AFTER_DEPLOY_GUEST_DEMO_MAX.md` приоритет имеет сначала
read-only проверка фактического VPS, затем этот документ.

Документация не является разрешением автоматически менять env, MAX, Nginx,
PM2, SQLite или зависимости.

## Release

- Статус: Production Release v1, analytics/demo-growth, `LEAD-OPS-002 / L4`,
  server-side сводка, privacy-safe demo/quiz, публичный AI-консультант,
  GA4, подтверждения доставки MAX, два рекламных лендинга, site-wide
  AI-аналитика, VPS-часть контекста AI и исправление отправки вопросов с
  обычных страниц успешно выпущены.
- Release SHA: `2f8b2b2b914f7c24c03e2693ccf3e036e1a68d44`.
- Production branch: `release/demo-production-ready-20260723`.
- Отдельный production gateway Mac Studio работает из release
  `80ffd254003eb45c0026db0598c83a0f6d5e830c`; это не изменение SHA сайта на
  VPS.

## Production-окружение

- Node.js: `22`.
- Next.js: `14.2.35`.
- PM2: production-процесс запущен и работает.
- Nginx: используется в production-контуре.
- Яндекс Метрика: прямой consent-gated loader, счётчик `110980303`.
- Google Analytics 4: прямой consent-gated loader без GTM, Measurement ID
  `G-3Z9KNN3MMK`.
- Внешний loader Метрики разрешён только на production-host
  `www.xn--80aukedde.xn--p1ai`; localhost и тестовые host не отправляют
  данные во внешний счётчик.
- Production environment содержит
  `NEXT_PUBLIC_YANDEX_METRIKA_ID=110980303` и
  `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-3Z9KNN3MMK`; оба значения включены в
  production build.

## Подтверждённая работа

- Demo-система работает.
- `/`, `/demo`, три внутренних demo-сценария и `/privacy` отвечают `200`.
- Неавторизованный запрос к `/api/demo/requests` отвечает `401`.
- На странице бизнес-центров опубликован контекстный вход в три
  demo-сценария.
- У юридических страниц опубликованы собственные metadata и canonical.
- До согласия пользователя браузер не загружает ресурсы `mc.yandex.ru`.
- После `Принять` загружается `tag.js?id=110980303` и отправляется pageview.
- После изменения выбора на `Отклонить необязательные` страница
  перезагружается без ресурсов Метрики.
- В production-счётчике создано восемь ручных целей `ANALYTICS-001-C`.
- Цель `Воронка — вход в demo/quiz` имеет ID `588884963` и условие
  `rospark_funnel_entry`.
- Контрольные переходы с `/resheniya/biznes-centry` в `/demo` и
  `/quiz?source=request` успешно выполнены на production без отправки форм.
- Прямое открытие `/demo/gostevaya-zayavka` отправляет одну цель
  `rospark_demo_scenario_view`.
- SPA-переход `/demo → /demo/gostevaya-zayavka` отправляет одну цель без
  дубля; параметры содержат `demo_name`, PII отсутствует.
- Локальный QA больше не загружает ресурсы `mc.yandex.ru` даже при сохранённом
  analytics consent.
- WhatsApp работает.
- MAX работает, реальная demo-заявка успешно доставлена.
- Единый lead registry работает вне Git checkout.
- `/admin/leads` доступен только по персональным ролям Андрея и Сергея.
- MAX transactional outbox и ежедневная retention cleanup работают через
  systemd timers.
- В закрытом `/admin/leads` опубликованы агрегаты
  `received → assigned → contacted → closed`, повторов, источников и срока
  первого контакта без PII.
- Публичный AI-консультант работает через отдельный production gateway Mac
  Studio по Tailscale HTTPS.
- Диалоги журналируются в отдельной SQLite, а cleanup timer активен.
- Виджет отсутствует в `/admin`.
- Заявка `RSP-42254644` назначена Сергею и доставлена в MAX ровно один раз.
- Lead registry обновлён до migrations `1–4`; новые MAX-отправки сохраняют
  provider message ID, destination ID и время принятия провайдером.
- В `/admin` не загружаются ни Метрика, ни GA4.
- Три статьи используют обновлённые production-обложки WebP `1920 × 1080`.
- AI-консультант знает подтверждённый сценарий собственного идентификатора и
  использует allowlist-каталог контекстных ссылок на страницы сайта.
- `/parkovka` и `/parkovka-pod-klyuch` опубликованы, встроены в общий сайт и
  отвечают `200`;
- `/puzzle2` перенаправляется на `/parkovka-pod-klyuch`;
- `/proshche`, `/puzzle`, `/test2`, `/v4-1`, `/v4-2` отвечают `404` в
  production и не предназначены для индексации;
- формы двух лендингов подключены к общему lead registry;
- контекст лендингов передаётся AI API без текста клиента и PII;
- обычные страницы без landing-контекста не отправляют пустой `pageContext`,
  поэтому сервер принимает вопрос и не отвечает `INVALID_PAGE_CONTEXT`;
- события открытия AI, первого сообщения, вовлечённого диалога и handoff
  входят в общий privacy-safe analytics contract;
- production gateway Mac Studio по-прежнему работает из release `80ffd25`;
  новые Python gateway-изменения из site release `279d919` ещё не активированы
  на Mac Studio и требуют отдельной приёмки.

## Проверка release от 2026-08-04

- production fast-forward:
  `0fe1047f9e25dd7b49550c491166c22ff1b55155` →
  `279d919820938e4ea87dcdd7a6138774df55f8c1`;
- перед переключением созданы online backups env, трёх SQLite, Nginx и systemd
  units, а также hot rollback build;
- staging прошёл typecheck, lint, 46 gateway tests, 13 cascade tests, 5 review
  tests, transcript-log test и production build 116 страниц;
- две первые попытки переключения автоматически вернули `0fe1047`: сначала
  из-за некорректного обходного HTTP smoke, затем из-за ожидания JSON от
  text/plain AI API; данные, outbox и MAX не изменялись;
- финальная проверка приведена к фактическому контракту HTTPS/Nginx и
  text/plain AI response;
- финальная transient service завершилась с `Result=success`,
  `ExecMainStatus=0`;
- PM2 `rospark-site` — `online`;
- внешний smoke после завершения подтвердил `/`, `/parkovka` и
  `/parkovka-pod-klyuch` как `200`, redirect `/puzzle2` и `404` архивных
  вариантов;
- release smoke не создавал лиды и не отправлял сообщения в MAX.

## Проверка AI context hotfix от 2026-08-04

- production fast-forward:
  `279d919820938e4ea87dcdd7a6138774df55f8c1` →
  `5223dd80f6db384ca52685088522c9aba4c3f86a`;
- исправлено формирование запроса AI-виджета на обычных страницах: отсутствие
  landing attribution теперь означает отсутствие `pageContext`, а не пустой
  объект;
- сохранена строгая проверка контекста `/parkovka` и
  `/parkovka-pod-klyuch`;
- retention-fixture журнала сделана относительной к текущей дате, чтобы
  release-проверка не зависела от календарного истечения тестовых записей;
- staging прошёл typecheck, lint, gateway/widget/log tests и production build;
- transient service завершилась с `Result=success`, `ExecMainStatus=0`, PM2
  `rospark-site` остался `online`;
- внешний browser smoke на главной странице подтвердил принятие вопроса,
  получение содержательного ответа и работу внутренних ссылок;
- контрольная проверка не создавала заявку и не отправляла сообщения в MAX.

## SEO/GEO baseline release от 2026-08-04

- production fast-forward:
  `5223dd80f6db384ca52685088522c9aba4c3f86a` →
  `0c2b9310016f3f044a2d544c6c4aac2dd3a236e2`;
- опубликованы уникальные meta description для шлагбаумов РОСПАРК 3 м и 4 м;
- roadmap, SEO/GEO baseline и контентный backlog приведены к первому
  фактическому срезу Search Console и Яндекс Вебмастера;
- staging прошёл typecheck, lint, AI widget/log/gateway tests и production
  build 116 страниц;
- transient service завершилась с `Result=success`, `ExecMainStatus=0`, PM2
  `rospark-site` остался `online`;
- публичная browser-проверка подтвердила оба новых description, canonical,
  доступность `/demo` и кейса `/keysy/amaks-otel-kazan`;
- контроль не создавал лиды и не отправлял сообщения в MAX;
- backup и горячая откатная сборка сохранены на VPS.

## SEO indexing release от 2026-08-05

- production fast-forward:
  `0c2b9310016f3f044a2d544c6c4aac2dd3a236e2` →
  `a736baff6d024b44aa8aa181515975b3f4dedf28`;
- опубликован HTML verification-файл дополнительной URL-prefix property
  Яндекса;
- `/parkovka` и `/parkovka-pod-klyuch` включены в публичный sitemap;
- страницы оборудования сохраняют информационную разметку без неподтверждённых
  Product/Offer, цен, рейтингов и отзывов;
- страницы решений получили естественные ссылки на шесть подтверждённых
  кейсов;
- staging и публичный HTTPS acceptance прошли успешно, PM2 остался `online`;
- публичный sitemap содержит 80 URL, verification-файл отвечает `200`;
- дополнительная URL-prefix property Яндекса подтверждена 2026-08-05 через
  этот HTML-файл; `rospark.adver` получил роль «Владелец»;
- backup:
  `/root/rospark-backups/seo-indexing-a736baf-20260805T041634Z`;
- hot rollback:
  `/var/www/rospark-release-builds/next-hot-0c2b931-20260805T041634Z`;
- релиз не создавал лиды и не отправлял сообщения в MAX.

## Индексируемый режим лендингов от 2026-08-05

- production fast-forward:
  `a736baff6d024b44aa8aa181515975b3f4dedf28` →
  `2f8b2b2b914f7c24c03e2693ccf3e036e1a68d44`;
- `/parkovka` и `/parkovka-pod-klyuch` отдают `index, follow`, корректные
  self-canonical и присутствуют в sitemap;
- staging, production build и три post-release проверки завершились успешно;
- PM2 `rospark-site` остался `online`;
- backup:
  `/root/rospark-backups/landing-index-2f8b2b2-20260805T061207Z`;
- hot rollback:
  `/var/www/rospark-release-builds/next-hot-a736baf-20260805T061207Z`;
- актуальный sitemap повторно отправлен в Google Search Console и поставлен на
  переобход в Яндекс Вебмастере;
- релиз не создавал лиды и не отправлял сообщения в MAX.

## Отдельный AI gateway release от 2026-07-28

- production LaunchAgent
  `com.pocpark.rospark-ai-widget-gateway-production` активен;
- runner использует release
  `80ffd254003eb45c0026db0598c83a0f6d5e830c` на Mac Studio;
- runtime mode — `production`, loopback port — `8788`, модель —
  `qwen3.6:27b`;
- добавлены prewarm responder context и быстрые детерминированные маршруты;
- добавлена подтверждённая логика разового клиента с собственным
  идентификатором: оплата на выезде через банковский модуль либо в совместимом
  кассовом терминале; онлайн-оплата по неизвестному посетителю внутреннему
  идентификатору не предлагается;
- добавлен каталог разрешённых ссылок сайта, чтобы ответы могли давать
  контекстный переход, а не только называть раздел;
- изменение gateway не потребовало нового release сайта, Nginx или lead
  registry на VPS;
- следующий эксплуатационный блок — review реальных диалогов, качество
  ответов и latency.

## Проверка накопительного release от 2026-07-28

- backup:
  `/root/rospark-backups/release-47529cc-20260728T102326Z`;
- fast-forward:
  `c65b1b3cee0eb946b2f28b7c59aeaf003681477c` →
  `47529cc83489534c4ba25cfe7a069e590d924851`;
- production build ID: `BP6pCB_Trq6mXe3Xh75wF`;
- staging `npm ci`, typecheck, lint, analytics privacy, lead registry/admin/CLI,
  AI-widget suites и production build `107/107` — успешно;
- первый cutover автоматически вернул предыдущую сборку, потому что
  readiness обнаружил отсутствующую migration `4`; данные не менялись,
  PM2 и три timers были восстановлены;
- перед повтором создан отдельный online backup lead registry, migration `4`
  применена штатно при остановленных приложении и фоновых обработчиках;
- PM2 `rospark-site` — `online`; lead outbox, lead cleanup и AI widget cleanup
  timers — `active`;
- demo SQLite, lead registry и AI widget SQLite: `quick_check=ok`;
- outbox до и после выпуска: `sent=2`, прочих статусов `0`; новых сообщений
  MAX выпуск не отправлял;
- `/`, `/demo`, три обновлённые статьи, `/privacy`,
  `/admin/leads/login` и `/sitemap.xml` — `HTTP 200`;
- AI widget status: `enabled=true`, runtime `production`, handoff `live`,
  logging `true`;
- GA4 `G-3Z9KNN3MMK` и Метрика `110980303` присутствуют в production build и
  загружаются на публичном host после сохранённого analytics consent;
- `/admin/leads/login` не содержит публичного AI-виджета и внешних
  аналитических scripts;
- desktop browser QA подтвердил три новые обложки; mobile `390 × 844`
  подтвердил отсутствие горизонтального overflow, загрузку обложки и
  корректное раскрытие AI-панели;
- Google Analytics подтвердил созданный web stream `15338809658`; сразу после
  выпуска UI ещё показывает «данные не получены», поэтому первое событие и
  Realtime остаются на контроль после периода обработки Google до 48 часов;
- hot rollback:
  `/var/www/rospark-release-builds/next-hot-c65b1b3-retry-20260728T103833Z`.

## Проверка AI-виджета от 2026-07-28

- backup:
  `/root/rospark-backups/ai-widget-production-20260728T072301Z`;
- fast-forward:
  `89c045d79535169527347c40c438971fb560995d` →
  `c65b1b3cee0eb946b2f28b7c59aeaf003681477c`;
- production build ID: `2P8tMH9DRii8ReaY5y4vH`;
- authenticated gateway health — `ok`, runtime `production`;
- AI widget SQLite и lead registry: `quick_check=ok`, mode `600`;
- lead outbox, lead cleanup и AI widget cleanup timers — `active`;
- production readiness — `ready`, внешних отправок самой проверкой `0`;
- desktop/mobile UI и отсутствие виджета в `/admin` подтверждены browser QA;
- контрольная заявка `RSP-42254644`: `sent`, `attempts=1`, `error=none`;
- read-only MAX API нашёл сообщение в
  `РОСПАРК ОТДЕЛ ПРОДАЖ`, message ID
  `mid.ffffbf66ac16559e019fa7b1191173fc`;
- первый uncached ответ занял `72610 ms` и превысил старый proxy timeout;
  Nginx настроен на `proxy_read_timeout 120s`, последующий cached ответ —
  `HTTP 200` за `0.057835s`;
- подробный акт:
  `docs/site/ai-widget/AI_WIDGET_PRODUCTION_ACCEPTANCE_20260728.md`.

Это не означает, что:

- создан публичный MAX-канал для продвижения;
- разрешены новые реальные отправки без отдельного подтверждения.

Analytics release также не означает, что уже:

- накоплены и подтверждены данные всех восьми ручных целей в отчёте Метрики;
- собрана сквозная demo-воронка и ежемесячный dashboard;
- назначен резервный администратор счётчика;
- накоплен достаточный объём данных для SEO/GEO-выводов.

## Проверка funnel entry release от 2026-07-25

- backup:
  `/root/rospark-backups/analytics-funnel-20260725T125007Z`;
- fast-forward:
  `26740a5a0fe485b6ff3427283f3461d4dddd22ba` →
  `89c045d79535169527347c40c438971fb560995d`;
- staging и production SHA:
  `89c045d79535169527347c40c438971fb560995d`;
- staging privacy smoke, typecheck, lint и Node.js 22 build — успешно;
- production build ID: `bYt3AjLTGWWnwnpg84KWl`;
- `/`, `/resheniya/biznes-centry`, `/demo`, `/quiz` и
  `/admin/leads/login` — `200`;
- `/admin/leads` без сессии — `307`, admin и demo API без сессии — `401`;
- demo SQLite и lead registry: `quick_check=ok`;
- PM2 `rospark-site` — `online`, outbox и cleanup timers — `active`;
- outbox: `ready=0`, ранее отправлено `sent=1`;
- новых сообщений в MAX не отправлялось;
- rollback build:
  `/var/www/rospark-release-builds/next-26740a5-20260725T125007Z`;
- в Метрике создана восьмая ручная цель
  `Воронка — вход в demo/quiz`, ID `588884963`, условие
  `rospark_funnel_entry`;
- production browser smoke выполнил ровно по одному контролируемому переходу
  с `/resheniya/biznes-centry` в `/demo` и `/quiz?source=request`;
- формы не заполнялись и не отправлялись, персональные данные не создавались;
- после обработки Метрика зарегистрировала один целевой визит и четыре
  просмотра в нём; два контрольных перехода выполнялись внутри одного визита,
  поэтому доставка цели подтверждена, а отдельная сверка параметров
  `destination` / `landing_group` остаётся следующим шагом.

## Проверка server-side analytics release от 2026-07-25

- backup:
  `/root/rospark-backups/analytics-server-summary-20260725T115320Z`;
- fast-forward:
  `61a4694bee55426e72bdfbb42008730c3cb2b444` →
  `26740a5a0fe485b6ff3427283f3461d4dddd22ba`;
- staging SHA и production SHA:
  `26740a5a0fe485b6ff3427283f3461d4dddd22ba`;
- staging lead registry/admin/CLI tests, analytics privacy test, typecheck,
  lint и build — успешно;
- production build ID: `hpgikJ4D38MvlFmCENRHP`;
- `/`, `/demo`, `/contacts`, `/admin/leads/login` — `200`;
- `/admin/leads` без сессии — `307`, admin API без сессии — `401`;
- demo SQLite и lead registry: `quick_check=ok`, foreign key errors
  отсутствуют;
- registry: один закрытый TEST-лид, одна submission, `sent=1`, `ready=0`;
- PM2 `rospark-site` — `online`, timers — `active`;
- новых TEST-отправок в MAX не выполнялось;
- вход Андрея подтверждён;
- сводка показывает один лид, назначение, контакт и закрытие, первый контакт
  за 5 минут, `100%` срока, ноль просрочек и повторов;
- агрегированный блок не содержит имени, телефона и lead ID;
- admin: `noindex`, без Метрики, публичного header/footer, overflow и ошибок
  browser console;
- rollback build:
  `/var/www/rospark-release-builds/next-61a4694`.

## Проверка `LEAD-OPS-002 / L4` от 2026-07-24

- backup:
  `/root/rospark-backups/lead-ops-l4-20260724T122213Z`;
- fast-forward:
  `c2a0e955b8747e3005da28e3fe9981f01fa45488` →
  `61a4694bee55426e72bdfbb42008730c3cb2b444`;
- staging `npm ci`, lead registry/admin/CLI tests, typecheck, lint и production
  build — успешно; 103 статические страницы;
- `.env.production` — mode `600`;
- registry:
  `/var/lib/rospark-leads/lead-registry.sqlite`, mode `600`, каталог mode
  `700`;
- migrations `1–3`, `quick_check=ok`, foreign key errors отсутствуют;
- вход Андрея (`director`) и Сергея (`sales_head`) подтверждён;
- внешний desktop/mobile admin smoke — без Метрики, публичного layout,
  overflow и console errors;
- одна `TEST LEAD-OPS-002` доставлена в MAX ровно один раз:
  `sent`, `attempts=1`, `error=none`;
- workflow закрыт:
  `new → assigned(sergey) → contacted → closed(test)`;
- audit: два успешных входа и три status change;
- outbox и cleanup timers — `active`, service result — `success`;
- PM2 `rospark-site` — `online`.

## Проверка выпуска от 2026-07-24

- backup:
  `/root/rospark-backups/analytics-release-20260724T043201Z`;
- online backup SQLite: checksum и `PRAGMA quick_check` — успешно;
- migrations: `1–3`;
- `npm ci`, typecheck, lint и production build — успешно;
- production build: 100 маршрутов;
- PM2 `rospark-site`: `online`, Node.js `22.23.1`;
- локальный и публичный HTTP smoke — успешно;
- внешний browser consent smoke — успешно;
- browser console — без ошибок и предупреждений;
- SQLite после restart: `quick_check=ok`.

## Проверка analytics reliability release от 2026-07-24

- backup env и release state:
  `/root/rospark-backups/analytics-goals-20260724T051826Z`;
- fast-forward:
  `9ae9579c63dc8c3c7af96a1e46d87ee0081b56da` →
  `80d64da4b2cdd3b6af7f837709722db66702930d`;
- Node.js: `22.23.1`;
- `npm ci`, typecheck, lint, privacy smoke и production build — успешно;
- production build: 100 маршрутов;
- PM2 `rospark-site`: `online`;
- `/`, `/demo`, `/demo/gostevaya-zayavka` — `200`;
- `/api/demo/requests` без сессии — `401`;
- внешний browser smoke hard load / SPA — по одной цели без дублей;
- browser console — без ошибок и предупреждений;
- `npm ci` показал 13 известных audit findings (`1 moderate`, `12 high`);
  автоматическое обновление зависимостей не выполнялось.

## Проверка analytics host guard release от 2026-07-24

- backup env и release state:
  `/root/rospark-backups/analytics-host-guard-20260724T070217Z`;
- fast-forward:
  `80d64da4b2cdd3b6af7f837709722db66702930d` →
  `c2a0e955b8747e3005da28e3fe9981f01fa45488`;
- Node.js: `22.23.1`;
- `npm ci`, typecheck, lint, privacy smoke и production build — успешно;
- production build: 100 маршрутов;
- PM2 `rospark-site`: `online`;
- `/`, `/demo`, `/demo/gostevaya-zayavka` — `200`;
- `/api/demo/requests` без сессии — `401`;
- внешний browser smoke подтвердил загрузку публичной demo-страницы и
  `tag.js?id=110980303` на production-host;
- browser console — без ошибок;
- SQLite, Nginx, DNS, MAX, WhatsApp и зависимости не изменялись;
- `npm ci` показал 13 известных audit findings (`1 moderate`, `12 high`);
  автоматическое обновление зависимостей не выполнялось.

Накопительный PM2 error log содержит записи `Failed to find Server Action "x"`
без временных меток. Они не воспроизвелись в текущем HTTP/browser smoke, поэтому
не считаются подтверждённой ошибкой нового релиза, но должны проверяться по
новым timestamp при следующем production-наблюдении.

## SQLite

Текущая production-база SQLite находится внутри Git checkout:

```text
/var/www/rospark-site/.data/guest-requests.sqlite
```

Связанные WAL-файлы могут находиться рядом с основной базой:

```text
/var/www/rospark-site/.data/guest-requests.sqlite-wal
/var/www/rospark-site/.data/guest-requests.sqlite-shm
```

До отдельного согласованного переноса эти файлы нельзя удалять, перемещать или
копировать как обычные независимые файлы при работающем приложении.

## TODO production

Перенос SQLite подготовлен, но отложен по решению владельца от 2026-07-23:
текущая база исправна, свежий проверенный backup создан, production продолжает
работать со старым путём. Обновление зависимостей и связанный security audit
также перенесены на последний этап актуального roadmap. Условия возврата задач
описаны в
`docs/site/SITE_DEVELOPMENT_ROADMAP_20260723.md`.

1. Перед следующим крупным production-изменением вернуться к переносу SQLite в
   постоянный каталог вне Git checkout:

   ```text
   /var/lib/rospark-demo
   ```

2. Реализовать человекочитаемый Unicode-домен вместо Punycode в публичных
   сообщениях и отображаемых ссылках.

3. На последнем этапе обновить Next.js и другие зафиксированные production-
   зависимости.

4. После обновления зависимостей провести повторный security audit.

5. После каждого изменения production обновлять этот файл точным SHA, датой,
   фактическими путями и результатами smoke.

6. Для аналитики продолжить `ANALYTICS-001-C`: подтвердить накопление восьми
   ручных целей в интерфейсе Метрики, включая два контрольных
   `rospark_funnel_entry`, и обновить dashboard без PII.

7. Для `LEAD-OPS-002` контролировать `failed/dead`, SLA первого контакта,
   ежедневную retention cleanup и наличие свежего backup. TEST-лид не удалять
   до окончания документальной приёмки.

8. Отдельно выпустить и принять на Mac Studio gateway-код качества ответов из
   `279d919`; не считать обновление VPS автоматическим обновлением gateway.

9. Снять Search Console/Яндекс Вебмастер baseline после релиза и проверить,
   что рекламные лендинги остаются вне индекса до решения
   `LANDING-GROWTH-002`.

10. Накопить сопоставимые данные двух лендингов по форме и AI-воронке; решение
    об индексации или выборе концепции принимать по рабочим лидам, а не по
    просмотрам.

## Связанные актуальные документы

- `docs/site/SITE_DEVELOPMENT_ROADMAP_20260723.md`;
- `docs/production/PROD_DATA_OPS_PLAN_20260723.md`;
- `docs/production/LEAD_OPS_L4_RUNBOOK_20260724.md`;
- `docs/site/AI_WIDGET_ROADMAP_20260723.md`;
- `docs/deployment/AFTER_DEPLOY_GUEST_DEMO_MAX.md`;
- `docs/site/ARCHITECTURE.md`;
- `docs/site/SITE_STRUCTURE.md`.
- `docs/deployment/LANDING_RELEASE_20260804.md`.
