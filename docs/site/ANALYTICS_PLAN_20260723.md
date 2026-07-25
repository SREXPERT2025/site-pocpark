# РОСПАРК — план аналитики и demo-воронки

Дата последней сверки: 2026-07-25
Задача: `ANALYTICS-001`
Статус: `ANALYTICS-001-A` и `ANALYTICS-001-B` реализованы, опубликованы и
проверены; в `ANALYTICS-001-C` созданы семь целей, опубликована закрытая
агрегированная аналитика обработки лидов и локально подготовлено обезличенное
событие входа в demo/quiz; этап продолжается

## 1. Цель

Связать путь посетителя:

```text
источник
→ контентная или коммерческая страница
→ /demo или /quiz
→ выбранный demo-сценарий
→ ключевое действие
→ отдельное согласие на обратную связь
→ сохранённый lead
→ подтверждённая обработка lead
```

События должны позволять считать конверсию без передачи имени, телефона,
госномера, номера талона, текста комментария, идентификатора заявки,
идентификатора арендатора и других пользовательских данных.

## 2. Подтверждённое исходное состояние

До `ANALYTICS-001-A`:

- формы `LeadForm` и `QuizForm` создавали события `form_view`, `form_start`,
  `form_submit`, `form_success` и `form_error`;
- гостевой demo-кабинет создавал события входа, выхода, создания, просмотра и
  отмены заявки, а также share;
- demo оплаты парковки и кабинет владельца не создавали analytics-событий;
- `CookieBanner` сохранял выбор, но dispatcher не проверял его;
- событие добавлялось в `dataLayer` только при уже существующем массиве;
- подтверждённого внешнего потребителя `dataLayer` в репозитории нет;
- UTM и click identifiers передаются в lead payload отдельно от
  analytics-событий.

## 3. Локальная основа `ANALYTICS-001-A`

### 3.1. Consent-контракт

- analytics-события создаются только после значения `accepted`;
- при `declined`, отсутствии выбора или недоступном `localStorage` dispatcher
  работает fail-closed и ничего не публикует;
- `CookieBanner` и dispatcher используют один ключ и один helper;
- изменение выбора создаёт только локальный browser event
  `rospark:analytics_consent_change`;
- внешний loader аналитики в этом блоке отсутствует.

До подключения внешнего счётчика нужно добавить доступный пользователю способ
повторно открыть настройки и изменить сохранённый выбор.

### 3.2. Privacy allowlist

Dispatcher формирует payload из явного allowlist. Неизвестные поля не
переносятся в browser event и `dataLayer`.

Разрешённые поля:

```text
form_name
source_page
source_section
product_slug
error_type
demo_name
request_type
status
channel
search_mode
result
section
period
consent
destination
landing_group
```

`source_page` нормализуется до pathname. Query string, UTM, `gclid`, `yclid`
и другие параметры URL в событие не попадают. Текстовые идентификаторы
принимаются только в ограниченном техническом формате.

Запрещённые поля:

```text
name
phone
email
company
city
vehicle_number
ticket_number
request_id
public_token
tenant_id
comment
note
search_query
message
```

### 3.4. Локальная проверка

- `npm run typecheck` под Node.js 22 — пройден;
- `npm run lint` — пройден без предупреждений и ошибок;
- `npm run build` — пройден, сгенерированы 100 маршрутов;
- `node scripts/test_analytics_privacy.mjs` — пройден;
- browser smoke подтвердил сохранение decline, отсутствие `dataLayer` при
  отказе и работоспособность demo-входа;
- browser console — без ошибок и предупреждений;
- production и внешние analytics endpoint не использовались.

### 3.3. Текущий каталог событий

#### Формы

| Event | Смысл |
|---|---|
| `rospark_form_view` | форма показана после разрешения аналитики |
| `rospark_form_start` | первое взаимодействие с формой |
| `rospark_form_submit` | начата отправка валидной формы |
| `rospark_form_success` | API подтвердил успешную отправку |
| `rospark_form_error` | validation/network/server/unknown без текста ошибки |

#### Общие demo-события

| Event | Смысл |
|---|---|
| `rospark_demo_scenario_view` | открыт один из трёх demo-сценариев |
| `rospark_demo_login` | успешный ручной вход |
| `rospark_demo_logout` | выход из demo |

#### Гостевые заявки

| Event | Смысл |
|---|---|
| `rospark_demo_request_create` | создана заявка, без её ID и данных гостя |
| `rospark_demo_request_view` | открыта карточка заявки |
| `rospark_demo_request_cancel` | заявка отменена |
| `rospark_demo_share` | успешно подготовлен copy/WhatsApp/MAX-сценарий |
| `rospark_demo_feedback_consent` | посетитель включил или снял отдельное согласие |
| `rospark_demo_feedback_lead` | сохранение feedback lead завершилось saved/failed |

#### Оплата парковки гостя

| Event | Смысл |
|---|---|
| `rospark_demo_search` | поиск завершился success/empty/error без поискового текста |
| `rospark_demo_session_select` | выбрана синтетическая парковочная сессия |
| `rospark_demo_payment_confirm` | открыто подтверждение операции |
| `rospark_demo_payment_complete` | операция завершилась success/error |

