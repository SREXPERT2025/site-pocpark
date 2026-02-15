import { notFound } from 'next/navigation';
import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';
import ProductView from './ProductView'; // Импортируем наш новый компонент

const contentDir = path.join(process.cwd(), 'content/oborudovanie');

export default function ProductPage({ params }: { params: { slug: string } }) {
  const filePath = path.join(contentDir, `${params.slug}.md`);
  if (!fs.existsSync(filePath)) return notFound();

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  // Передаем данные и контент (текст описания) в клиентский компонент
  return <ProductView data={data} content={content} />;
}
