'use client';

import { useState } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

export default function ProductView({ data, content }: { data: any; content: string }) {
  const {
    title,
    description,
    coverImage,
    imageCaption,
    gallery = [],
    answerFirst,
    useCases = [],
    specifications = [],
    packageContents = [],
    downloads = [],
    faq = [],
  } = data;

  const allImages = Array.from(
    new Set(
      [coverImage, ...(Array.isArray(gallery) ? gallery : [])]
        .map((image) => (typeof image === 'string' ? image.trim() : ''))
        .filter(Boolean)
    )
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  return (
    <main className="bg-white pb-20">
      {/* ================= HERO + ANSWER FIRST (ЕДИНЫЙ ЭКРАН) ================= */}
      <section className="border-b border-[#E6E6E6] bg-[#F9FAFB] pb-6 pt-12">
        <div className="mx-auto max-w-[1100px] min-w-0 px-4 sm:px-6">
          {/* 1. ЗАГОЛОВОК И CTA */}
          <div className="mb-8 text-center md:text-left">
            <h1 className="mb-6 text-[24px] font-bold leading-tight text-[#0B1220]">
              {title}
            </h1>

            {description && (
              <p className="mb-8 max-w-[800px] break-words text-[17px] leading-relaxed text-gray-600 sm:text-[18px]">
                {description}
              </p>
            )}

            <Link
              href={`/quiz?product=${encodeURIComponent(title)}&source=product-page`}
              className="inline-flex min-h-[45px] w-full max-w-[440px] items-center justify-center rounded-lg bg-[#2563EB] px-4 py-3 text-center text-[16px] font-semibold leading-snug text-white shadow-sm transition hover:bg-blue-700 sm:text-[18px]"
            >
              Получить коммерческое предложение
            </Link>
          </div>

          {/* 2. ANSWER FIRST (АКЦЕНТНЫЙ БЛОК) */}
          {answerFirst && (
            <div className="relative mb-8 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-8">
              <div className="absolute left-0 top-0 h-full w-1 bg-[#2563EB]" />

              <div className="mb-5 flex items-center gap-3">
                <span className="inline-block rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#2563EB]">
                  Главное за 30 секунд
                </span>
              </div>

              <h3 className="mb-6 break-words text-[24px] font-bold leading-[1.3] text-[#0B1220] sm:text-[28px]">
                {answerFirst.lead}
              </h3>

              <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
                {answerFirst.bullets?.map((b: string) => (
                  <div key={b} className="flex items-start gap-3">
                    <span className="mt-1 flex-shrink-0 text-green-500">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </span>
                    <span className="break-words text-[17px] font-medium leading-relaxed text-gray-900 sm:text-[18px]">
                      {b}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] min-w-0 px-4 sm:px-6">
        {/* ================= ГАЛЕРЕЯ (ДОМИНИРУЮЩАЯ) ================= */}
        <section className="flex flex-col items-center border-b border-gray-100 py-10">
          <div className="relative mb-6 flex h-[350px] w-full max-w-[800px] items-center justify-center md:h-[500px]">
            <button
              type="button"
              aria-label="Предыдущее изображение"
              onClick={prevImage}
              className="absolute left-[-20px] top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white pb-1 text-2xl text-gray-700 shadow-md transition hover:bg-gray-50 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:left-[-60px]"
            >
              ‹
            </button>

            <div className="relative h-full w-full">
              <Image
                src={allImages[currentImageIndex]}
                alt={title}
                fill
                sizes="(min-width: 848px) 800px, (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)"
                className="object-contain"
                priority
              />
            </div>

            <button
              type="button"
              aria-label="Следующее изображение"
              onClick={nextImage}
              className="absolute right-[-20px] top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white pb-1 text-2xl text-gray-700 shadow-md transition hover:bg-gray-50 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 md:right-[-60px]"
            >
              ›
            </button>
          </div>

          <p className="mb-8 rounded-full bg-gray-50 px-4 py-1 text-center text-sm font-medium text-gray-500">
            {imageCaption ??
              'Внешний вид, комплектация и исполнение уточняются под задачу объекта и версию оборудования.'}
          </p>

          {allImages.length > 1 && (
            <div className="flex justify-center gap-4 overflow-x-auto py-2">
              {allImages.map((img: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Показать изображение ${idx + 1} из ${allImages.length}`}
                  aria-pressed={idx === currentImageIndex}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative h-20 w-20 cursor-pointer overflow-hidden rounded-md border-2 bg-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    idx === currentImageIndex
                      ? 'scale-105 border-blue-600 opacity-100 ring-2 ring-blue-100'
                      : 'border-transparent opacity-70 hover:border-gray-300 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={img}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-contain object-center p-1"
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ================= ОПИСАНИЕ (LEAD-АБЗАЦ) ================= */}
        <section className="py-16">
          <h2 className="mb-8 text-3xl font-bold text-[#0B1220]">
            Описание и возможности
          </h2>

          <div
            className="
              prose prose-lg max-w-none text-gray-600
              prose-headings:font-bold prose-headings:text-[#0B1220]
              prose-li:marker:text-blue-500
              prose-img:rounded-xl
              prose-p:first-of-type:mb-8
              prose-p:first-of-type:text-[28px]
              prose-p:first-of-type:leading-[1.35]
              prose-p:first-of-type:text-gray-900
            "
          >
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          <div className="group mt-10 flex cursor-pointer items-start gap-4 rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm transition hover:bg-blue-100 sm:items-center">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
              !
            </span>
            <span className="text-lg font-medium text-blue-900 decoration-blue-400 underline-offset-4 group-hover:underline">
              Подготовим спецификацию под ваш объект, рассчитаем смету и покажем
              демо-версию.
            </span>
          </div>
        </section>

        {/* ================= ХАРАКТЕРИСТИКИ (ВОЗДУХ) ================= */}
        {specifications.length > 0 && (
          <section className="mb-16">
            <h2 className="mb-8 text-3xl font-bold text-[#0B1220]">
              Технические характеристики
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {specifications.map((s: any, i: number) => (
                <div
                  key={s.name}
                  className={`flex flex-col justify-between border-b border-gray-100 px-6 py-5 text-[18px] last:border-0 sm:flex-row ${
                    i % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
                  }`}
                >
                  <span className="mb-1 w-1/3 font-medium text-gray-700 sm:mb-0">
                    {s.name}
                  </span>
                  <span className="w-full font-semibold text-gray-900 sm:w-2/3 sm:text-right">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================= КОМПЛЕКТАЦИЯ (СИНХРОНИЗАЦИЯ ШРИФТОВ) ================= */}
        {packageContents.length > 0 && (
          <section className="mb-16">
            <h2 className="mb-8 text-3xl font-bold text-[#0B1220]">Комплектация</h2>
            <div className="rounded-xl border border-[#E6E6E6] bg-[#F5F7FA] p-8">
              <ul className="mb-6 space-y-4">
                {packageContents.map((p: string) => (
                  <li key={p} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-xs font-bold text-green-600">
                      ✔
                    </div>
                    <span className="text-[18px] font-medium text-gray-900">{p}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-gray-200 pt-4 text-xs text-gray-400">
                * Состав комплектации и внешний вид изделия могут быть уточнены в
                зависимости от проекта и версии оборудования.
              </p>
            </div>
          </section>
        )}

        {/* ================= FAQ (АКЦЕНТЫ) ================= */}
        {faq.length > 0 && (
          <section className="mb-16">
            <h2 className="mb-8 text-3xl font-bold text-[#0B1220]">Частые вопросы</h2>
            <div className="space-y-4">
              {faq.map((f: any) => (
                <div
                  key={f.question}
                  className="group rounded-lg border border-gray-200 bg-white p-6 transition hover:shadow-md"
                >
                  <div className="mb-3 text-lg font-bold text-[#0B1220] transition-colors group-hover:text-blue-700">
                    {f.question}
                  </div>
                  <div className="leading-relaxed text-gray-700">{f.answer}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================= РАСШИРЕННАЯ ИНФОРМАЦИЯ ================= */}
        <section className="mb-16">
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <details className="group bg-white">
              <summary className="flex list-none cursor-pointer items-center justify-between p-6 transition hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-[#0B1220]">
                    Расширенная информация
                  </span>
                  <span className="hidden text-sm font-normal text-gray-400 sm:block">
                    Файлы, документация и дополнительные материалы
                  </span>
                </div>
                <span className="text-gray-400 transition-transform duration-200 group-open:rotate-180">
                  ▼
                </span>
              </summary>
              <div className="border-t border-gray-100 bg-gray-50 p-6 pt-0 text-gray-600">
                <div className="grid grid-cols-1 gap-8 pt-6 md:grid-cols-2">
                  <div>
                    <div className="mb-4 text-xs font-bold uppercase tracking-wider text-black opacity-50">
                      Документы
                    </div>
                    <div className="flex flex-col gap-3">
                      {downloads.map((d: any) => (
                        <a
                          key={d.url}
                          href={d.url}
                          className="flex items-center gap-2 rounded border border-gray-100 bg-white p-3 font-medium text-blue-600 shadow-sm transition hover:underline hover:shadow-md"
                        >
                          <span className="text-xl">📄</span> {d.title}
                        </a>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="mb-4 text-xs font-bold uppercase tracking-wider text-black opacity-50">
                      Сценарии применения
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {useCases.map((u: string) => (
                        <span
                          key={u}
                          className="rounded border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
                        >
                          {u}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </section>

        {/* ================= ФОРМА (ФИНАЛЬНЫЙ УДАР) ================= */}
        <section className="rounded-xl border-2 border-dashed border-[#FBBF24] bg-yellow-50 py-16 text-center">
          <h3 className="mb-4 text-3xl font-bold text-[#0B1220]">
            Есть вопросы или нужен расчет?
          </h3>
          <p className="mx-auto mb-8 max-w-lg text-lg leading-relaxed text-gray-700">
            Оставьте заявку, и инженер свяжется с вами для уточнения деталей проекта и
            подбора конфигурации.
          </p>
          <Link
            href={`/quiz?product=${encodeURIComponent(title)}&source=product-page`}
            className="inline-flex items-center justify-center rounded-lg bg-[#FBBF24] px-12 py-4 text-lg font-bold text-black shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F59E0B] hover:shadow-lg"
          >
            Оставить заявку
          </Link>
        </section>
      </div>
    </main>
  );
}
