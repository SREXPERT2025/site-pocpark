# РОСПАРК — план AI-виджета для сайта

Дата фиксации: 2026-07-23
Статус: AI Core development frozen с 2026-08-27; Public AI Core выключен,
обычные посетители остаются на legacy-маршруте.
Связанный проект: `/Volumes/POCPARK_AI_DATA/POCPARK_AI`.

## Freeze checkpoint — 2026-08-27

Дальнейшая разработка текущей ветки AI Core остановлена решением владельца.
Эта фиксация является инженерным checkpoint, а не release/stable-отметкой.
Сборка не является release-ready, её Public AI Core rollout
отменён/отложен.

### Последняя экспериментальная связка

- Site: `96d0de31af04f4f8e8f888c53e019a7572bbe3f8`;
- Runtime: `32afc91b3358c115ae03fc3d20db96fef5e0fbfe`;
- Contract: `4d75773d60f3453279cbfcee1453f54b15b66567`;
- Gateway: `e0b4edd34d5fecaf8850e64aa03a33c2661b51f9`;
- immutable package:
  `PUBLIC_AI_CORE_CANARY_32AFC91B_96d0de3_20260827T152548Z.tar.gz`;
- package SHA-256:
  `c09ff937a6c56f999c6e073d295c586a266025aa7a977f879edfef6357030178`.

Локальный package и rollback manifest сохранены в
`/Volumes/POCPARK_AI_DATA/POCPARK_SITE_AI/generated/canary/`.

### Production state на момент freeze

- `AI_CORE_OWNER_CANARY_ENABLED=false`;
- `AI_CORE_PUBLIC_ENABLED=false`;
- normal visitors: `legacy`;
- Public HTTPS: `200`;
- readiness после выключения Owner Canary: `3/3`;
- production deploy в рамках freeze: `0`;
- live/model requests после остановки: `0`.

Последнее подтверждённое выключение Owner Canary завершено
`2026-08-27T16:38:53Z` со статусом `OWNER_CANARY_ROLLBACK=pass`.

### Проверки и итог live smoke

- stateful T1–T6 для immutable сборки: offline `6/6 PASS`;
- Historical Regression Pack для immutable сборки: offline `10/10 PASS`;
- Runtime matrix: offline `187/187 PASS`;
- Historical Live Smoke: `FAIL`;
- HR-01: `PASS`;
- HR-02: основной input не запускался, потому что обязательный context setup
  уже показал semantic failure;
- остальные live Historical scenarios: не запускались по fail-fast policy;
- exact failing trace SHA-256:
  `bff994d74f76c534d73ab5ebb957d6e0d28960f4efd8699b604799bcb4123f68`.

Offline PASS не отменяет последующий live FAIL и не даёт разрешения на
публичный rollout.

### Подтверждённые unresolved defects

1. Context Integrity не извлёк из текущего сообщения
   `current_system=new_build` и
   `gate_requires_payment_confirmation=true`.
2. Runtime Evaluator содержал внутренний `evaluation_status=fail`, но внешняя
   оболочка вернула PASS и Runtime publication получила `allowed`.
3. Candidate был фактически изменён примерно на `31.26%`, однако telemetry
   сообщила `repair.applied=false`, `method=none`, а Site source был указан как
   `raw_model`.
4. В результате был опубликован неверный следующий вопрос по уже сообщённому
   параметру объекта.

### Rollback readiness

- rollback Site: `0fcee4059625767541a8d07015d36547c6ec8507`;
- rollback Runtime: `ecb7de690dd361de0ff03de9e0687cd16cf28ff9`;
- Contract после rollback:
  `4d75773d60f3453279cbfcee1453f54b15b66567`;
- package содержит checksum-проверенные Site/Runtime rollback archives и
  `ROLLBACK_PLAN.json`;
- последний VPS backup:
  `/root/rospark-backups/canary-32afc91b-vps-20260827T162747Z-1283637`;
- flag-only stop:
  `/root/rospark-owner-canary-32afc91b-auto-off.sh`;
- full Site/Runtime rollback:
  `/root/rospark-canary-32afc91b-full-rollback.sh`.

### Freeze boundary

