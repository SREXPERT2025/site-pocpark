import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

// ✅ Тип для кейсов
export type CaseFrontmatter = {
  title: string;
  description: string;
  customer: string;
  industry: string;
  coverImage?: string;
  metrics: {
    label: string;
    value: string;
  }[];
};

// Тип для оборудования
export type EquipmentFrontmatter = {
  title: string;
  description: string;
  coverImage?: string;
  gallery?: string[];
  specifications?: {
    name: string;
    value: string;
  }[];
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
  lastModified?: string; // ✅ ДОБАВЛЕНО
};

export type ContentDoc = ContentMeta & {
  contentHtml: string;
  cta?: CtaItem;
  ctas?: CtaItem[];
};

// --- ВСПОМОГАТЕЛЬНЫЕ ---
function getContentDir(section: string) {
  return path.join(process.cwd(), 'content', section);
}

// --- META ---
export function getAllContentMeta(section: string): ContentMeta[] {
  const dir = getContentDir(section);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  return files
    .map((file) => {
      const slug = file.replace(/\.md$/i, '');
      const filePath = path.join(dir, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(raw);

      // ✅ lastModified: приоритет frontmatter → fallback на fs
      const lastModified =
        data.lastModified ||
        data.date ||
        fs.statSync(filePath).mtime.toISOString();

      return {
        slug,
        title: String(data.title ?? slug),
        description: String(data.description ?? ''),
        lastModified,
      };
    })
    .filter((m) => m.title);
}

// --- CONTENT ---
export function getContentBySlug<T extends object>(
  section: string,
  slug: string
): (ContentDoc & T) | null {
  const dir = getContentDir(section);
  const filePath = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(raw);
  const html = marked.parse(content) as string;

  // CTA (title -> label)
  const ctaRaw = data.cta as any;
  const cta: CtaItem | undefined =
    ctaRaw && (ctaRaw.title || ctaRaw.label) && ctaRaw.buttonText && ctaRaw.href
      ? {
          label: String(ctaRaw.label ?? ctaRaw.title),
          description: ctaRaw.description ? String(ctaRaw.description) : undefined,
          buttonText: String(ctaRaw.buttonText),
          href: String(ctaRaw.href),
          badge: ctaRaw.badge ? String(ctaRaw.badge) : undefined,
        }
      : undefined;

  // Спецификации (parameter -> name)
  if (Array.isArray(data.specifications)) {
    (data as any).specifications = data.specifications.map((spec: any) => ({
      name: spec.name ?? spec.parameter,
      value: spec.value,
    }));
  }

  return {
    ...(data as T),
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ''),
    lastModified:
      data.lastModified ||
      data.date ||
      fs.statSync(filePath).mtime.toISOString(),
    contentHtml: html,
    cta,
  };
}
