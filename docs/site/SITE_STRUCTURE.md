# РОСПАРК — структура сайта

Статус: рабочая документация v2
Дата актуализации: 2026-07-23
Проект: `rospark-frontend`
Production release: `881ff3cf846ae270042ccf5f55e281d98b124145`

## Назначение

Документ фиксирует актуальную карту сайта, публичные и служебные маршруты,
demo-систему, API и обязательный smoke-набор.

Текущий план развития:

`docs/site/SITE_DEVELOPMENT_ROADMAP_20260723.md`.

## Технологическая основа

- Next.js 14.2.35;
- App Router;
- React 18;
- TypeScript;
- Tailwind CSS;
- Node.js 22;
- SQLite через `better-sqlite3` для demo-домена;
- Nginx и PM2 в production.

Production build на 2026-07-23 генерирует 100 страниц/маршрутов.

## Основные публичные страницы

| URL | Назначение | Индексация |
|---|---|---|
| `/` | Главная коммерческая страница | index |
| `/o-kompanii` | Компания, процесс и доверие | index |
| `/contacts` | Контакты и юридическая информация | index |
| `/resheniya` | Хаб решений | index |
| `/resheniya/[slug]` | Коммерческие и процессные решения | index |
| `/resheniya/dlya-rukovoditeley` | Решение для руководителей | index |
| `/resheniya/dlya-inzhenerov` | Решение для инженеров | index |
| `/resheniya/dlya-sluzhby-bezopasnosti` | Решение для службы безопасности | index |
| `/resheniya/torgovye-centry` | Решение для торговых центров | index |
| `/resheniya/biznes-centry` | Решение для бизнес-центров | index |
| `/resheniya/skladskie-kompleksy` | Решение для складов | index |
| `/resheniya/zastroyschiki` | Решение для застройщиков/ЖК | index |
| `/resheniya/sravnenie-podhodov` | Сравнение подходов | index |
| `/vozmozhnosti` | Хаб возможностей | index |
| `/vozmozhnosti/[slug]` | Детальные страницы возможностей | index |
| `/oborudovanie` | Каталог оборудования | index |
| `/oborudovanie/[slug]` | Карточки оборудования | index |
| `/keysy` | Реализованные проекты | index |
| `/keysy/[slug]` | Карточки проектов | index |
| `/stati` | Экспертные статьи | index |
| `/stati/[slug]` | Статьи | index |
| `/demo` | Коммерческий хаб demo-системы | index |
| `/privacy` | Политика обработки персональных данных | index |
| `/soglasie-na-obrabotku-personalnyh-dannyh` | Текст согласия | index |
| `/quiz` | Квиз/форма заявки | noindex, follow |

## Demo-система

| URL | Назначение | Индексация |
|---|---|---|
| `/demo` | Выбор одного из трёх demo-сценариев | index |
| `/demo/gostevaya-zayavka` | Кабинет гостевых заявок арендатора | noindex |
| `/demo/arendar/[token]` | Публичная карточка/QR гостя | noindex |
| `/demo/web-skidki` | Оплата парковки гостя арендатором | noindex |
| `/demo/vladelec-parkovki` | Кабинет владельца парковки | noindex |

Внутренние кабинеты не добавляются в sitemap. Публичные token URL никогда не
добавляются в sitemap и не должны раскрывать телефон.

## Публичный контент

Актуальное количество опубликованного контента:

| Раздел | Количество |
|---|---:|
| Статьи | 9 |
| Кейсы | 30 |
| Возможности | 6 |
| Решения из Markdown | 3 |
| Карточки оборудования | 8 |

Файлы со `status: draft` сохраняются в репозитории, но исключаются из list,
detail, sitemap и static params.

## API заявок

| URL | Метод | Назначение |
|---|---|---|
| `/api/lead` | POST | Основная коммерческая заявка |
| `/api/quiz` | POST | Legacy endpoint, возвращает `410 Gone` |