- статус: `AI Core development frozen`;
- никаких новых исправлений, Canary Assembly, live canary или Public AI Core
  rollout в этой ветке;
- никаких functional code changes ради freeze;
- normal visitors остаются на `legacy`;
- следующая работа выполняется как отдельный проект/ветка **Agent Pilot** и не
  является продолжением текущей AI Core ветки.

## ROSPARK Agent Pilot

Статус: `architecture preparation`.

Agent Pilot — отдельный будущий разговорный AI-менеджер для строго
ограниченного реального трафика. Он не заменяет Legacy автоматически, не
изменяет frozen AI Core и не наследует его Runtime/evaluator/repair backlog.

Архитектурные решения и safety boundary зафиксированы отдельно:

- `docs/architecture/AGENT_PILOT_ARCHITECTURE_BOUNDARY_V1.md`.

Принятые границы текущего этапа:

- Legacy остаётся production default;
- Frozen AI Core остаётся историческим checkpoint с Public/Owner flags OFF;
- Agent Pilot получает отдельный repository/worktree и отдельные contracts;
- все capabilities используют explicit allow-list, `default=deny`;
- знания доступны только read-only через versioned source registry;
- raw conversation остаётся authoritative evidence, structured memory не
  должна терять исходные пользовательские факты;
- Orchestrator один принимает final decision, subagents только советуют;
- hard safety gate проверяет schema, permissions, injection, secrets, timeout,
  malformed output и duplicates, но не копирует старый repair loop;
- любой Pilot failure изолируется и даёт один Legacy fallback;
- traces не содержат private chain-of-thought;
- live conversation export допускается только через отдельный privacy-reviewed
  обезличивающий pipeline;
- functional implementation, model choice, prompts, subagents, deploy и live
  traffic не входят в текущий этап.

Следующий шаг возможен только по отдельному owner approval: передать документ
Agent Pilot implementer для scaffolding/contracts/offline tests в новой ветке.

## 1. Цель

Создать на сайте короткий диалоговый виджет, который:

- отвечает на подтверждённые вопросы о РОСПАРК;
- помогает выбрать релевантный раздел сайта или demo-сценарий;
- выясняет тип объекта и задачу посетителя;
- по желанию посетителя собирает минимальную карточку обращения;
- передаёт обращение человеку только после отдельного согласия;
- не выдаёт себя за инженера, оператора парковки или автономную CRM.

## 2. Что уже проверено

В соседнем проекте создан отдельный `cascade v2` test-only стенд:

- публичный виджет выключен;
- рабочий OpenClaw `main` не изменён;
- маршрутизация детерминированная;
- Security и CRM используют контролируемые ветки;
- FAQ применяется только как точный утверждаемый шаблон;
- Fact Gate применяется ко всем маршрутам;
- CRM работает через локальный симулятор;
- внешние отправки отсутствуют.

Итог полного теста:

| Показатель | Результат |
|---|---:|
| Сообщения | 230/230 |
| Опасные флаги | 0 |
| Ошибки маршрута | 0 |
| Ошибки API | 0 |
| Ложные handoff | 0 |
| Внешние отправки | 0 |
| Qwen3.6-27B | 196 |
| Security-шаблоны | 17 |
| CRM-контроллер | 14 |
| FAQ-шаблоны | 3 |

Ограничение: средняя полная задержка около 17 секунд, время до первого
потокового фрагмента большой модели около 13,6 секунды. Для публичного
коммерческого виджета это слишком долго.

## 3. Архитектурная граница

Публичный виджет нельзя подключать к широкому агенту `main`.

Нужен отдельный профиль, например `sales-widget`, со следующими разрешёнными
действиями:

```text
knowledge_search
lead_upsert
handoff_create
manager_notify
```

Каждое действие должно иметь узкий контракт.

Запрещены:

- terminal/exec;
- файловая система Mac и сервера;
- browser/computer control;
- управление Codex;
- чтение других сессий и переписок;
- установка skills/plugins;
- произвольные сетевые запросы;
- команды парковочному оборудованию;
- изменение тарифов, доступа, заявок или шлагбаума;
- утверждение, что менеджер уведомлён, без успешного tool result.

