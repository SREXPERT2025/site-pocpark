# РОСПАРК — журнал изменений сайта

Статус: рабочая документация v1  
Дата создания: 2026-05-03

## Назначение

Этот файл фиксирует крупные изменения сайта человеческим языком. Он не заменяет git, но помогает быстро понять историю развития проекта.

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

