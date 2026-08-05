# РОСПАРК — release gate SEO/analytics 2026-08-05

Статус: локально проверенный накопительный кандидат, production не изменён.

## Границы выпуска

- production base: `c57887f81f53408d273e3b978184c68e09e06c1a`;
- verified code/docs target before this runbook:
  `ffdf70f8ada4dc8ce29ba34afaa104d0ee140d83`;
- exact release target is the final clean branch HEAD produced by packaging and
  must be verified separately before any transfer;
- ветка: `fix/site-20260805-landing-responsive-images`;
- VPS site и PM2 — единственный изменяемый production-контур;
- Mac Studio AI gateway, Nginx, SQLite, env, таймеры и MAX не изменяются.

## Состав

1. Responsive Next Image для девяти изображений `/parkovka-pod-klyuch`.
2. Native `Arguments` envelope официального контракта `gtag.js`.
3. Постоянный 308 `/mobile/index.html` на каноническую главную с сохранением
   query string.
4. Актуальные production, SEO и roadmap-документы.

## Уже пройдено локально

- `node scripts/test_analytics_privacy.mjs`;
- `npm run test:landing-image-delivery`;
- `npm run test:parkovka-assets`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run build`: 116 страниц;
- `git diff --check`;
- visual check: 1440 и 390 px, без horizontal overflow;
- Lighthouse candidate `/parkovka-pod-klyuch`: около 399 КБ вместо 589 КБ;
- локальный production-mode smoke:
  `/mobile/index.html?utm_source=legacy` → 308
  `https://www.xn--80aukedde.xn--p1ai/?utm_source=legacy`, `/` → 200,
  `/to.html` → 404.

## Activation gate

Перед изменением production обязательно:

1. Проверить точный production SHA `c57887f81f53408d273e3b978184c68e09e06c1a`.
2. Проверить чистое fast-forward до exact final target, который включает
   `ffdf70f8...` и этот runbook.
3. Создать backup env, Nginx, SQLite online-backup, systemd units и release
   state без отправок.
4. Собрать candidate на Node.js 22 в отдельном staging worktree.
5. Повторить все перечисленные тесты и production build.
6. Сохранить текущую `.next` как hot rollback.
7. Активировать fast-forward и перезапустить только `rospark-site` через PM2.

## Public HTTPS acceptance

- `/`, `/parkovka`, `/parkovka-pod-klyuch` → 200;
- `/mobile/index.html?utm_source=legacy` → один постоянный redirect на
  каноническую главную с сохранённым UTM;
- `/to.html`, `/overviews.html` остаются 404;
- `/parkovka-pod-klyuch` получает responsive `/_next/image` варианты;
- GA4 script после сохранённого analytics consent загружается с
  `G-3Z9KNN3MMK` и создаёт обезличенный `page_view`;
- без согласия GA4 и Метрика не загружаются;
- `/admin` не загружает внешнюю аналитику;
- AI widget status отвечает, но контрольный вопрос и заявка не отправляются;
- `LEADS_CREATED=0`, outbox неизменен, `MAX_MESSAGES_SENT=0`.

## Automatic rollback

При ошибке build, PM2, HTTPS acceptance, privacy gate, redirect или GA4 loader:

- вернуть base SHA и сохранённую `.next`;
- перезапустить только `rospark-site`;
- проверить публичные 200/404 и неизменность lead outbox;
- не продолжать release повторно без отдельного разбора причины.

## Отложенное подтверждение

Появление события в стандартных отчётах GA4 может занимать до 24 часов. Это не
блокирует технический rollback-gate, но выпуск нельзя считать аналитически
закрытым, пока веб-поток не перестанет показывать «данные не получены».
