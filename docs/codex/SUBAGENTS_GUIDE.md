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
- итоговые внешние отчеты сохраняет основной Codex через skill `pocpark-task-reporter`.

## Доступные subagents

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

## Что subagents запрещено

- Менять файлы.
- Делать commit.
- Делать push.
- Делать merge.
- Делать deploy.
- Менять `main`.
- Менять production-конфигурацию.
- Читать или раскрывать секреты.
- Запускать исправляющие команды вроде `npm audit fix`.
- Делать массовую замену бренда ROSPARK/POCPARK/РОСПАРК.

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
