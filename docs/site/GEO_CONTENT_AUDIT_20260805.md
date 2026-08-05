# GEO/content audit after SEO analytics release

Date: 2026-08-05  
Production baseline: `1351b9334ef9e5a6017b4852783dd70e40d94c71`

## Scope and boundary

This is a read-only audit of four pages that already appeared in the available
search-performance slice:

- `/`;
- `/oborudovanie/shlagbaumy`;
- `/stati/raspoznavanie-nomerov-dlya-parkovki`;
- `/keysy/elektronika-na-presne`.

The audit compared repository templates and content with the HTML currently
returned by the public HTTPS domain. It did not create analytics events, leads,
AI-widget messages, new public pages, or production changes.

## What is already correct

- All four public routes return their own title, description, and canonical URL.
- The equipment, article, and case pages publish `BreadcrumbList`.
- The three content pages publish `FAQPage` when visible FAQ data exists.
- The number-recognition article publishes `Article` JSON-LD.
- The Elektronika na Presne project publishes `CaseStudy` JSON-LD.
- The barrier page deliberately uses informational `WebPage` markup rather than
  inventing Product/Offer prices, ratings, reviews, shipping, or returns.
- Internal navigation exposes the two approved landings and the main solution,
  capability, equipment, case, and consultation routes.

## Findings by page

### Home page

The home page has a canonical URL and global `Organization` data, but its title
and description remain broad. They should not be rewritten before a fresh query
slice shows which commercial cluster is actually winning impressions. The page
already links to both approved landing concepts, so no additional landing doorway
is required in this cycle.

### `/oborudovanie/shlagbaumy`

This is the strongest prepared commercial-information page in the audited set:
the title, description, answer-first copy, FAQ, model identifiers, related routes,
and consultation path are aligned with the barrier cluster. The next decision is
a CTR/snippet decision based on fresh Google and Yandex data, not another broad
rewrite. The informational `WebPage` schema is intentional because the site does
not publish a verified standalone offer price.

### Number-recognition article

The article has answer-first copy, FAQ, internal links, canonical metadata, and
`Article` JSON-LD. Its main structured-data gap is editorial provenance:
`datePublished` and a confirmed author/editor are not present. `dateModified` is
available. These fields must only be added from confirmed editorial records.

### Elektronika na Presne case

The case has a concise result-oriented first screen, metrics, FAQ, canonical
metadata, and `CaseStudy` JSON-LD. Its entity data is incomplete: Moscow/city,
region, object type, customer naming policy, and equipment taxonomy are not stored
as normalized fields. The search snippet should be reconsidered only after the
fresh crawl because the page already matches the branded-object query.

## Collection-wide content debt

Repository inventory on 2026-08-05:

- 30 case files; none has normalized `city`, `region`, or `objectType` fields;
- 30 case files have an explicit `lastModified` value;
- 12 article files; 9 have an explicit `lastModified` value;
- no article has `datePublished` or a confirmed `author` field;
- the content parser falls back to filesystem mtime when an explicit editorial
  date is absent.

Git history confirms that the identical `2025-12-21` value in all 30 case files
was inherited from `content/keysy/primer-proekta.md`; it is not evidence that all
30 case pages were edited on that date.

Filesystem mtime is a build/deployment property and must not be presented to
search engines as an editorial update date. Missing entity and date fields must
remain absent until supported by a source; they must not be inferred or generated
for schema completeness.

## Published correction

Production release `1351b93` now:

- removes the inherited `2025-12-21` value from all 30 cases;
- stops using filesystem mtime as a public editorial-date fallback;
- normalizes valid explicit dates to stable ISO values;
- omits invalid or absent dates from sitemap and JSON-LD;
- adds a regression test for missing, valid, and invalid editorial dates.

Candidate verification: dedicated test passed, TypeScript passed, ESLint passed,
and the production build generated all 116 pages. The built sitemap still has 80
URLs, no longer contains the template date, and contains 11 source-backed
`lastmod` values. The audited article retains `dateModified: 2026-07-08`; the
audited case correctly omits `dateModified` until a source-backed value exists.

Public HTTPS acceptance confirmed the 80-URL sitemap, 11 source-backed
`lastmod` values, the retained article update date and omission of an
unsupported case date. The release created no leads and sent no MAX messages.

## Recommended implementation package: `GEO-CONTENT-001`

Prepare one batched change after the evidence gate:

1. Extend case frontmatter and parsing with optional, source-backed `city`,
   `region`, `objectType`, and normalized equipment fields.
2. Extend article frontmatter with optional `datePublished` and confirmed
   author/editor fields.
3. Remove filesystem mtime as a public editorial-date fallback in sitemap and
   structured data; omit the date when no explicit source exists.
4. Enrich `CaseStudy` and `Article` JSON-LD only when those fields are present.
5. Add a confirmed logo and `sameAs` values to `Organization` only after the
   official assets/accounts are approved.
6. Validate JSON-LD, canonical URLs, visible copy/schema parity, build output,
   and public HTTPS responses.

## Evidence gate before content edits

Do not start mass metadata or snippet edits until all of the following are true:

1. Search engines have had time to process the 80-URL sitemap and the releases
   through `2fc363e`.
2. At least one fresh Google Search Console slice after the release is available.
3. The same page/query clusters are compared with Yandex Webmaster data.
4. No more than three existing pages are selected for the first optimization
   batch.
5. Every new factual field has a named internal or public source.

Until that gate is met, the safe work is inventory, source collection, and schema
contract preparation, not publishing new SEO pages or duplicating search intent.
