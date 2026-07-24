# РОСПАРК — цели Яндекс Метрики

Дата настройки: 2026-07-24  
Задача: `ANALYTICS-001-C`  
Счётчик: `110980303`  
Владелец: Yandex ID `radicom`  
Статус: цели созданы; hard load и SPA-отправка подтверждены на production;
первый технический dashboard собран; production-host guard опубликован;
накопление не-QA данных продолжается

## 1. Созданные цели

В production-счётчике используется 7 из 200 доступных целей.

| Название в Метрике | Тип и условие | Что измеряет |
|---|---|---|
| Demo — посещение каталога | посещение страниц, URL равен `https://www.xn--80aukedde.xn--p1ai/demo` | вход в индексируемый demo-хаб |
| Demo — открыт сценарий | JavaScript event содержит `rospark_demo_scenario_view` | открытие любого из трёх demo-сценариев |
| Demo — создана гостевая заявка | JavaScript event содержит `rospark_demo_request_create` | успешное создание demo-заявки |
| Demo — завершена попытка оплаты | JavaScript event содержит `rospark_demo_payment_complete` | завершение demo-операции с результатом `success` или `error` |
| Demo — открыта детализация владельца | JavaScript event содержит `rospark_demo_owner_detail_view` | открытие обезличенной детализации арендатора |
| Demo — результат feedback-лида | JavaScript event содержит `rospark_demo_feedback_lead` | завершение сохранения feedback lead с результатом `saved` или `failed` |
| Форма — успешная отправка | JavaScript event содержит `rospark_form_success` | подтверждённый клиентом успешный ответ lead API |

Имена целей оплаты и feedback намеренно нейтральные. Текущие события содержат
поле `result`, поэтому без дополнительного условия цель включает и успешный,
и неуспешный результат. Для отчёта успехи нужно отделять по event parameters
либо позднее ввести отдельные success-only события.

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

1. проверить event parameters `result` после первых действий оплаты и
   feedback;
2. разделить успешные и ошибочные результаты оплаты и feedback;
3. собрать demo-воронку:
   `каталог → сценарий → ключевое действие → feedback/форма`;
4. после `LEAD-OPS-002` связать агрегированные client success и server-side
   статусы без PII;
5. добавить месячный SEO/GEO/conversion dashboard и ответственного за
   контроль.
