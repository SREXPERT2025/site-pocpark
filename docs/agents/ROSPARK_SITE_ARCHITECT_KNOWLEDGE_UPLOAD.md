# Что загружать в знания GPT-агента

## Обязательно

- `project_full_dump.txt` — свежий дамп проекта после последних коммитов.
- `docs/agents/ROSPARK_SITE_ARCHITECT_GPT_INSTRUCTIONS.md`
- `docs/agents/ROSPARK_SITE_ARCHITECT_WORKFLOW.md`
- `docs/agents/ROSPARK_SITE_ARCHITECT_START_PROMPTS.md`
- `docs/agents/AI_TEAM.md`
- `docs/site/SITE_STRUCTURE.md`
- `docs/site/ARCHITECTURE.md`
- `docs/site/CHANGELOG.md`
- `docs/content/CONTENT_STYLE_GUIDE.md`
- `docs/marketing/POSITIONING.md`
- `docs/deployment/DEPLOY_DEMO_SERVER.md`

## Желательно

- `backend-integration-guide.md`
- `content-guide.md`
- `deploy-guide.md`
- `LEADS_SETUP.md`

## Не загружать

- `.env.local`
- `.env`
- архивы `.zip`, `.rar`, `.7z`
- `node_modules`
- `.next`
- `package-lock.json`, если не нужно анализировать зависимости детально
- временные дампы и handoff-архивы

## Когда обновлять знания

После каждого крупного изменения сайта:

1. Выполнить `python3 collect_code.py`.
2. Загрузить свежий `project_full_dump.txt` в GPT.
3. Если менялась документация — загрузить обновлённые `docs/` файлы.
4. Спросить агента: «Проверь, что знания соответствуют текущему состоянию проекта».