## 4. Источник знаний

До интеграции нужна версия базы знаний `widget-kb-v1`.

В неё входят только утверждённые материалы:

- позиционирование РОСПАРК;
- структура услуг и решений;
- подтверждённые возможности продукта;
- demo-сценарии;
- проверенные кейсы;
- контакты и порядок обращения;
- утверждённый FAQ;
- claim ledger цен, сроков, количества объектов, географии и интеграций.

В базу не входят:

- внутренние переписки;
- неподтверждённые черновики;
- технические секреты;
- production-конфигурация;
- персональные данные клиентов;
- внутренние инструкции оборудования;
- предложения модели без проверки человеком.

RAG должен передавать только релевантные фрагменты, а не весь архив.

## 5. Контракт ответа

Виджет должен:

- отвечать по-русски;
- давать короткий прямой ответ;
- явно отделять подтверждённый факт от вопроса к специалисту;
- не придумывать цену, срок, комплектацию, интеграцию или гарантию;
- не превращать симптом в диагноз;
- не обещать звонок, выезд или коммерческое предложение;
- предлагать релевантную страницу или demo;
- не запрашивать контакт до появления реального намерения передать обращение;
- продолжать справочный диалог, если посетитель не хочет оставлять данные.

Без подтверждённого факта используется формулировка:

```text
Это нужно проверить со специалистом для конкретной конфигурации объекта.
```

## 6. Минимальная карточка обращения

Рекомендуемые поля:

```text
session_id
created_at
source_page
utm
city
object_type
entrances
exits
current_system
task_summary
deadline_context
name
contact
consent
consent_version
status
```

Обязательны для передачи:

- имя;
- содержательная задача;
- объект или тип объекта;
- контакт;
- отдельное `consent: true`.

Для справочного диалога имя и контакт не требуются.

Не передавать в аналитику контакт, госномер, текст с персональными данными и
полную историю диалога.

## 7. Данные и согласие

До пилота определить:

- текст согласия;
- версию согласия;
- срок хранения диалога;
- срок хранения лида;
- способ удаления;
- владельца данных;
- права доступа;
- журнал tool actions;
- opt-out;
- порядок обработки запросов субъекта персональных данных.

Согласие на передачу лида не должно быть условием получения справочного ответа.

## 8. Размещение

Браузер не должен обращаться напрямую к локальному Ollama/OpenClaw.

Рекомендуемый контур:

```text
браузер
→ site widget API
→ authentication/rate limit/session gate
→ restricted AI gateway
→ RAG / route gate / model
→ fact gate
→ response
```

Для tool action:

```text
model intent
→ deterministic validation
→ consent check
→ narrow server tool
→ durable result
→ confirmed user message
```

Для закрытого пилота подтверждено размещение на Mac Studio. Браузер не
обращается к локальной модели напрямую: между сайтом и моделью остаётся
restricted gateway.

Для постоянного публичного размещения позднее нужно выбрать:

- постоянный защищённый сервер;
- локальный Mac Studio через отдельно согласованный безопасный канал;
- облачный fallback;
- гибридная схема.

Публичный сервис не должен зависеть от случайно включённого локального процесса.

## 9. Безопасность

Обязательные меры:

- rate limit вне памяти одного процесса;
- ограничение длины сообщения и истории;
- защита от prompt injection;
- allowlist RAG-источников;
- sanitization вывода;
- запрет HTML/script injection;
- CSRF/origin checks для lead actions;
- masking PII в логах;
- отдельные operational и audit logs;
- timeout/circuit breaker;
- безопасный fallback на форму/контакты;
- мониторинг ложных handoff;
- ручной review критических диалогов.

## 10. Аналитика

Без PII измерять:

- открытие виджета;
- первый вопрос;
- долю ответов FAQ/RAG/model;
- latency и time-to-first-token;
- fallback/escalation rate;
- переходы на страницы и demo;
- начало и завершение consent flow;
- созданные лиды;
- подтверждённые handoff;
- ошибки маршрута и tool actions;
- долю диалогов без ответа.

Целевые показатели пилота определяются после baseline. Нельзя объявлять
качество по одному числу `0 dangerous flags`.

