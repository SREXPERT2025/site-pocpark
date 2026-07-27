# AI-WIDGET-1 — технический дизайн закрытого стенда

Дата: 2026-07-27
Статус: проект реализации, runtime не включён.
Размещение: Mac Studio, preview `srtestrealme.ru:3001`.

## 1. Проверенная исходная точка

- `https://srtestrealme.ru:3001/demo` отвечает `200`;
- preview имеет `noindex`, `no-store` и security headers;
- HTTP authentication на всём preview отсутствует;
- `noindex` не является контролем доступа;
- существующий `TEST/TEST` относится к продуктовой demo-авторизации, а не к
  служебному доступу AI-пилота;
- маршрута `/demo/ai-konsultant` и AI API сейчас нет.

## 2. Проектируемый контур

```text
браузер сотрудника
→ одноразовая/ротируемая служебная ссылка
→ HttpOnly pilot session
→ /demo/ai-konsultant
→ /api/demo/ai-widget/chat
→ restricted gateway на loopback Mac Studio
→ deterministic route / FAQ / Fact Gate
→ локальный Qwen3.6-27B
```

Браузер не получает адрес Ollama, gateway secret, системный prompt или файлы
базы знаний.

## 3. Предлагаемый доступ без отдельной формы логина

Предлагаемый flow:

1. директор получает длинную ротируемую pilot-ссылку;
2. сервер проверяет токен только в момент первого входа;
3. устанавливает `HttpOnly`, `Secure`, `SameSite=Lax` cookie;
4. сразу перенаправляет на чистый URL без токена;
5. служебная сессия живёт максимум 24 часа;
6. прямой вход без cookie получает нейтральный `404`;
7. замена server-side secret немедленно отзывает все старые ссылки и сессии.

Токен запрещено:

- помещать в Git, HTML, JavaScript bundle или аналитику;
- сохранять в localStorage;
- показывать в интерфейсе после обмена;
- передавать в Ollama или текст диалога.

## 4. Feature flags и kill switch

Runtime включается только при одновременном наличии:

```text
AI_WIDGET_PILOT_ENABLED=true
AI_WIDGET_PILOT_ACCESS_SECRET=<server-only>
AI_WIDGET_GATEWAY_URL=http://127.0.0.1:<port>
AI_WIDGET_GATEWAY_SECRET=<server-only>
```

Если любой параметр отсутствует:

- UI отвечает `404`;
- API отвечает `404`;
- gateway не вызывается;
- fallback не создаёт заявку и не включает внешний канал.

`AI_WIDGET_PILOT_ENABLED=false` — основной kill switch.

## 5. Маршруты

### UI

`/demo/ai-konsultant`

- `noindex, nofollow, nocache`;
- без Метрики и иных внешних скриптов;
- не добавляется в sitemap и публичную навигацию;
- показывает явную маркировку «закрытый тест»;
- не предлагает реальные цены и не обещает действия менеджера.

### Server API

`POST /api/demo/ai-widget/chat`

- требует pilot cookie;
- проверяет `Origin`;
- принимает JSON фиксированной схемы;
- ограничивает размер сообщения и истории;
- передаёт gateway только текущий безопасный контекст;
- возвращает streaming-ответ;
- не пишет текст сообщения в operational log.

`POST /api/demo/ai-widget/lead-simulate`

- требует отдельного явного согласия;
- требует имя, контакт, объект и содержательную задачу;
- работает только с локальным симулятором;
- всегда маркирует результат как `TEST`;
- не использует MAX, email, production registry и `/api/lead`.

## 6. Сессии и данные

- pilot access session — максимум 24 часа;
- анонимная диалоговая сессия — максимум 24 часа;
- активный контекст хранится server-side;
- полный transcript по умолчанию не сохраняется;
- отдельно маркированный синтетический QA transcript — максимум 7 дней;
- operational logs без PII и текста — максимум 14 дней;
- контакт, госномер и текст сообщения не попадают в аналитику;
- cleanup запускается по расписанию и проверяется отдельным тестом.

## 7. Ограниченный gateway

Gateway разрешает только:

```text
faq_lookup
knowledge_lookup
lead_simulate
```

Запрещены:

- terminal/exec и filesystem;
- browser/computer control;
- Codex и другие агенты;
- OpenClaw `main`;
- произвольная сеть;
- реальные CRM/MAX/email;
- команды парковочному оборудованию;
- чтение других сессий и заявок.

Gateway принимает запросы только с loopback и с отдельным server-to-server
secret. Ollama не публикуется наружу.

## 8. Защитные ограничения API

- allowlist `Origin`;
- server-side session validation;
- request ID без PII;
- rate limit вне памяти одного Next.js процесса;
- идемпотентность `lead-simulate`;
- timeout и отмена generation;
- лимит длины ответа;
- plain-text/Markdown sanitization;
- запрет произвольного HTML;
- нейтральная ошибка без внутренних путей, prompt и названий файлов;
- audit только для tool action, без текста диалога.

## 9. UI закрытого пилота

Минимальный интерфейс:

- приветствие и граница возможностей;
- быстрые безопасные вопросы;
- потоковый ответ;
- кнопка остановки генерации;
- явный fallback «перейти к контактам»;
- отдельный consent flow тестовой карточки;
- кнопка очистки текущего диалога;
- отметка времени истечения сессии;
- предупреждение не вводить реальные персональные данные в закрытом тесте.

Дополнительный логин внутри виджета не создаётся.

## 10. Acceptance gate

До показа владельцу должны пройти:

1. unit tests access cookie, origin, size limits и kill switch;
2. тест отсутствия AI-route при выключенном flag;
3. browser smoke без pilot session → `404`;
4. browser smoke со служебной ссылкой → чистый URL и HttpOnly cookie;
5. streaming smoke через loopback gateway;
6. 26 точных FAQ-шаблонов;
7. price, prompt injection, PII и false handoff regressions;
8. lead simulator без внешней отправки;
9. desktop/mobile/a11y review;
10. cleanup 24h/7d/14d;
11. подтверждение, что Метрика, MAX и production registry не задействованы.

## 11. Граница этапа

`AI-WIDGET-1` заканчивается закрытым test-only стендом на Mac Studio.

Он не разрешает:

- перенос на VPS;
- публичную ссылку;
- реальный lead handoff;
- подключение MAX;
- использование рабочего OpenClaw;
- включение без отдельной приёмки директора.
