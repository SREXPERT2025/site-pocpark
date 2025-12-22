import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

// ✅ Тип для кейсов / проектов
export type CaseFrontmatter = {
  title: string;
  description: string;
  customer?: string;
  industry?: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  /** Формат карточки (например: 'video' | 'text') */
  format?: string;
  /** Ссылка на видео (YouTube/Vimeo) */
  videoUrl?: string;
  metrics?: { label: string; value: string }[];
  answerFirst?: { lead: string; bullets: string[] };
  faq?: { question: string; answer: string }[];
  lastModified?: string;
};

// Тип для оборудования
export type EquipmentFrontmatter = {
  title: string;
  description: string;
  coverImage?: string;
  gallery?: string[];
  /** Категория (для фильтров/витрины) */
  category?: string;
  /** Теги (для фильтров/поиска) */
  tags?: string[];
  /** Бренд (для Schema.org Product) */
  brand?: string;
  /** Модель/линейка */
  model?: string;
  /** SKU (внутренний артикул) */
  sku?: string;
  /** MPN (производственный артикул), опционально */
  mpn?: string;
  /** GTIN/EAN, опционально */
  gtin?: string;
  /** Цена «от» (если 0/не задано — «по запросу») */
  priceFrom?: number;
  /** Валюта (например, RUB) */
  currency?: string;
  /** Наличие для Offer (InStock/OutOfStock/PreOrder) */
  availability?: string;

  /** Формат/тип контента (например: 'video' | 'text') */
  format?: string;
  /** Ссылка на видео (YouTube/Vimeo) для проекта/страницы (опционально) */
  videoUrl?: string;

  /** Состояние товара (NewCondition/UsedCondition/RefurbishedCondition) */
  condition?: string;
  specifications?: { name: string; value: string }[];
  /** Комплектация (видимый блок) */
  packageContents?: string[];
  /** Скачивания/документы */
  downloads?: { title: string; url: string }[];

  /** Answer-first (lead + bullets) */
  answerFirst?: { lead: string; bullets: string[] };
  /** FAQ */
  faq?: { question: string; answer: string }[];
  lastModified?: string;
};

// Тип для CTA
export type CtaItem = {
  label: string;
  description?: string;
  buttonText: string;
  href: string;
  badge?: string;
};

// --- ОБЩИЕ ТИПЫ ---
export type ContentMeta = {
  slug: string;
  title: string;
  description: string;
  lastModified?: string;

  // витринные поля (опционально)
  coverImage?: string;
  category?: string;
  tags?: string[];
  brand?: string;
  model?: string;
  sku?: string;
  priceFrom?: number;
  currency?: string;
  availability?: string;

  /** Формат/тип контента */
  format?: string;
  /** Ссылка на видео */
  videoUrl?: string;
};

export type ContentDoc = ContentMeta & {
  contentHtml: string;
  // дополнительные поля (по разделам)
  gallery?: string[];
  metrics?: { label: string; value: string }[];
  specifications?: { name: string; value: string }[];
  packageContents?: string[];
  downloads?: { title: string; url: string }[];
  customer?: string;
  industry?: string;
  cta?: CtaItem;
  ctas?: CtaItem[];
  faq?: { question: string; answer: string }[];
  answerFirst?: { lead: string; bullets: string[] };
};

// --- ВСПОМОГАТЕЛЬНЫЕ ---
function getContentDir(section: string) {
  return path.join(process.cwd(), 'content', section);
}

function getContentFilePath(section: string, slug: string) {
  return path.join(process.cwd(), 'content', section, `${slug}.md`);
}

function getExtendedContentFilePath(section: string, slug: string) {
  return path.join(process.cwd(), 'content', 'extended', section, `${slug}.md`);
}

function normalizeString(v: any): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
}

function normalizeStringArray(v: any): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((x) => String(x).trim()).filter(Boolean);
  return out.length ? out : undefined;
}

function normalizeTags(v: any): string[] | undefined {
  return normalizeStringArray(v);
}

function normalizePriceFrom(v: any): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function normalizeMetrics(v: any): { label: string; value: string }[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .map((m) => {
      const label = normalizeString(m?.label ?? m?.name);
      const value = normalizeString(m?.value ?? m?.val);
      return label && value ? { label, value } : null;
    })
    .filter(Boolean) as { label: string; value: string }[];
  return out.length ? out : undefined;
}

function normalizeSpecs(v: any): { name: string; value: string }[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .map((s) => {
      const name = normalizeString(s?.name ?? s?.label);
      const value = normalizeString(s?.value ?? s?.val);
      return name && value ? { name, value } : null;
    })
    .filter(Boolean) as { name: string; value: string }[];
  return out.length ? out : undefined;
}

function normalizeDownloads(v: any): { title: string; url: string }[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .map((d) => {
      const title = normalizeString(d?.title ?? d?.name);
      const url = normalizeString(d?.url ?? d?.href);
      return title && url ? { title, url } : null;
    })
    .filter(Boolean) as { title: string; url: string }[];
  return out.length ? out : undefined;
}

