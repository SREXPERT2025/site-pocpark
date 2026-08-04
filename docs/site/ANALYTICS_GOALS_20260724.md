# РОСПАРК — цели Яндекс Метрики

Дата настройки: 2026-07-24  
Задача: `ANALYTICS-001-C`  
Счётчик: `110980303`  
Владелец: Yandex ID `radicom`  
Статус: восемь ручных целей созданы; hard load и SPA-отправка подтверждены на
production; первый технический dashboard собран; production-host guard и
privacy-safe событие входа в demo/quiz опубликованы. Код полной AI-воронки
опубликован в production release `279d919`, но создание четырёх соответствующих
ручных целей в интерфейсе Метрики и получение первых не-QA достижений ещё не
подтверждены.

Опубликованная AI-воронка:
`rospark_ai_chat_open` → `rospark_ai_first_message_sent` →
`rospark_ai_engaged_chat` → `rospark_ai_lead_handoff`.

До отдельной проверки интерфейса Метрики эти четыре события считаются
доставляемыми кодом, но не созданными целями счётчика.

## 1. Созданные цели

Подтверждённо в production-счётчике используется 8 из 200 доступных ручных
целей.

| Название в Метрике | Тип и условие | Что измеряет |
|---|---|---|
| Demo — посещение каталога | посещение страниц, URL равен `https://www.xn--80aukedde.xn--p1ai/demo` | вход в индексируемый demo-хаб |
| Demo — открыт сценарий | JavaScript event содержит `rospark_demo_scenario_view` | открытие любого из трёх demo-сценариев |
| Demo — создана гостевая заявка | JavaScript event содержит `rospark_demo_request_create` | успешное создание demo-заявки |
| Demo — завершена попытка оплаты | JavaScript event содержит `rospark_demo_payment_complete` | завершение demo-операции с результатом `success` или `error` |
| Demo — открыта детализация владельца | JavaScript event содержит `rospark_demo_owner_detail_view` | открытие обезличенной детализации арендатора |
| Demo — результат feedback-лида | JavaScript event содержит `rospark_demo_feedback_lead` | завершение сохранения feedback lead с результатом `saved` или `failed` |
| Форма — успешная отправка | JavaScript event содержит `rospark_form_success` | подтверждённый клиентом успешный ответ lead API |
| Воронка — вход в demo/quiz | JavaScript event содержит `rospark_funnel_entry` | переход с публичного контента в `/demo` или `/quiz` |

Имена целей оплаты и feedback намеренно нейтральные. Текущие события содержат
поле `result`, поэтому без дополнительного условия цель включает и успешный,
и неуспешный результат. Для отчёта успехи нужно отделять по event parameters
либо позднее ввести отдельные success-only события.

Восьмая ручная цель Метрики создана 2026-07-25:

```text
Название: Воронка — вход в demo/quiz
ID: 588884963
Event: rospark_funnel_entry
```

Событие измеряет переход с публичного контента в `/demo` или `/quiz` и
содержит только:

```text
destination = demo | quiz
landing_group = home | solutions | features | equipment | cases |
                articles | company | contacts | other
```

Полный URL источника, query/UTM, текст CTA и динамические slug в событие не
попадают. Release `89c045d79535169527347c40c438971fb560995d` опубликован на
production.

## 2. Privacy-контракт

- цель не получает имя, телефон, email, госномер, номер талона, текст
  комментария, ID заявки, public token или ID арендатора;
- параметры формируются существующим allowlist;
- `source_page` хранит только pathname без query string, UTM, `gclid` и
  `yclid`;
- события создаются и отправляются только после analytics consent;
- в Метрику передаются только события пространства имён `rospark_*`.

## 3. Проверка 2026-07-24

На публичном сайте после согласия выполнен переход:

```text
/demo
→ /demo/gostevaya-zayavka
→ reachGoal rospark_demo_scenario_view
```

В сетевом запросе Метрики подтверждён параметр:

```json
{"demo_name":"guest_request_portal"}
```

PII и query identifiers в запросе отсутствовали.