## 11. Этапы

### AI-WIDGET-0 — документация и знания

- утвердить назначение виджета;
- утвердить FAQ;
- собрать `widget-kb-v1`;
- создать claim ledger;
- определить consent/data policy;
- определить владельца пилота.

Статус принятого владельцем документационного пакета на 2026-07-27:

- создан allowlist актуальных источников сайта;
- создан claim ledger с разделением `ALLOW`, `CONDITIONAL`, `OWNER_REVIEW` и
  `DENY`;
- старый FAQ пересобран в короткий site-synced кандидат;
- справочный диалог отделён от аналитики и передачи лида;
- подтверждены сроки: активная сессия 24 часа, тестовый
  transcript до 7 дней, operational logs без PII до 14 дней, обычный лид
  60 дней, demo feedback 30 дней;
- MAX и production lead registry запрещены до закрытого коммерческого пилота;
- имя подтверждено как обязательное для реального обращения, поэтому контракт
  согласован с текущим `/api/lead`;
- подтверждены собственная разработка и производство, работа с 2010 года и
  более 350 реализованных объектов;
- закрытый пилот подтверждён на Mac Studio, постоянное публичное размещение
  gateway будет решаться позднее.

Пакет находится в `docs/site/ai-widget/` и не подключён к runtime.

Решения владельца зафиксированы в
`docs/site/ai-widget/WIDGET_OWNER_DECISIONS_20260727.md`.

Контрольный статус 2026-07-27:

- добавлен изолированный `cascade v3` adapter, который использует старый
  test-only движок только после проверки его SHA-256;
- рабочий `POCPARK_AI`, OpenClaw `main`, MAX, production registry и VPS не
  изменялись;
- adapter принимает только локальный `Qwen3.6-27B` через loopback Ollama;
- короткий контрольный набор из 15 сценариев прошёл 15/15: опасные ошибки,
  ошибки маршрута, API errors, ложные handoff и внешние отправки отсутствуют;
- отдельная проверка подтвердила блокировку карточки без имени;
- вопросы о собственном производстве, работе с 2010 года и более 350 объектах
  направляются в точные FAQ-шаблоны;
- полный прогон завершён 230/230 без ошибок маршрута, Fact Gate, API, ложных
  handoff и внешних отправок;
- ручной QA обнаружил и закрыл одно ценовое отклонение `I015`;
- ценовая регрессия прошла 17/17, boundary-регрессия — 11/11;
- FAQ получил статус `approved for closed pilot`, но не разрешён для
  публичного запуска.

### AI-WIDGET-1 — закрытый стенд

- отдельный restricted profile;
- локальный gateway и модель без CRM-инструментов;
- никаких внешних отправок;
- повторный тест на актуальной базе сайта;
- независимый просмотр всех критических ответов;
- новые перефразированные injection/security тесты.

Технический дизайн:
`docs/site/AI_WIDGET_1_TECHNICAL_DESIGN_20260727.md`.

Preview сейчас не имеет общего access control: `noindex` не закрывает URL.
Владелец принял этот риск для короткой проверки один–три дня и отказался от
дополнительной авторизации.

UI реализуется не отдельной страницей, а классическим плавающим виджетом:
кнопка справа снизу присутствует на разрешённых страницах, открывает боковую
панель и сохраняет диалог при навигации. В `/admin` виджет скрыт.

Первый UI/API-каркас использует временный лимит 10 запросов в минуту на адрес
в памяти одного процесса. Это допустимо только для короткого preview; перед
VPS-релизом лимит должен быть вынесен во внешний или persistent storage.

Статус на 2026-07-27: этап выпущен на Mac Studio preview в версии
`146847aa11324565d2e0fd94c787578efa0ba25c`. Плавающий UI, loopback gateway,
точные FAQ, Fact Gate, локальная модель и kill switch работают. MAX, CRM,
production lead registry и VPS не затронуты. Приёмка зафиксирована в
`docs/site/ai-widget/AI_WIDGET_1_PREVIEW_ACCEPTANCE_20260727.md`.

### AI-WIDGET-2 — технический пилот

