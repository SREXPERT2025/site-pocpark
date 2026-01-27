import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const dir = path.join(process.cwd(), 'content/oborudovanie');

/**
 * Маппинг "человеческих" категорий (из MD) в системные значения,
 * которые ожидает фронт (фильтры/чипы).
 */
const CATEGORY_MAP: Record<string, string> = {
  // Стоики
  'Парковочные стойки': 'posts',
  'Въездные стойки': 'entry-post',
  'Выездные стойки': 'exit-post',

  // Терминалы
  'Кассовые терминалы': 'terminal',
  'Терминалы оплаты парковки': 'terminal',

  // Шлагбаумы
  'Шлагбаумы': 'barrier',

  // Табло
  'Информационные табло': 'display',

  // Распознавание
  'Системы распознавания номеров': 'anpr',

  // Светофоры
  'Светофоры': 'traffic',

  // На всякий случай: часто встречающиеся варианты
  'Распознавание номеров': 'anpr',
  'Табло': 'display',
  'Терминалы': 'terminal',
  'Стойки': 'posts',
};

/**
 * Приводим категорию к системной.
 * Если категория уже системная (terminal/barrier/...), оставляем как есть.
 */
function normalizeCategory(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Если это русское название — замапим
  if (CATEGORY_MAP[trimmed]) return CATEGORY_MAP[trimmed];

  // Если уже системная — оставим
  return trimmed;
}

/**
 * Берём картинку из coverImage (новый стандарт),
 * если её нет — пробуем image (обратная совместимость).
 */
function getImage(data: any): string | null {
  const candidate = (data?.coverImage ?? data?.image) as unknown;
  if (typeof candidate !== 'string') return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  return trimmed;
}

/**
 * Нормализуем цену:
 * - поддерживаем price (как число)
 * - поддерживаем priceFrom (как число) из твоих MD
 */
function getPriceLabel(data: any): string | null {
  const priceRaw = data?.price ?? data?.priceFrom;
  if (priceRaw === undefined || priceRaw === null) return null;

  const n = typeof priceRaw === 'number' ? priceRaw : Number(String(priceRaw).replace(/\s+/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;

  // формат: "от 120 000 ₽"
  const formatted = new Intl.NumberFormat('ru-RU').format(Math.round(n));
  return `от ${formatted} ₽`;
}

export async function getAllEquipment() {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  return files.map(file => {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const { data, content } = matter(raw);

    const image = getImage(data);
    const category = normalizeCategory(data?.category);

    return {
      title: data?.title ?? slug,
      description: data?.description || content.slice(0, 120),
      price: getPriceLabel(data),
      image,          // ✅ теперь будет брать coverImage
      slug,
      category,       // ✅ теперь русские категории будут маппиться
    };
  });
}