Дополнительно был обнаружен риск потери события при прямом открытии внутренней
demo-страницы: дочерний компонент мог создать событие до подключения
слушателя Метрики. В release
`80d64da4b2cdd3b6af7f837709722db66702930d` опубликовано исправление:

- privacy-safe запись сначала добавляется в `dataLayer`;
- после инициализации Метрика воспроизводит ещё не отправленные события
  `rospark_*`;
- повторно обработанный объект не отправляется второй раз;
- одинаковые события одного render transition дедуплицируются в окне 250 мс.

Локально и повторно на публичном production подтверждено:

- прямое открытие `/demo/gostevaya-zayavka` — одна отправка
  `rospark_demo_scenario_view`;
- SPA-переход `/demo → /demo/gostevaya-zayavka` — одна отправка без дубля;
- `npm run typecheck` — успешно;
- `npm run lint` — успешно;
- production build на Node.js 22 — успешно, 100 маршрутов;
- `scripts/test_analytics_privacy.mjs` — успешно;
- browser console после production release — без ошибок и предупреждений.

Production deployment:

```text
SHA: c2a0e955b8747e3005da28e3fe9981f01fa45488
branch: release/demo-production-ready-20260723
reliability backup: /root/rospark-backups/analytics-goals-20260724T051826Z
host guard backup: /root/rospark-backups/analytics-host-guard-20260724T070217Z
```

Funnel entry deployment от 2026-07-25:

```text
SHA: 89c045d79535169527347c40c438971fb560995d
build ID: bYt3AjLTGWWnwnpg84KWl
backup: /root/rospark-backups/analytics-funnel-20260725T125007Z
rollback build: /var/www/rospark-release-builds/next-26740a5-20260725T125007Z
goal ID: 588884963
```

Production browser smoke выполнил по одному переходу:

```text
/resheniya/biznes-centry → /demo
/resheniya/biznes-centry → /quiz?source=request
```

Формы не отправлялись, PII не создавались. После обработки отчёт новой цели
зарегистрировал один целевой визит и четыре просмотра в нём. Оба перехода
выполнялись внутри одного визита, поэтому доставка цели подтверждена;
раздельную статистику `destination` / `landing_group` нужно проверить после
дальнейшего накопления данных.

## 4. Первый срез отчётов

Метрика обработала первые данные за 18–24 июля:

- `Demo — открыт сценарий`: 1 целевой визит, 11 достижений;
- остальные шесть целей: данных пока нет;
- отчёт параметров: 23 отправки;
- production-параметр
  `demo_name = guest_request_portal`: 4 события.

В статистику попали 10 локальных событий с
`http://127.0.0.1:3210/demo/gostevaya-zayavka`. Это QA-трафик, поэтому текущие
конверсия и количество достижений не являются бизнес-показателями.

Для исключения дальнейшего загрязнения опубликован host guard: внешний счётчик
запускается только на `www.xn--80aukedde.xn--p1ai`. Локальный browser smoke
подтвердил 0 запросов к `mc.yandex.ru`, а внешний production smoke после
выпуска подтвердил загрузку `tag.js?id=110980303` без ошибок консоли.

Полный SEO/GEO/conversion baseline записан в
`docs/site/GROWTH_DASHBOARD_20260724.md`.

## 5. Следующая проверка

После обработки данных Метрикой:

1. создать или подтвердить четыре ручные AI-цели: открытие, первый вопрос,
   вовлечённый диалог и рабочая заявка; основным бизнес-событием считать только
   `rospark_ai_lead_handoff`;
2. выполнить один privacy-safe smoke без заявки и убедиться, что события
   появляются только после analytics consent;
3. проверить event parameters `result` после первых действий оплаты и
   feedback;
4. разделить успешные и ошибочные результаты оплаты и feedback;
5. собрать demo-воронку:
   `каталог → сценарий → ключевое действие → feedback/форма`;
6. связать агрегированные client success и server-side
   статусы без PII;
7. добавить месячный SEO/GEO/conversion dashboard и ответственного за
   контроль.
8. подтвердить в отчёте два контрольных достижения `rospark_funnel_entry` и
   разрешённые параметры `destination` / `landing_group`.