- widget UI на непубличном маршруте;
- site widget API;
- rate limit и session storage;
- streaming;
- аналитика без PII;
- handoff всё ещё через тестовый инструмент;
- desktop/mobile/a11y review.

Статус 2026-07-28: в разработке подэтап `AI-WIDGET-2T`:

- полный synthetic transcript в отдельной SQLite-базе максимум семь дней;
- детерминированный сбор имени, тестового контакта, объекта и задачи;
- отдельное подтверждение synthetic-данных;
- тестовая карточка и preview будущего сообщения MAX;
- никакой внешней отправки и записи в production lead registry;
- служебный просмотр для Андрея и Сергея, удаление только для Андрея;
- точные внутренние ссылки из server-side allowlist;
- ручной прогон директором и коллегами на `srtestrealme.ru:3001` до VPS-gate.

### AI-WIDGET-3 — закрытый коммерческий пилот

- тестовая организация/реестр;
- реальный lead tool с отдельным consent;
- подтверждение менеджера;
- SLA и владелец;
- ограниченный трафик;
- ежедневный review диалогов.

Перед `AI-WIDGET-3` выполняется `CRM-INTEGRATION-001` discovery:

- проверить доступность API действующей amoCRM;
- определить pipeline, поля, пользователей и правила дублей;
- передавать карточку через идемпотентную очередь с retry;
- хранить `amoCRM lead ID` в локальном реестре;
- использовать amoCRM как мастер статусов и распределения между менеджерами;
- не передавать полный transcript, только краткое резюме и внутреннюю ссылку.

### AI-WIDGET-4 — публичный запуск

Возможен только если:

- FAQ и знания утверждены;
- задержка приемлема;
- нет неисследованных high/critical security findings;
- tool actions идемпотентны;
- consent и удаление данных проверены;
- fallback работает;
- red-team и ручная приёмка пройдены;
- есть rollback/kill switch;
- директор отдельно подтвердил публикацию.

Статус выпуска на 2026-07-28:

- директор подтвердил переход от закрытого preview к подготовке полноценной
  production-версии для VPS;
- production-интерфейс не показывает слова «тест», «закрытый тест» и
  предупреждение о вымышленных данных;
- публичный API отделён от legacy preview routes;
- рабочая заявка сохраняется в существующий lead registry, назначается Сергею
  и ставится в существующий MAX outbox;
- имя и телефон принимает отдельная форма VPS и не передаёт их AI-модели;
- полный диалог хранится в отдельной SQLite на VPS до семи дней;
- persistent rate limit, fallback, cleanup timer и kill switch реализованы;
- Андрей и Сергей видят все production-диалоги; удаление доступно только
  Андрею;
- Mac Studio получил отдельный production-профиль и отдельный loopback-процесс,
  поэтому дальнейшая настройка ответов не требует релиза сайта;
- создан production-runbook с backup, readiness, acceptance и rollback;
- Tailscale HTTPS между VPS и production gateway Mac Studio подтверждён;
- VPS переключён на
  `c65b1b3cee0eb946b2f28b7c59aeaf003681477c`;
- desktop/mobile и отсутствие виджета в `/admin` проверены на production;
- заявка `RSP-42254644` зарегистрирована, назначена Сергею и доставлена в
  `РОСПАРК ОТДЕЛ ПРОДАЖ` ровно один раз;
- первый uncached модельный ответ остаётся медленным (`72610 ms`); Nginx
  принимает ответы до `120s`, а оптимизация задержки остаётся открытой.

Локальная evidence-приёмка:
`docs/site/ai-widget/AI_WIDGET_PRODUCTION_CANDIDATE_ACCEPTANCE_20260728.md`.

Production evidence:
`docs/site/ai-widget/AI_WIDGET_PRODUCTION_ACCEPTANCE_20260728.md`.

## 12. Ближайший следующий шаг

Собрать первые реальные диалоги, ускорить uncached ответы, расширять быстрые
FAQ-маршруты на Mac Studio и добавить сохраняемое подтверждение внешней
доставки MAX. Затем выполнить `CRM-INTEGRATION-001` discovery. Изменения
промпта, FAQ и маршрутизации Mac Studio не требуют повторного VPS-релиза, пока
контракт API не меняется.
