# РОСПАРК — актуальный контекст для AI-ролей

Дата: 2026-07-23
Статус: обязательная шапка поверх исторических инструкций AI-команды.

## Источники правды

Перед любым аудитом, планом или изменением использовать:

1. фактическое рабочее дерево и текущую ветку;
2. `docs/site/SITE_DEVELOPMENT_ROADMAP_20260723.md`;
3. `docs/production/PRODUCTION_STATE_2026_07_23.md`;
4. `docs/site/SITE_STRUCTURE.md`;
5. `docs/site/ARCHITECTURE.md`;
6. для ручного выпуска —
   `docs/deployment/AFTER_DEPLOY_GUEST_DEMO_MAX.md`.

`project_full_dump.txt` может быть вспомогательным снимком, но не имеет приоритета
над фактическим репозиторием и может быть устаревшим.

## Фактический контекст

- production release SHA:
  `61a4694bee55426e72bdfbb42008730c3cb2b444`;
- production-ветка: `release/demo-production-ready-20260723`;
- production: Linux, Nginx, PM2, Node.js 22, Next.js 14.2.35;
- Demo Release v1 опубликован;
- текущая production SQLite находится внутри checkout;
- MAX уже проверен реальной demo-доставкой;
- единый lead registry, персональные роли, MAX outbox и retention timers
  опубликованы и приняты через одну закрытую TEST-заявку;
- Security Release 2 ещё не выполнен и по решению владельца перенесён на
  последний этап roadmap;
- перенос SQLite ещё не выполнен;
- AI-виджет публично не подключён.

## Обязательные ограничения

- Не считать `main`, `ai-site-dev`, `dev-p1-visible-copy-001` или любую другую
  ветку правильной базой без текущей проверки и решения владельца.
- Не использовать Windows demo-server команды для нынешнего production.
- Не выполнять commit, push, merge, deploy, restart, изменение env, MAX,
  reverse proxy, DNS, SQLite или зависимостей без соответствующего разрешения.
- Не удалять и не перезаписывать незнакомые изменения рабочего дерева.
- Для Node.js, `npm ci`, build и runtime использовать major-версию 22.
- Исторические документы сохраняют контекст решений, но не заменяют текущие
  roadmap, production-state и read-only preflight.
