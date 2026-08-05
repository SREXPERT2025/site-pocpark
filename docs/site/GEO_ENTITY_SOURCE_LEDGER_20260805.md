# GEO entity source ledger

Date: 2026-08-05  
Status: local inventory, not production data

## Rule

An entity field may enter visible copy or JSON-LD only when its source is named.
Titles, slugs, categories, tags, and case copy can identify candidates, but they
do not automatically prove a normalized city, region, legal customer, publication
date, author, or official external profile.

Statuses:

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

Status: `CONFIRMED_INTERNAL` for the visible category, `CANDIDATE` for a new
normalized `objectType` value.

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

Status: `CANDIDATE`; no city or region values are authorized for publication yet.

### Equipment

Approved case copy already contains `Состав решения`, metrics, tags, or an
equipment description. This is suitable source material for a controlled
normalization into values such as barrier, entry terminal, exit/payment terminal,
ANPR, online payment, reports, and administration software. The vocabulary and
per-case mapping still require review because some pages use broad claims or
generic template language.

Status: `CONFIRMED_INTERNAL` for the existing free text, `CANDIDATE` for normalized
equipment identifiers.

### Customer and project dates

No case has a confirmed `customer`, `datePublished`, or verified editorial
`dateModified` field. The former common `2025-12-21` value came from the template
and is removed in the local candidate.

Status: `BLOCKED` pending project-registry or editorial evidence.

## Article fields

- 9 of 12 articles have an explicit update date; the remaining 3 correctly omit
  it in the local candidate.
- No article has a confirmed original publication date.
- No article has a confirmed human author or editor.
- The site can continue to use the organization as publisher, but must not invent
  a named author.

Status: update dates `CONFIRMED_INTERNAL` where present; publication dates and
authors `BLOCKED` pending editorial records.

## Organization fields

- Repository logo assets exist: `public/logo.svg`, `public/logo_black.svg`, and
  `public/logo.png` (600 x 160).
- No canonical schema-logo decision is documented; the available PNG is a wide
  wordmark rather than a square identity asset.
- No approved official social/profile URLs suitable for `sameAs` are stored in
  the repository.
- `NEXT_PUBLIC_TELEGRAM_CONTACT_URL` is only an optional contact environment
  variable and is not proof of an official entity profile.

Status: `logo` and `sameAs` remain `BLOCKED` until brand/profile ownership is
confirmed.

## Required owner input

One compact source package is enough to unblock the next phase:

1. case/project registry with city, region, object type, and approved customer
   naming;
2. confirmed equipment list per priority case;
3. editorial owner and original publication dates for priority articles;
4. approved schema logo asset;
5. official public profile URLs owned by РОСПАРК or ООО «СР Эксперт».

Until those sources are supplied, the implementation must omit the fields rather
than infer them.
