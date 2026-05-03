# РОСПАРК — деплой на демо-сервер

Статус: рабочая документация v1  
Дата: 2026-05-03

## Назначение

Документ описывает безопасный порядок обновления сайта РОСПАРК на демо-сервере.

## Общая схема

Локально:

1. Проверяем изменения.
2. Выполняем сборку.
3. Делаем commit.
4. Ставим checkpoint-tag при крупном изменении.
5. Пушим `main` в GitHub.

На демо-сервере:

1. Проверяем текущий статус.
2. Делаем backup важных локальных файлов.
3. Обновляем код через `git pull --ff-only origin main`.
4. Выполняем сборку.
5. Перезапускаем PM2-процесс сайта.
6. Проверяем сайт с телефона.

## Локальная подготовка

```bash
git checkout main
git pull origin main
npm run build
git status --short
```

Если всё хорошо:

```bash
git add <changed-files>
git commit -m "type(scope): short description"
git tag checkpoint-name-YYYY-MM-DD
git push origin main
git push origin checkpoint-name-YYYY-MM-DD
```

## Проверка на демо-сервере перед обновлением

PowerShell:

```powershell
pm2 list
cd C:\site-pocpark
git status
git log --oneline --decorate -5
```

Важно: untracked-файлы в корне сервера могут быть служебными. Не удалять их без проверки.

## Backup перед деплоем

Пример:

```powershell
mkdir C:\site-pocpark-backup-before-mobile-deploy-2026-05-03
Copy-Item .env C:\site-pocpark-backup-before-mobile-deploy-2026-05-03\ -ErrorAction SilentlyContinue
Copy-Item .env.local C:\site-pocpark-backup-before-mobile-deploy-2026-05-03\ -ErrorAction SilentlyContinue
Copy-Item ecosystem.config.cjs C:\site-pocpark-backup-before-mobile-deploy-2026-05-03\ -ErrorAction SilentlyContinue
Copy-Item ecosystem.config.js C:\site-pocpark-backup-before-mobile-deploy-2026-05-03\ -ErrorAction SilentlyContinue
Copy-Item package.json C:\site-pocpark-backup-before-mobile-deploy-2026-05-03\ -ErrorAction SilentlyContinue
Copy-Item package-lock.json C:\site-pocpark-backup-before-mobile-deploy-2026-05-03\ -ErrorAction SilentlyContinue
```

## Проверка потенциального удаления мусора

Только просмотр:

```powershell
git clean -nd
```

Команду удаления `git clean -fd` выполнять только если точно понятно, что все перечисленные файлы можно удалить.

## Обновление кода

```powershell
git pull --ff-only origin main
```

Если обновление прошло, проверить:

```powershell
git status
git log --oneline --decorate -3
```

Ожидаемо после успешного обновления:

```text
HEAD -> main, origin/main
```

## Сборка на сервере

```powershell
npm run build
```

Сборка должна завершиться без ошибок:

```text
Compiled successfully
Generating static pages
Finalizing page optimization
```

## Перезапуск сайта

```powershell
pm2 restart site-pocpark
pm2 list
```

Если PM2-процесс называется иначе, сначала посмотреть список:

```powershell
pm2 list
```

## Проверка после деплоя

Проверить минимум:

- главная страница;
- `/vozmozhnosti`;
- `/resheniya/dlya-inzhenerov`;
- `/resheniya/dlya-sluzhby-bezopasnosti`;
- `/resheniya/torgovye-centry`;
- `/resheniya/zastroyschiki`;
- `/oborudovanie/terminal-oplati-rospark-standart`;
- `/keysy/amaks-otel-kazan`;
- `/contacts`;
- форма заявки.

Обязательно проверить с мобильного телефона.

## Откат

Если проблема найдена сразу после деплоя, есть два варианта.

### Вариант 1. Откат git на предыдущий commit

Найти предыдущий commit:

```powershell
git log --oneline --decorate -5
```

Откатиться к нужному commit:

```powershell
git reset --hard <commit_hash>
npm run build
pm2 restart site-pocpark
```

### Вариант 2. Восстановить отдельные файлы из backup

Использовать backup-папку, если проблема связана с `.env`, PM2-конфигом или package-файлами.

## Важные предупреждения

- Не коммитить `.env` и `.env.local`.
- Не коммитить `node_modules`.
- Не коммитить backup-архивы.
- Не удалять untracked-файлы на сервере без просмотра через `git clean -nd`.
- После изменения переменных окружения перезапустить PM2.
- После изменения кода всегда выполнять `npm run build` перед перезапуском production-процесса.
