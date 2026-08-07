# РОСПАРК — Security Release 2

Дата подготовки: 7 августа 2026 года.  
Статус: `LOCAL_CANDIDATE_VERIFIED`, production не изменён.

## Основание

Кандидат собран в отдельной ветке
`fix/site-20260807-security-release-2` поверх точного production SHA
`3177187a8e455c58277cdd5ae91eb04923a6e6f7`.

До обновления `npm audit --omit=dev` показывал пять production findings уровня
high: прямые зависимости Next.js, Nodemailer и Sharp, а также транзитивные
PostCSS и js-yaml.

## Состав кандидата

- Next.js: `14.2.35` → `16.3.0`;
- React / React DOM: `18.3.1` → `19.2.8`;
- Nodemailer: `6.10.1` → `9.0.4`;
- Sharp: `0.34.5` → `0.35.3`;
- ESLint и `eslint-config-next` переведены на совместимый с Next.js 16 flat
  config;
- уязвимая ветка `js-yaml` в `gray-matter` закреплена на исправленной версии
  `3.15.1`;
- обработчики страниц и API переведены на асинхронные `params`, `searchParams`
  и `cookies()` нового Next.js;
- SMTP-транспортам запрещено читать локальные файлы и URL через
  `disableFileAccess` и `disableUrlAccess`;
- добавлен регрессионный тест SMTP-ограничений;
- Stage C больше не зависит от захардкоженного календарного месяца.

## Локальная приёмка

На Node.js `22.23.1` пройдены:

- `npm audit --omit=dev` и полный `npm audit`: 0 vulnerabilities;
- TypeScript и ESLint без ошибок и предупреждений;
- production build Next.js 16;
- тесты lead registry, admin, CLI, AI widget, gateway и production env;
- 46 gateway-тестов, 13 cascade-тестов и 5 result-тестов;
- Stage B и Stage C на временных SQLite-базах;
- тесты analytics/privacy, SEO, изображений, Hero media и поискового
  мониторинга;
- HTTP-проверка публичных, demo, admin и закрытых legacy-маршрутов;
- проверка security headers админки и отклонения внешнего URL в Next Image;
- визуальная проверка `/`, `/parkovka`, `/parkovka-pod-klyuch` и `/demo` на
  ширинах 320, 375, 390 и 1440 px.

Локальная приёмка не создавала лиды и не отправляла сообщения в MAX.

## Остаточные замечания

- Next.js 16 предупреждает, что файл `middleware.ts` в будущем следует
  переименовать в `proxy.ts`. Текущий путь поддерживается и не блокирует
  релиз; переименование лучше выполнить отдельно, чтобы не расширять security-
  обновление.
- Browserslist сообщает об устаревшем локальном справочнике браузеров. Это не
  production vulnerability и не влияет на текущую сборку.
- Production gateway AI на Mac Studio не входит в этот VPS/site-релиз и не
  должен переключаться вместе с ним.

## Release gate

Публикация разрешается только отдельным подтверждением владельца. Перед
активацией нужно:

1. подтвердить, что production всё ещё находится на ожидаемом SHA;
2. сделать backup env, Nginx, systemd units и SQLite штатными online-методами;
3. собрать и проверить staging из точного SHA кандидата;
4. сохранить текущую `.next` как hot rollback;
5. не менять секреты, `.env`, пути SQLite и Mac Studio gateway;
6. активировать сайт одним контролируемым systemd-run;
7. проверить PM2, Nginx и реальные HTTPS-маршруты;
8. проверить формы без создания реального лида и без отправки в MAX;
9. при любой ошибке автоматически вернуть Git SHA и hot build предыдущего
   production.

Итоговый production-отчёт обязан отдельно зафиксировать новый SHA, backup,
hot rollback, PM2 PID, HTTPS acceptance, `LEADS_CREATED=0` и
`MAX_MESSAGES_SENT=0`.