#### Кабинет владельца

| Event | Смысл |
|---|---|
| `rospark_demo_owner_section_view` | открыта секция кабинета |
| `rospark_demo_owner_period_change` | выбран текущий или предыдущий месяц |
| `rospark_demo_owner_detail_view` | открыта обезличенная детализация арендатора |

#### Вход в коммерческую воронку

| Event | Смысл |
|---|---|
| `rospark_funnel_entry` | переход с публичного контента в `/demo` или `/quiz` |

Параметр `destination` допускает только `demo` или `quiz`. Контекст страницы
ограничен фиксированной категорией `landing_group`: `home`, `solutions`,
`features`, `equipment`, `cases`, `articles`, `company`, `contacts` или
`other`. Полный URL источника, query string, UTM, текст ссылки и динамический
slug в это событие не включаются. Переходы внутри `/demo` и `/quiz` не
считаются новым входом.

## 4. Production-интеграция `ANALYTICS-001-B`

Подтверждённое решение от 2026-07-23:

- основной сервис — Яндекс Метрика без GTM/GA4;
- production-счётчик — `110980303`;
- владелец счётчика — Yandex ID `radicom`;
- ID является публичным техническим идентификатором и задаётся через
  `NEXT_PUBLIC_YANDEX_METRIKA_ID`;
- Webvisor и session replay выключены;
- clickmap, e-commerce и передача title выключены в локальном init-контракте;
- e-commerce и встроенный Yandex Tag Manager дополнительно выключены в
  настройках самого счётчика;
- включены только стандартный pageview, точный показатель отказов и учёт
  внешних ссылок;
- advertising features и cross-domain tracking не подключались.

Реализовано и опубликовано:

- внешний `tag.js` не добавляется до сохранённого `accepted`;
- при первом отказе запросы к `mc.yandex.ru` отсутствуют;
- footer содержит постоянную кнопку `Настройки cookie`;
- переход с `accepted` на `declined` перезагружает страницу, после чего loader
  не запускается и новые запросы Метрики не создаются;
- client-side переходы Next.js передаются через `hit` без query string;
- разрешённые события форм и demo передаются через `reachGoal`;
- goal name ограничен техническим форматом, а параметры приходят только из
  существующего privacy allowlist;
- `dataLayer` сохранён как provider-neutral контракт для возможной будущей
  интеграции, но GTM не подключён.

Проверено локально и на production:

- `npm run typecheck` — пройден;
- `npm run lint` — пройден без предупреждений и ошибок;
- `npm run build` — пройден, сгенерированы 100 маршрутов;
- `node scripts/test_analytics_privacy.mjs` — пройден;
- browser smoke: до согласия скриптов Метрики нет, после `accepted` загружается
  `tag.js?id=110980303`, после отзыва и reload скриптов Метрики нет.
- production environment содержит
  `NEXT_PUBLIC_YANDEX_METRIKA_ID=110980303`;
- release SHA:
  `9ae9579c63dc8c3c7af96a1e46d87ee0081b56da`;
- публичные маршруты и unauthenticated API smoke прошли;
- внешний browser smoke подтвердил pageview после согласия и отсутствие
  ресурсов `mc.yandex.ru` до согласия и после отзыва;
- browser console — без ошибок и предупреждений.

Остаётся после production-выпуска:

- назначить резервного администратора счётчика и правила доступа;
- подтвердить срок хранения и необходимость отдельного юридического review;
- дождаться обработки созданных целей и подтвердить их в отчёте конверсий.

## 5. Цели и текущий статус `ANALYTICS-001-C`

2026-07-24 в production-счётчике созданы семь целей:

- точное посещение `/demo`;
- `rospark_demo_scenario_view`;
- `rospark_demo_request_create`;
- `rospark_demo_payment_complete`;
- `rospark_demo_owner_detail_view`;
- `rospark_demo_feedback_lead`;
- `rospark_form_success`.

Публичный browser smoke подтвердил отправку
`rospark_demo_scenario_view` с разрешённым параметром `demo_name` и без PII.
Полный реестр целей, ограничения `result` и доказательства записаны в
`docs/site/ANALYTICS_GOALS_20260724.md`.

Во время проверки найден риск потери первого события при прямом открытии
внутренней demo-страницы. Опубликованное исправление воспроизводит очередь
`dataLayer` после подключения Метрики и дедуплицирует повторную отправку.
Release `80d64da4b2cdd3b6af7f837709722db66702930d` и внешний browser smoke
подтвердили ровно одну цель при hard load и одну при SPA-переходе. Ошибок и
предупреждений browser console нет.

После закрытия `LEAD-OPS-002` добавлена и 2026-07-25 опубликована серверная
часть воронки в закрытом `/admin/leads`:

- получено лидов;
- назначено;
- первый контакт;
- закрыто;
- число повторных submissions;
- среднее рабочее время до первого контакта;
- соблюдение правила первого контакта за один рабочий час;
- агрегаты источника и pathname.

