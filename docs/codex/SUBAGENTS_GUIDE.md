# Project-Scoped Subagents

Этот проект использует read-only subagents для вспомогательных аудитов сайта РОСПАРК / POCPARK.

Subagents помогают быстрее собирать специализированные замечания, но не получают права менять production, `main`, выполнять push, merge или deploy.

## Общие правила

Все subagents работают с `sandbox_mode = "read-only"` и обязаны соблюдать правила проекта:

- русский публичный бренд: РОСПАРК;
- английский язык и латиница: POCPARK;
- новые публичные ROSPARK не создавать;
- production не трогать;
- `main` не менять;
- push, merge, deploy и commit не выполнять;
- секреты не читать, не раскрывать и не коммитить;
- не создавать, не редактировать и не перезаписывать внешние отчеты;
- итоговые внешние отчеты сохраняет только основной Codex через skill `pocpark-task-reporter`;
- возвращать вывод основному Codex в формате: Findings, Risks, Safe next tasks, Read-only confirmation.

## Доступные subagents

### Рабочая AI-команда РОСПАРК

Эти subagents отражают целевую структуру команды сайта. Они работают read-only и помогают основному Codex, который выступает Архитектором сайта.

- `rospark_ai_marketer` — офферы, коммерческий смысл, SEO/GEO-контент, статьи, новости, ТЗ для редактора и архитектора.
- `rospark_ai_architect` — read-only профиль Архитектора/Оркестратора: scope, risks, task briefs, QA-gate и go/no-go до разработки.
- `rospark_tech_editor` — русский технический B2B-текст, терминология, безопасные формулировки.
- `rospark_ai_designer` — визуальная иерархия, первый экран, CTA, доверие, мобильная подача.
- `rospark_frontend_coder` — read-only file-scope, план фронтенд-правок, команды проверки и отката. Код меняет только основной Codex или отдельный worker после утверждения.
- `rospark_qa_tester` — QA-проверка, build/lint/typecheck план, мобильная версия, формы, SEO smoke и готовность к merge.

Полный регламент работы команды:

- `docs/agents/AI_TEAM_ORCHESTRATION.md`
- `docs/agents/subagents/README.md`

### architect_reviewer

Используется для архитектурного review:

- структура проекта;
- границы модулей;
- зависимости;
- риски изменений;
- технический долг;
- влияние на maintainability.

### frontend_reviewer

Используется для frontend review:

- компоненты;
- UI-состояния;
- адаптивность;
- формы;
- клиентские ошибки;
- производительность;
- базовая доступность.

### qa_reviewer

Используется для QA review:

- build;
- lint;
- typecheck;
- smoke checks;
- ручные проверки;
- риски перед merge или release.

### geo_seo_reviewer

Используется для GEO/SEO review:

- `robots`;
- `sitemap`;
- canonical URL;
- metadata;
- schema.org;
- FAQ;
- заголовки;
- внутренняя перелинковка;
- готовность к AI-поисковикам.

### content_marketing_reviewer

Используется для content/marketing review:

- коммерческие смыслы;
- деловой тон;
- B2B-аудитория;
- страницы под БЦ, ТЦ, ЖК и КПП;
- статьи;
- новости;
- MAX-посты;
- проверка, что нет выдуманных цен, сроков, гарантий, клиентов и кейсов.

### security_dependency_reviewer

Используется для security/dependency review:

- `npm audit`;
- direct и transitive vulnerabilities;
- секреты;
- `.env`;
- риск зависимостей;
- lockfile safety.

Этот subagent не должен запускать `npm audit fix`, `npm audit fix --force`, устанавливать зависимости или менять lock-файлы.

`npm audit` запускать только если основной Codex явно разрешил это для текущей задачи. `.env` и другие secret-like файлы не открывать; допустимо сообщать только имена найденных secret-like файлов.

### release_reviewer

Используется для release review:

- release checklist;
- diff перед release;
- rollback-план;
- готовность к merge/deploy;
- проверка запретов production.

Merge в `main` и deploy допустимы только после отдельного подтверждения директора.

## Что subagents могут делать

- Читать разрешенные файлы проекта.
- Проводить read-only анализ.
- Классифицировать риски.
- Предлагать точечные безопасные следующие задачи.
- Возвращать findings основному Codex.
- Сообщать ограничения анализа, если scope слишком широкий или не хватает времени.

## Что subagents запрещено

- Менять файлы.
- Создавать, редактировать, перезаписывать или сохранять внешние отчеты.
- Делать commit.
- Делать push.
- Делать merge.
- Делать deploy.
- Менять `main`.
- Менять production-конфигурацию.
- Читать или раскрывать секреты.
- Открывать `.env` или другие secret-like файлы; можно сообщать только filename.
- Запускать команды, которые могут менять файлы репозитория, lock-файлы, build artifacts, caches, configuration или production state.
- Запускать исправляющие команды вроде `npm audit fix`.
- Запускать `npm install`, `npm audit fix --force`, `npm run build`, formatters, `git clean`, `git reset`, `git rebase`, deploy-команды.
- Запускать `npm run lint`, если он может создать config.
- Делать массовую замену бренда ROSPARK/POCPARK/РОСПАРК.

## Smoke-test findings and operating limits

Smoke-test `SUBAGENTS-SMOKE-001` подтвердил, что project-scoped subagents доступны, но выявил рабочие ограничения:

- subagents не сохраняют отчеты самостоятельно;
- основной Codex собирает выводы subagents и оформляет итоговый отчет через skill `pocpark-task-reporter`;
- для широких аудитов лучше запускать subagents с узким scope, конкретными файлами или конкретными вопросами;
- subagents должны работать bounded/concise: не выполнять бесконечный аудит всего репозитория, а возвращать key findings, representative examples и limitations;
- если subagent уходит в timeout, основной Codex должен перезапустить его с более коротким и конкретным заданием;
- для security/dependency задач `npm audit` нужно разрешать отдельно в prompt основного Codex;
- `npm audit fix`, `npm audit fix --force`, `npm install` и изменение lock-файлов для subagents запрещены всегда;
- subagents не читают содержимое `.env` и других secret-like файлов, а сообщают только факт их наличия по filename.

## Отличие от AGENTS.md и skill

`AGENTS.md` задает постоянные правила всего проекта: ветки, production-запреты, бренд-правила, отчетность и общий рабочий протокол.

Skill `pocpark-task-reporter` задает формат выполнения задач и внешней отчетности. Его использует основной Codex, когда меняет файлы, запускает проверки, готовит аудит, commit, merge или release.

Subagents — это специализированные read-only помощники. Они дают узкий review по своей области, но не сохраняют итоговые отчеты сами и не получают права на изменения. Основной Codex собирает их выводы и оформляет внешний отчет.

## Примеры команд

```text
Запусти read-only subagent review текущей ветки: architect_reviewer, qa_reviewer, geo_seo_reviewer. Дождись всех результатов и собери общий отчет.
```

```text
Перед merge запусти subagents: qa_reviewer, security_dependency_reviewer, release_reviewer. Все работают read-only.
```

```text
Для новой GEO-страницы запусти subagents: content_marketing_reviewer и geo_seo_reviewer. Код не менять, только структура и риски.
```
