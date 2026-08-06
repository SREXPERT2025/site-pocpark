# GEO entity source ledger

Date: 2026-08-05
Owner confirmation updated: 2026-08-06
Status: approved local source inventory; not production state

## Rule

An entity field may enter visible copy or JSON-LD only when its source is named.
Titles, slugs, categories, tags, and case copy can identify candidates, but they
do not automatically prove a normalized city, region, legal customer, publication
date, author, or official external profile.

Statuses:

- `CONFIRMED_OWNER`: explicitly confirmed by the company owner for public use;
- `CONFIRMED_INTERNAL`: stated explicitly in the current approved case/article;
- `CANDIDATE`: strongly suggested by the title or slug, requires confirmation;
- `BLOCKED`: no acceptable source exists in the repository.

## Case fields

### Object type

All 30 cases have a visible `category`, so the source exists, but the taxonomy is
not normalized:

- shopping centres and supermarkets currently share `Торговый центр`;
- hotels share a mixed `Жилые комплексы и отели` category;
- `Мосфильм` is currently categorized as `Бизнес-центр`;
- sports complexes, business centres, warehouses, retail, hotels, and residential
  objects need separate stable values.

The owner has now confirmed normalized object types for the first priority
package: shopping/entertainment centre, supermarket, hotel/pension, sports
complex, business centre, warehouse/industrial complex and film studio.
`Мосфильм` must be corrected from `Бизнес-центр` to `Киноконцерн/киностудия`.

Status: `CONFIRMED_OWNER` for the priority package; remaining case taxonomy is
still `CANDIDATE`.

### City and region

The following city candidates are explicit in titles/slugs and should be checked
against an object card, contract/project registry, or an approved public source:

- Казань: `amaks-otel-kazan`;
- Сочи: `burgas-sochi`;
- Ростов-на-Дону candidate: `gorizont-rostov`;
- Балашиха: `hey-balashiha`;
- Люберцы: `hey-luber`;
- Красногорск: `izumrudnii-kranogorsk`;
- Одинцово: `odipark`;
- Мурманск: `plazma-murmansk`;
- Нижний Новгород: `spar-nizh-novgorod`;
- Саранск: `spar-saransk`.

Names such as Пресня, Рассказовка, Чертановская, Днепропетровская, Элеваторная,
Ярославское шоссе and Курьяново identify areas/streets but must not be converted
to `city: Москва` without an explicit source.

The owner confirmed city/region and public names for the first priority package:
Moscow, Kazan/Republic of Tatarstan, Sochi/Krasnodar Krai,
Rostov-on-Don/Rostov Region, Saransk/Republic of Mordovia and
Murmansk/Murmansk Region. The exact per-case values and approved wording are
recorded in `GEO_CONTENT_SOURCE_INPUT_20260805.md`.

Status: priority package values are `CONFIRMED_OWNER`; remaining city and region
values are still `CANDIDATE`.

### Equipment

Approved case copy already contains `Состав решения`, metrics, tags, or an
equipment description. This is suitable source material for a controlled
normalization into values such as barrier, entry terminal, exit/payment terminal,
ANPR, online payment, reports, and administration software. The vocabulary and
per-case mapping still require review because some pages use broad claims or
generic template language.

The owner reviewed the equipment and scenarios for the first priority package.
Important corrections include project-only values for W-Plaza and cashless-only
payment at `Элма-Курьяново`.

Status: first priority package is `CONFIRMED_OWNER`; remaining mappings are
`CANDIDATE`.

### Customer and project dates

Approved public object names are recorded for the first priority package. Case
publication dates and verified editorial `dateModified` values are still not
available; the former common `2025-12-21` value came from the template and must
remain removed.

Status: public names for the priority package are `CONFIRMED_OWNER`; case dates
remain `BLOCKED` and must be omitted.

## Article fields

- 9 of 12 articles have an explicit update date; the remaining 3 correctly omit
  it in the local candidate.
- Original publication dates are confirmed from the first Git commit and owner
  confirmation: five articles on 2026-07-06, four on 2026-07-08, and three on
  2026-07-26.
- The visible author is approved as `Команда РОСПАРК`; the legal publisher is
  approved as ООО «СР Эксперт».

Status: publication dates, the organizational author, and publisher are
`CONFIRMED_OWNER`; update dates are `CONFIRMED_INTERNAL` where present.

## Organization fields

- Repository logo assets exist: `public/logo.svg`, `public/logo_black.svg`, and
  `public/logo.png` (600 x 160).
- The owner approved `public/logo.png` as the official schema logo on
  2026-08-05.
- The owner confirmed that official VK and RuTube profiles do not yet exist;
  both are only planned. They must not be added to `sameAs`.
- `NEXT_PUBLIC_TELEGRAM_CONTACT_URL` is only an optional contact environment
  variable and is not proof of an official entity profile.

Status: `logo` is `CONFIRMED_OWNER`; `sameAs` remains omitted until an official
profile is created and its ownership is confirmed.

## Remaining source gates

1. obtain current barrier passports after testing and OTK approval for technical
   characteristics and compatibility claims;
2. omit case publication/modification dates until editorial evidence exists;
3. add `sameAs` only after official public profiles are created and ownership is
   confirmed;
4. keep all unreviewed case fields omitted rather than inferred.