Расчёт рабочего времени использует подтверждённый график: понедельник–пятница,
`10:00–18:00`, `Europe/Moscow`. В JSON и интерфейс агрегатов не входят имя,
телефон, сообщение, lead ID или submission ID. Серверные статусы не
отправляются в Яндекс Метрику: текущий безопасный источник истины для них —
защищённый реестр на VPS.

Локально 2026-07-25 подготовлена следующая часть client-side воронки:

- единый глобальный tracker учитывает существующие ссылки в `/demo` и `/quiz`,
  поэтому десятки CTA не получили собственные несогласованные обработчики;
- событие `rospark_funnel_entry` создаётся только после analytics consent;
- в payload входят только `destination` и фиксированная `landing_group`;
- внешние URL, полный pathname источника, query, UTM, текст CTA и неизвестные
  поля отбрасываются;
- переходы между внутренними demo-страницами не считаются повторным входом;
- tracker не подключается в `/admin`;
- `YandexMetrika` готов воспроизводить событие через существующий
  `dataLayer → reachGoal` контракт, но production release и отдельная цель в
  счётчике ещё не выполнялись.

Проверка:

- `npm run test:lead-admin` — пройден, включая SLA через выходные, период и
  отсутствие PII в JSON;
- `npm run lint` — пройден;
- `npm run build` под Node.js 22 — пройден;
- локальный browser smoke подтвердил вход, сводку, две строки источников и
  корректные агрегаты;
- privacy smoke для `rospark_funnel_entry`, typecheck, lint и build под
  Node.js `22.23.1` — успешно;
- локальный browser smoke подтвердил переходы в `/demo` и
  `/quiz?source=request`, отсутствие внешнего loader Метрики и ошибок console;
- staging и production SHA:
  `26740a5a0fe485b6ff3427283f3461d4dddd22ba`;
- production browser smoke подтвердил вход Андрея, один закрытый TEST-лид,
  первый контакт за 5 минут, `100%` срока, один технический источник и ноль
  повторов;
- агрегированный блок не содержит имени, телефона и lead ID;
- admin не загружает Метрику и публичный layout, overflow и console errors
  отсутствуют;
- backup:
  `/root/rospark-backups/analytics-server-summary-20260725T115320Z`.

## 6. Что пока нельзя считать

Сбор базовых pageview начат 2026-07-24, цели настроены в тот же день. До
накопления данных, проверки отчёта конверсий и появления серверной связи пока
нельзя достоверно получить:

- уникальных пользователей и сессии;
- источник первого и последнего касания;
- production-накопление переходов с контентных страниц;
- production-накопление `rospark_funnel_entry` по категориям landing page;
- завершение пути между разными demo-страницами;
- атрибуционную связь client event с фактически сохранённым lead;
- объединённую client/server-конверсию в одном отчёте;
- рекламные расходы, цели и атрибуцию кампаний;
- регулярный SEO/GEO/conversion dashboard.

`dataLayer` остаётся provider-neutral интерфейсом интеграции. Наличие
production loader не заменяет проверку поступления целей в интерфейсе Метрики
и сквозную сверку с серверным результатом lead.

## 7. Следующие этапы

### `ANALYTICS-001-B` — решение и внешний loader

Решение, production ID, допустимые функции, consent-gate, внешний loader и
способ изменения выбора реализованы и опубликованы 2026-07-24.

Открытые пункты:

- резервный администратор;
- срок хранения и правила доступа;
- отдельное юридическое review, если оно потребуется владельцу сайта;
- проверка накопленных pageview и goals в интерфейсе Метрики.

### `ANALYTICS-001-C` — сквозная воронка

- host guard, исключающий localhost из production-счётчика, опубликован в
  release `c2a0e955b8747e3005da28e3fe9981f01fa45488`;
- дождаться не-QA данных остальных шести целей;
- выпустить локально подготовленный безопасный landing context и переходы в
  `/demo` и `/quiz` отдельным production release;
- после выпуска создать и проверить отдельную цель
  `rospark_funnel_entry` в Метрике;
- связать client success с server-side lead receipt без PII в аналитике;
- агрегированные статусы обработки опубликованы отдельным production release
  `26740a5a0fe485b6ff3427283f3461d4dddd22ba`;
- настроить ежемесячный dashboard;
- сравнить SEO landing pages, demo completion и обработанные leads.

Первый технический dashboard создан:
`docs/site/GROWTH_DASHBOARD_20260724.md`. Он подтверждает доставку цели и
параметра `demo_name`, но отделяет QA от реального спроса.

## 8. Критерий готовности

`ANALYTICS-001` закрывается только когда:

- сервис, владелец и доступы подтверждены;
- consent можно принять, отклонить и изменить;
- внешний script не загружается до разрешения;
- события проверены в test property;
- payload не содержит PII и query identifiers;
- формы и три demo-сценария видны в воронке;
- серверный результат lead не подменяется client click;
- создан dashboard и назначен ежемесячный контроль;
- production-выпуск выполнен отдельным согласованным release.