function normalizeFaq(v: any): { question: string; answer: string }[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .map((item) => {
      const question = normalizeString(item?.question ?? item?.q ?? item?.name);
      const answer = normalizeString(item?.answer ?? item?.a ?? item?.text);
      return question && answer ? { question, answer } : null;
    })
    .filter(Boolean) as { question: string; answer: string }[];
  return out.length ? out : undefined;
}

function normalizeAnswerFirst(v: any): { lead: string; bullets: string[] } | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const lead = normalizeString((v as any).lead ?? (v as any).summary);
  const bullets = normalizeStringArray((v as any).bullets ?? (v as any).items) ?? [];
  if (!lead) return undefined;
  return { lead, bullets };
}

function normalizeCta(v: any): CtaItem | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const label = normalizeString((v as any).label);
  const buttonText = normalizeString((v as any).buttonText);
  const href = normalizeString((v as any).href);
  if (!label || !buttonText || !href) return undefined;
  const description = normalizeString((v as any).description);
  const badge = normalizeString((v as any).badge);
  return { label, buttonText, href, description, badge };
}

function normalizeCtas(v: any): CtaItem[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.map(normalizeCta).filter(Boolean) as CtaItem[];
  return out.length ? out : undefined;
}

// --- META ---
export function getAllContentMeta(section: string): ContentMeta[] {
  const dir = getContentDir(section);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.md'));

  return files.map((file) => {
    const slug = file.replace(/\.md$/i, '');
    const filePath = path.join(dir, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(raw);
    const fm: any = data || {};

    const lastModified =
      normalizeString(fm.lastModified) ||
      normalizeString(fm.date) ||
      fs.statSync(filePath).mtime.toISOString();

    const meta: ContentMeta = {
      slug,
      title: String(fm.title ?? slug),
      description: String(fm.description ?? ''),
      lastModified,
      coverImage: normalizeString(fm.coverImage),
      category: normalizeString(fm.category),
      tags: normalizeTags(fm.tags),
      brand: normalizeString(fm.brand),
      model: normalizeString(fm.model),
      sku: normalizeString(fm.sku),
      priceFrom: normalizePriceFrom(fm.priceFrom),
      currency: normalizeString(fm.currency),
      availability: normalizeString(fm.availability),
      format: normalizeString(fm.format),
      videoUrl: normalizeString(fm.videoUrl),
    };

    return meta;
  });
}

// --- DOC ---
export function getContentBySlug<T = Record<string, any>>(
  section: string,
  slug: string
): (ContentDoc & T) | null {
  const filePath = getContentFilePath(section, slug);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  const fm: any = data || {};
  const html = marked.parse(content) as string;

  const lastModified =
    normalizeString(fm.lastModified) ||
    normalizeString(fm.date) ||
    fs.statSync(filePath).mtime.toISOString();

  const answerFirst = normalizeAnswerFirst(fm.answerFirst ?? fm.answer_first);
  const doc: any = {
    slug,
    title: String(fm.title ?? slug),
    description: String(fm.description ?? ''),
    lastModified,
    coverImage: normalizeString(fm.coverImage),
    category: normalizeString(fm.category),
    tags: normalizeTags(fm.tags),
    brand: normalizeString(fm.brand),
    model: normalizeString(fm.model),
    sku: normalizeString(fm.sku),
    priceFrom: normalizePriceFrom(fm.priceFrom),
    currency: normalizeString(fm.currency),
    availability: normalizeString(fm.availability),
    format: normalizeString(fm.format),
    videoUrl: normalizeString(fm.videoUrl),
    contentHtml: html,

    // расширенные поля
    gallery: normalizeStringArray(fm.gallery),
    metrics: normalizeMetrics(fm.metrics),
    specifications: normalizeSpecs(fm.specifications),
    packageContents: normalizeStringArray(fm.packageContents),
    downloads: normalizeDownloads(fm.downloads),
    customer: normalizeString(fm.customer),
    industry: normalizeString(fm.industry),
    cta: normalizeCta(fm.cta),
    ctas: normalizeCtas(fm.ctas),
    faq: normalizeFaq(fm.faq),
    answerFirst,
  };

  // возвращаем типизированный объект (frontmatter + common doc)
  return doc as ContentDoc & T;
}

/**
 * Extended контент используется для блока "Расширенная информация".
 * Хранится в: content/extended/<section>/<slug>.md
 *
 * Важно: вызывать только в Server Components / server-side коде.
 */
export function getExtendedContentBySlug(
  section: string,
  slug: string
): ContentDoc | null {
  const filePath = getExtendedContentFilePath(section, slug);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  const fm: any = data || {};
  const html = marked.parse(content) as string;

  const lastModified =
    normalizeString(fm.lastModified) ||
    normalizeString(fm.date) ||
    fs.statSync(filePath).mtime.toISOString();

  const doc: ContentDoc = {
    slug,
    title: String(fm.title ?? slug),
    description: String(fm.description ?? ''),
    lastModified,
    contentHtml: html,
    faq: normalizeFaq(fm.faq),
    answerFirst: normalizeAnswerFirst(fm.answerFirst ?? fm.answer_first),
  };

  return doc;
}
