# РОСПАРК — release packet SEO-INDEXING-002

Дата подготовки: 2026-08-04  
Дата выпуска: 2026-08-05
Статус: опубликован и принят в production

## Цель

Одним контролируемым релизом закрыть подтверждённые технические задачи:

1. опубликовать HTML verification-файл дополнительной property Яндекса;
2. добавить два утверждённых лендинга в sitemap;
3. убрать недостоверную заявку на Product/Merchant rich results при отсутствии
   публичной цены, отзывов и рейтинга;
4. усилить естественную перелинковку шести подтверждённых кейсов из трёх
   релевантных страниц решений.

## Что не входит

- изменение текстов, цен и характеристик оборудования;
- создание отзывов, рейтингов, правил доставки или возврата;
- массовая переделка 20 кейсов: аудит подтвердил наличие обложки, метрик, FAQ
  и answer-first содержания у каждого опубликованного кейса;
- ручная отправка URL на переобход до публикации;
- изменение Nginx, DNS, SSL, AI gateway, баз, лидов или MAX.

## Pre-release gate

- рабочая ветка чистая и основана на актуальном release-контуре;
- verification-файл отвечает локально точным содержимым;
- production build успешен;
- TypeScript, ESLint и `git diff --check` успешны;
- sitemap содержит `/parkovka` и `/parkovka-pod-klyuch` ровно по одному разу;
- страницы торговых центров, бизнес-центров и складских комплексов содержат
  ссылки только на выбранные тематически подходящие кейсы;
- HTML каталога и карточки оборудования не содержит `Product` и `Offer`, но
  содержит canonical, Breadcrumb/FAQ и информационный JSON-LD;
- формы, AI и внешние отправки при проверке не вызываются.

## Production acceptance

Выполнено после отдельного разрешения на релиз:

1. `200` и точное содержимое verification-файла;
2. `200` sitemap и наличие обоих лендингов;
3. `200`, canonical и JSON-LD одной карточки оборудования и каталога;
4. три страницы решений отвечают `200`, а шесть связанных кейсов доступны по
   их публичным URL;
5. главная, `/demo`, `/parkovka` и `/parkovka-pod-klyuch` отвечают `200`;
6. PM2 online, Nginx active, timers active;
7. `LEADS_CREATED=0`, `MAX_MESSAGES_SENT=0`.

Результат:

- production SHA:
  `a736baff6d024b44aa8aa181515975b3f4dedf28`;
- transient service завершилась с `Result=success`, `ExecMainStatus=0`;
- PM2 `rospark-site` остался `online`;
- публичный sitemap содержит 80 URL, включая `/parkovka` и
  `/parkovka-pod-klyuch`;
- verification-файл Яндекса отвечает `200`;
- карточка оборудования и каталог публикуют информационную разметку без
  фиктивных Product/Offer;
- три страницы решений и шесть связанных кейсов прошли HTTPS acceptance;
- сохранены backup
  `/root/rospark-backups/seo-indexing-a736baf-20260805T041634Z` и hot rollback
  `/var/www/rospark-release-builds/next-hot-0c2b931-20260805T041634Z`;
- `LEADS_CREATED=0`, `MAX_MESSAGES_SENT=0`.

Read-only контроль кабинетов 2026-08-05 вынесен в
`docs/site/SEO_POST_RELEASE_CHECK_20260805.md`. Подтверждение URL-prefix
property Яндекса и ручные запросы переиндексации не выполнялись.

## Rollback

При `5xx`, пропаже canonical/JSON-LD, неверном sitemap или сбое приложения
вернуть сохранённую предыдущую сборку и SHA. Verification в Яндексе и ручные
проверки Search Console до успешного acceptance не запускать.
