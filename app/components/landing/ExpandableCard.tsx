"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ExpandableCardProps = {
  title: string;
  /** Короткий бейдж поверх изображения/шапки */
  eyebrow?: string;
  /** Список выгод/буллитов, показывается при раскрытии */
  bullets: readonly string[];
  /** Куда ведёт ссылка «Перейти к решению →» */
  href: string;

  /** Если задано — вверху будет картинка */
  imageSrc?: string;
  imageAlt?: string;

  /** Иконка для карточек без изображения */
  icon?: ReactNode;

  /** Цветовая схема */
  theme?: "dark" | "light";

  /** Цвета шапки для theme="light" (если хотите подсветить конкретную карточку) */
  headerGradientFrom?: string;
  headerGradientTo?: string;

  /** Текст кнопки раскрытия */
  closedCtaLabel?: string;
  openedCtaLabel?: string;

  /** Текст ссылки при раскрытии */
  linkLabel?: string;

  /** Доп. текст/контент под заголовком (опционально) */
  children?: ReactNode;
};

export default function ExpandableCard(props: ExpandableCardProps) {
  const {
    title,
    eyebrow,
    bullets,
    href,
    imageSrc,
    imageAlt,
    icon,
    theme = "dark",
    headerGradientFrom,
    headerGradientTo,
    closedCtaLabel = "Раскрыть (+)",
    openedCtaLabel = "Свернуть",
    linkLabel = "Перейти к решению →",
    children,
  } = props;

  const [open, setOpen] = useState(false);
  const contentId = useId();

  const palette = useMemo(() => {
    if (theme === "light") {
      return {
        card: "bg-white border-slate-200 text-slate-900",
        overlay: "bg-white/70 text-slate-800 border-slate-200",
        title: "text-slate-900",
        body: "text-slate-700",
        bulletText: "text-slate-700",
        bulletDot: "bg-blue-600",
        cta: "bg-slate-900/5 hover:bg-slate-900/10 border-slate-200 text-slate-900",
        ctaIcon: "bg-slate-900/10 text-slate-900",
        link: "text-slate-900 hover:text-slate-950",
        divider: "border-slate-200",
      };
    }

    return {
      card: "bg-slate-900/40 border-white/10 text-white",
      overlay: "bg-black/25 text-white border-white/10",
      title: "text-white",
      body: "text-white/85",
      bulletText: "text-white/85",
      bulletDot: "bg-blue-400",
      cta: "bg-white/5 hover:bg-white/10 border-white/10 text-white",
      ctaIcon: "bg-white/10 text-white",
      link: "text-white/90 hover:text-white",
      divider: "border-white/10",
    };
  }, [theme]);

  const hasHeaderImage = Boolean(imageSrc);
  const headerStyle =
    theme === "light" && (headerGradientFrom || headerGradientTo)
      ? {
          backgroundImage: `linear-gradient(135deg, ${headerGradientFrom || "#f8fafc"}, ${headerGradientTo || "#ffffff"})`,
        }
      : undefined;

  return (
    <article
      className={`relative overflow-hidden rounded-3xl border shadow-[0_20px_60px_rgba(0,0,0,0.18)] ${palette.card}`}
    >
      {/* Header */}
      <div className="relative">
        {hasHeaderImage ? (
          <div className="relative h-56 w-full">
            <Image
              src={imageSrc as string}
              alt={imageAlt || title}
              fill
              className="object-cover"
              priority={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-black/0" />
          </div>
        ) : (
          <div className="relative h-56 w-full" style={headerStyle}>
            {/* базовый фон (если градиент не задан) */}
            {!headerStyle ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-slate-50" />
                <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(#0ea5e9_1px,transparent_1px)] [background-size:18px_18px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/70 to-white/0" />
              </>
            ) : null}

            {icon ? (
              <div className="absolute left-6 top-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/5 text-xl">
                {icon}
              </div>
            ) : null}
          </div>
        )}

        {eyebrow ? (
          <div
            className={`absolute left-6 top-6 inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur ${palette.overlay}`}
          >
            {eyebrow}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-6">
          <h3 className={`text-3xl font-extrabold leading-tight tracking-tight ${palette.title}`}>{title}</h3>
          {children ? <div className={`mt-4 text-[17px] leading-[20px] ${palette.body}`}>{children}</div> : null}
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 pb-6 pt-4">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            className={`inline-flex items-center gap-3 rounded-full border px-5 py-3 text-sm font-semibold transition ${palette.cta}`}
            aria-expanded={open}
            aria-controls={contentId}
            onClick={() => setOpen((v) => !v)}
          >
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${palette.ctaIcon}`}
              aria-hidden="true"
            >
              {open ? "−" : "+"}
            </span>
            <span>{open ? openedCtaLabel : closedCtaLabel}</span>
          </button>

          <Link
            href={href}
            className={`text-sm font-semibold transition ${open ? palette.link : "pointer-events-none opacity-0"}`}
            aria-hidden={!open}
            tabIndex={open ? 0 : -1}
          >
            {linkLabel}
          </Link>
        </div>

        {/* Expandable content */}
        <div
          id={contentId}
          className={`grid transition-all duration-300 ease-out ${
            open ? "grid-rows-[1fr] opacity-100 mt-5" : "grid-rows-[0fr] opacity-0 mt-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className={`pt-5 border-t ${palette.divider}`}>
              <ul className="space-y-3">
                {bullets.map((b, i) => (
                  <li key={`${i}-${b.slice(0, 16)}`} className="flex items-start gap-3">
                    <span className={`mt-2 h-2 w-2 flex-none rounded-full ${palette.bulletDot}`} aria-hidden="true" />
                    <span className={`text-base leading-relaxed ${palette.bulletText}`}>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
