# РОСПАРК - SEO/GEO backlog для раздела статей и новых страниц

Дата: 2026-07-06  
Цель: развивать экспертный контент так, чтобы он усиливал коммерческие страницы, а не превращался в отдельный блог без лидогенерации.

## Уже добавлено в первый пакет

- `/stati/kak-vybrat-sistemu-avtomatizacii-parkovki`
- `/stati/avtomatizaciya-parkovki-torgovogo-centra`
- `/stati/parkovka-biznes-centra-arendatory-gosti-limity`
- `/stati/iz-chego-sostoit-parkovochnaya-sistema`

## P0: следующие материалы

| URL | Интент | Что раскрыть | Куда вести |
|---|---|---|---|
| `/stati/raspoznavanie-nomerov-vozmozhnosti-ogranicheniya` | feature research | что дает распознавание, ограничения, резервные сценарии | `/vozmozhnosti/raspoznavanie-nomerov`, `/resheniya/dlya-sluzhby-bezopasnosti`, `/quiz` |
| `/stati/gostevoy-dostup-na-parkovku` | B2B сценарий | заявки, временные окна, роли охраны, журнал событий | `/vozmozhnosti/gostevie-klienti`, `/resheniya/biznes-centry`, `/resheniya/zastroyschiki` |
| `/stati/modernizaciya-deystvuyuschey-parkovki` | modernization | что можно оставить, что проверить, как снижать риск простоя | `/resheniya/kak-my-rabotaem`, `/oborudovanie`, `/quiz` |
| `/stati/onlain-oplata-parkovki-scenarii` | payment research | QR, оплата по номеру, терминал, разрешение выезда | `/vozmozhnosti/onlain-oplata`, `/oborudovanie/terminal-oplati-rospark-standart`, `/resheniya/torgovye-centry` |

## P1: новые коммерческие страницы

| URL | Тип | Зачем нужна | Ограничения |
|---|---|---|---|
| `/resheniya/stoimost-avtomatizacii-parkovki` | guide / landing | закрыть горячий спрос по стоимости и факторам сметы | не указывать цены без подтверждения |
| `/resheniya/integracii-i-api` | technical landing | страница для инженеров и IT-директоров | не перечислять неподтвержденные интеграции |
| `/keysy/torgovye-centry` | proof hub | собрать кейсы ТЦ и перелинковать с решением для ТЦ | использовать только реальные кейсы |
| `/keysy/biznes-centry` | proof hub | собрать кейсы БЦ и перелинковать с решением для БЦ | нужны нормализованные frontmatter-поля |

## P1: усиление существующих страниц

- `/vozmozhnosti/*`: добавить answer-first, FAQ, Breadcrumb schema и ссылки на статьи.
- `/oborudovanie/*`: добавить блоки "где применяется", FAQ и ссылки на статьи.
- `/keysy/*`: нормализовать city, region, objectType, equipment, result facts.
- `/resheniya/sravnenie-podhodov`: продолжать использовать как comparison hub, но не перегружать главное меню.

## Редакционные правила

- Не публиковать цены, сроки, гарантии, сертификаты, отзывы и рейтинги без подтверждения.
- В русском языке использовать `РОСПАРК`, в латинице и техническом английском - `POCPARK`.
- Каждая статья должна вести минимум на одну коммерческую страницу, один каталог/возможность и квиз или контакты.
- В начале статьи нужен короткий answer-first блок.
- FAQ писать как прямые ответы, без переспама ключами.
