# widget-kb-v1 — реестр источников

Дата: 2026-07-27
Статус: кандидат `AI-WIDGET-0`.

## 1. Приоритет источников

При конфликте применяется следующий порядок:

1. юридические страницы и действующий программный контракт;
2. зафиксированные решения директора о продуктовых фактах;
3. опубликованные страницы текущего сайта;
4. принятые опубликованные статьи и demo-описания;
5. опубликованные карточки кейсов и оборудования;
6. внутренняя маркетинговая документация;
7. старые материалы соседнего AI-проекта.

Нижестоящий источник не может расширять обещание из вышестоящего.

## 2. Основная allowlist

| ID | Источник | Разрешённое назначение |
|---|---|---|
| `SRC-POSITIONING` | `docs/marketing/POSITIONING.md` | Позиционирование, аудитории, общий подход к проекту |
| `SRC-COMPANY` | `app/(narrow)/o-kompanii/page.tsx` | Роль бренда, юридическое лицо, адреса, направления работы |
| `SRC-CONTACTS` | `app/(narrow)/contacts/page.tsx` | Публичные способы связи |
| `SRC-PRIVACY` | `app/(narrow)/privacy/page.tsx` | Оператор данных, цели обработки, права пользователя |
| `SRC-CONSENT` | `app/(narrow)/soglasie-na-obrabotku-personalnyh-dannyh/page.tsx` | Действующий общий текст согласия сайта |
| `SRC-LEAD-CONTRACT` | `app/api/lead/route.ts`, `app/lib/lead-registry-service.ts` | Фактические обязательные поля и версия согласия |
| `SRC-LEAD-RETENTION` | `app/lib/lead-registry-core.ts` | 60 дней для обычного лида, 30 дней для demo feedback |
| `SRC-OWNER-20260727` | `docs/site/ai-widget/WIDGET_OWNER_DECISIONS_20260727.md` | Собственная разработка и производство, работа с 2010 года, более 350 объектов, обязательность имени, цены, retention, размещение пилота и подтверждённая логика собственного идентификатора |
| `SRC-DEMO-CATALOG` | `app/(narrow)/demo/page.tsx` | Назначение и границы демонстрационных сценариев |
| `SRC-DEMO-GUEST` | `content/stati/gostevoy-dostup-na-parkovku.md` | Гостевая заявка и границы demo |
| `SRC-DEMO-PAYMENT` | `content/stati/oplata-parkovki-gostey.md` | Оплата гостя арендатором и границы реального проекта |
| `SRC-DEMO-OWNER` | `content/stati/otchetnost-vladelca-parkovki.md` | Управленческая отчётность и ограничения demo-данных |
| `SRC-ANPR` | `content/vozmozhnosti/raspoznavanie-nomerov.md`, `content/stati/raspoznavanie-nomerov-dlya-parkovki.md` | Распознавание номеров и факторы качества |
| `SRC-GUESTS` | `content/vozmozhnosti/gostevie-klienti.md` | Гостевой доступ |
| `SRC-TEMPORARY` | `content/vozmozhnosti/razovie-klienti.md` | Разовые посетители и идентификаторы |
| `SRC-PERMANENT` | `content/vozmozhnosti/postoyannie-klienti.md` | Постоянные пользователи и абонементные сценарии |
| `SRC-TENANTS` | `content/vozmozhnosti/arendnie-klienti.md` | Арендаторы и организационные сценарии |
| `SRC-ONLINE-PAYMENT` | `content/vozmozhnosti/onlain-oplata.md`, `content/stati/onlain-oplata-parkovki-kak-vnedrit.md` | Варианты онлайн-оплаты и проектные ограничения |
| `SRC-INTEGRATIONS` | `content/resheniya/integracii-i-api.md` | Вопросы, которые нужно уточнить для интеграции |
| `SRC-COST` | `content/resheniya/stoimost-avtomatizacii-parkovki.md` | Факторы стоимости без публичного обещания цены |
| `SRC-WORKFLOW` | `content/resheniya/kak-my-rabotaem.md` | Этапность обследования и внедрения |
| `SRC-BC` | `app/(narrow)/resheniya/biznes-centry/page.tsx` | Общий сценарий бизнес-центра |
| `SRC-TC` | `app/(narrow)/resheniya/torgovye-centry/page.tsx` | Общий сценарий торгового центра |
| `SRC-WAREHOUSE` | `app/(narrow)/resheniya/skladskie-kompleksy/page.tsx` | Общий сценарий складского комплекса |
| `SRC-DEVELOPER` | `app/(narrow)/resheniya/zastroyschiki/page.tsx` | ЖК и объекты застройщиков |
| `SRC-ROLE-MANAGER` | `app/(narrow)/resheniya/dlya-rukovoditeley/page.tsx` | Вопросы собственника и руководителя |
| `SRC-ROLE-ENGINEER` | `app/(narrow)/resheniya/dlya-inzhenerov/page.tsx` | Технические исходные данные |
| `SRC-ROLE-SECURITY` | `app/(narrow)/resheniya/dlya-sluzhby-bezopasnosti/page.tsx` | Роли, события и исключения |
| `SRC-SITE-LINKS` | `docs/site/ai-widget/WIDGET_SITE_LINK_CATALOG_V1.md`, `app/sitemap.ts` | Подтверждённые адреса разделов сайта и правила навигационных ответов |

## 3. Кейсы

Файлы `content/keysy/*.md` разрешены только для ответа о конкретном
опубликованном объекте.

Правила:

- использовать точное название и сведения из одной карточки;
- не переносить результат одного объекта на другой;
- не превращать количество машин, состав оборудования или срок внедрения в
  общую гарантию РОСПАРК;
- не суммировать карточки для заявления об общем количестве проектов;
- не использовать карточку со `status: draft`;
- при сомнительном или противоречивом показателе направлять вопрос менеджеру.

## 4. Оборудование

Файлы `content/oborudovanie/*.md` разрешены только для описания опубликованной
карточки конкретного оборудования.

Запрещено без отдельного источника:

- сообщать цену и наличие;
- обещать совместимость с существующей системой;
- обещать срок поставки;
- утверждать состав проекта по одной карточке товара;
- использовать `_reserve`, `_drafts` и placeholder-карточки.

## 5. Исключённые источники

Не входят в `widget-kb-v1`:

- `content/**/_drafts/**`;
- `content/oborudovanie/_reserve/**`;
- непубличные кабинеты и их реальные данные;
- seed/demo-записи и синтетические суммы;
- production `.env`, база лидов, журналы и резервные копии;
- внутренние переписки, MAX и другие сессии;
- старый FAQ как самостоятельный источник фактов;
- ответы и выводы моделей;
- тексты без установленного владельца и статуса публикации.

## 6. Источники, требующие пересмотра

Старые материалы соседнего проекта:

- `knowledge_base/.../01_company_overview.md`;
- `knowledge_base/.../02_rospark_capabilities.md`;
- `knowledge_base/.../07_completed_projects.md`;
- `configs/ai_widget_eval/rospark_widget_faq_v1_candidate.md`.

Они полезны для поиска вопросов, но их ответы нельзя переносить автоматически.
Каждое утверждение должно быть заново подтверждено текущим сайтом или владельцем.