`/api/lead` требует `consent: true` и может доставлять заявку в Email, Telegram
и внутренний MAX-чат. Реальный smoke выполняется только после подтверждения.

## Demo API

| URL | Назначение |
|---|---|
| `/api/demo/session` | Demo login/logout и cookie-сессия |
| `/api/demo/requests` | Список и создание гостевых заявок |
| `/api/demo/requests/[id]` | Действия с одной заявкой |
| `/api/demo/share/max` | Demo-отправка/уведомление MAX |
| `/api/demo/feedback-leads` | Согласованное сохранение контакта |
| `/api/demo/parking-sessions` | Поиск парковочной сессии |
| `/api/demo/web-discounts` | Оплата парковки гостя |
| `/api/demo/owner/summary` | Сводка владельца |
| `/api/demo/owner/tenants` | Реестр арендаторов |
| `/api/demo/owner/tenants/[tenantId]` | Детализация арендатора |
| `/api/demo/owner/guest-requests` | Реестр гостевых заявок |
| `/api/demo/owner/web-discounts` | Реестр оплат |
| `/api/demo/owner/operations` | Общий журнал операций |

Без demo-cookie закрытые API должны отвечать `401`.

## Ключевые области кода

| Файл / область | Назначение |
|---|---|
| `app/components/layout/` | Header, mobile navigation, footer |
| `app/components/landing/` | Главная страница |
| `app/components/forms/` | Формы и квиз |
| `app/components/content/` | JSON-LD, extended content, SEO/GEO-блоки |
| `app/components/demo/` | Общие компоненты demo |
| `app/components/demo/owner/` | Кабинет владельца |
| `app/lib/demo-*.ts` | Demo domain, SQLite, миграции и отчёты |
| `app/api/demo/` | Demo API |
| `lib/content-parser.ts` | Publication gate и Markdown parser |
| `app/sitemap.ts` | Индексируемые URL |
| `app/robots.ts` | Robots и ссылка на sitemap |

## Обязательный smoke коммерческого сайта

После изменений layout, navigation, metadata или content parser проверить:

1. `/`;
2. `/resheniya`;
3. `/vozmozhnosti`;
4. одну ролевую страницу;
5. одну объектную страницу;
6. одну карточку оборудования;
7. один кейс;
8. одну статью;
9. `/contacts`;
10. `/quiz`;
11. `/robots.txt`;
12. `/sitemap.xml`;
13. draft URL должен вернуть 404.

## Обязательный smoke demo

После изменений demo или SQLite проверить:

1. `/demo`;
2. вход `TEST/TEST`;
3. создание и отмену собственной заявки;
4. публичный token и отсутствие телефона;
5. неизвестный token → 404;
6. поиск `D-1042`;
7. оплату → 201;
8. повторную/конкурентную оплату → 409;
9. owner summary;
10. owner previous/current period;
11. tenant/request/payment/operations registries;
12. A/B session isolation;
13. consent required;
14. feedback lead idempotency;
15. `noindex` внутренних кабинетов;
16. отсутствие внутренних URL в sitemap.

## Мобильная проверка

Обязательные ширины:

- 360 px;
- 375 px;
- 390 px;
- 400 px;
- 414 px;
- 430 px.

Проверить:

- отсутствие горизонтального scroll;
- header и меню;
- крупные заголовки;
- формы, таблицы, drawers и modal;
- keyboard focus и scroll lock;
- периодические переключатели;
- изображения и QR;
- кнопки с минимальной высотой касания;
- пустые, loading и error states.

## Проверки перед передачей блока

```bash
npm run typecheck
npm run lint
npm run build
git diff --check
```

Demo server tests:

```bash
node scripts/test_demo_stage_b.mjs
node scripts/test_demo_stage_c.mjs
```

Оба теста запускаются только против изолированного preview и отдельной
`DEMO_REQUESTS_DB_PATH`.
