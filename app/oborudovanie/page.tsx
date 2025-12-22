import Hero from '@/app/components/ui/Hero';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import ItemListJsonLd from '@/app/components/content/ItemListJsonLd';
import CatalogControls, { type CatalogSortKey } from '@/app/components/catalog/CatalogControls';
import ProductCard from '@/app/components/ui/ProductCard';
import LeadFormSection from '@/app/components/forms/LeadFormSection';
import { getAllContentMeta, type ContentMeta } from '@/lib/content-parser';

export const metadata = {
  title: 'Оборудование',
  description: 'Оборудование РОСПАРК: стойки, шлагбаумы, терминалы, датчики.',
};

type SearchParams = {
  category?: string;
  tag?: string;
  q?: string;
  sort?: CatalogSortKey;
};

function safePrice(v?: number) {
  if (typeof v !== 'number' || Number.isNaN(v) || v <= 0) return null;
  return v;
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function matchesQuery(item: ContentMeta, query: string) {
  const q = normalizeText(query);
  if (!q) return true;

  const haystack = normalizeText(
    [
      item.title,
      item.description,
      item.category,
      Array.isArray(item.tags) ? item.tags.join(' ') : '',
    ].join(' ')
  );

  // Мульти-слова: все токены должны встречаться (AND-логика)
  const tokens = q.split(' ').filter(Boolean);
  return tokens.every((t) => haystack.includes(t));
}

export default function EquipmentCatalogPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const items = getAllContentMeta('oborudovanie') as ContentMeta[];

  const categories = Array.from(
    new Set(items.map((m) => (m.category || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'ru'));

  const tags = Array.from(
    new Set(
      items
        .flatMap((m) => (Array.isArray(m.tags) ? m.tags : []))
        .map((t) => String(t).trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'ru'));

  const selectedCategoryRaw = searchParams?.category;
  const selectedCategory =
    selectedCategoryRaw && selectedCategoryRaw !== 'all'
      ? String(selectedCategoryRaw).trim()
      : undefined;

  const selectedTagRaw = searchParams?.tag;
  const selectedTag =
    selectedTagRaw && selectedTagRaw !== 'all' ? String(selectedTagRaw).trim() : undefined;

  const query = searchParams?.q ? String(searchParams.q) : '';
  const selectedSort = (searchParams?.sort as CatalogSortKey) || 'newest';

  let filtered = items;

  if (selectedCategory) {
    filtered = filtered.filter((it) => (it.category || '').trim() === selectedCategory);
  }

  if (selectedTag) {
    const wanted = normalizeText(selectedTag);
    filtered = filtered.filter((it) => {
      const list = Array.isArray(it.tags) ? it.tags : [];
      return list.some((t) => normalizeText(t) === wanted);
    });
  }

  if (query) {
    filtered = filtered.filter((it) => matchesQuery(it, query));
  }

  filtered = [...filtered].sort((a, b) => {
    if (selectedSort === 'title_asc') {
      return String(a.title).localeCompare(String(b.title), 'ru');
    }

    if (selectedSort === 'price_asc') {
      const ap = safePrice(a.priceFrom);
      const bp = safePrice(b.priceFrom);
      if (ap == null && bp == null) return 0;
      if (ap == null) return 1;
      if (bp == null) return -1;
      return ap - bp;
    }

    if (selectedSort === 'price_desc') {
      const ap = safePrice(a.priceFrom);
      const bp = safePrice(b.priceFrom);
      if (ap == null && bp == null) return 0;
      if (ap == null) return 1;
      if (bp == null) return -1;
      return bp - ap;
    }

    // newest (default)
    const ad = Date.parse(a.lastModified || '') || 0;
    const bd = Date.parse(b.lastModified || '') || 0;
    return bd - ad;
  });

  return (
    <div>
      <BreadcrumbJsonLd
        items={[
          { name: 'Главная', url: '/' },
          { name: 'Оборудование', url: '/oborudovanie' },
        ]}
      />

      <ItemListJsonLd
        name="Оборудование РОСПАРК"
        items={filtered.map((m) => ({
          name: m.title,
          url: `/oborudovanie/${m.slug}`,
          description: m.description,
          image: m.coverImage,
          brand: m.brand,
          sku: m.sku,
          category: m.category,
          priceFrom: m.priceFrom,
          currency: m.currency,
          availability: m.availability,
        }))}
      />

      <Hero
        title="Оборудование"
        description="Промышленное исполнение, сервисопригодность, поддержка и интеграции."
        cta={{ label: 'Получить КП', href: '/quiz' }}
      />

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <CatalogControls
          categories={categories}
          tags={tags}
          selectedCategory={selectedCategory}
          selectedTag={selectedTag}
          selectedSort={selectedSort}
          query={query}
        />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-sm text-text-secondary">
          <div>
            Найдено: <span className="font-medium text-text-primary">{filtered.length}</span>
          </div>
          <div className="text-xs">
            Источник: <code>content/oborudovanie</code> (frontmatter).
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-md border border-border-primary bg-bg-primary p-6 text-sm text-text-secondary">
            Ничего не найдено. Попробуйте изменить запрос или сбросить фильтры.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((m) => (
              <ProductCard
                key={m.slug}
                href={`/oborudovanie/${m.slug}`}
                title={m.title}
                description={m.description}
                coverImage={m.coverImage}
                category={m.category}
                tags={m.tags}
                priceFrom={m.priceFrom}
                currency={m.currency}
              />
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-text-secondary">
          Для добавления товара достаточно создать новый <code>.md</code> по шаблону эталона и заполнить frontmatter.
        </p>

        <LeadFormSection
          className="mt-10"
          sourceSection="equipment_catalog"
          title="Подобрать оборудование"
          description="Оставьте контакты — предложим комплектацию под ваш объект и отправим КП."
          submitLabel="Получить КП"
        />
      </section>
    </div>
  );
}
