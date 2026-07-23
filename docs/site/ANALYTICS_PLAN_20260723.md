# РОСПАРК — план аналитики и demo-воронки

Дата: 2026-07-23
Задача: `ANALYTICS-001`
Статус: локальная provider-neutral основа реализована и проверена; внешний
счётчик не подключён

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

## 4. Что пока нельзя считать

Без внешнего потребителя и серверной связи пока нельзя достоверно получить:

- уникальных пользователей и сессии;
- источник первого и последнего касания;
- pageview и переходы с контентных страниц;
- завершение пути между разными demo-страницами;
- связь client event с фактически сохранённым/обработанным lead;
- конверсию `lead → assigned → contacted → closed`;
- рекламные расходы, цели и атрибуцию кампаний;
- регулярный SEO/GEO/conversion dashboard.

Локальный `dataLayer` — это интерфейс интеграции, а не работающая аналитика.

## 5. Следующие этапы

### `ANALYTICS-001-B` — решение и внешний loader

Нужно подтвердить:

1. основной сервис: Яндекс Метрика, GTM/GA4 или другой;
2. владельца аккаунта и резервного администратора;
3. production ID счётчика;
4. допустимые функции счётчика;
5. срок хранения и правила доступа;
6. требуется ли отдельное согласование с юристом;
7. способ изменения/отзыва cookie-согласия.

После решения:

- хранить ID в environment, не в секретной документации;
- загружать внешний script только после `accepted`;
- не включать Webvisor, session replay, advertising features или
  cross-domain tracking без отдельного решения;
- проверить CSP и production headers;
- проверить события в test property;
- убедиться, что отказ не создаёт сетевых запросов аналитики.

### `ANALYTICS-001-C` — сквозная воронка

- фиксировать безопасный landing context;
- добавить переходы в `/demo` и `/quiz`;
- связать client success с server-side lead receipt без PII в аналитике;
- после `LEAD-OPS-002` добавить агрегированные статусы обработки;
- настроить цели и ежемесячный dashboard;
- сравнить SEO landing pages, demo completion и обработанные leads.

## 6. Критерий готовности

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
