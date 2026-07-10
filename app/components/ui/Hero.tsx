import Link from 'next/link';
import { clsx } from 'clsx';

type HeroProps = {
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  className?: string;
};

export default function Hero({ title, description, cta, className }: HeroProps) {
  return (
    <section
      className={clsx(
        'relative overflow-hidden rounded-md border border-border-primary bg-bg-secondary p-6 sm:p-10',
        className
      )}
    >
      {/* Лёгкий визуальный акцент (P2): тонкий радиальный градиент */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(600px circle at 20% 10%, rgba(0, 91, 255, 0.10), transparent 60%)',
        }}
      />
      <div className="relative">
        <h1 className="break-words text-[clamp(2rem,7vw,2.5rem)] font-semibold leading-[1.15] tracking-tight text-text-primary sm:text-[2.5rem] md:text-[3rem] md:leading-[1.12]">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-md text-text-secondary">{description}</p>
        ) : null}

        {cta ? (
          <div className="mt-6">
            <Link
              href={cta.href}
              className="inline-flex items-center justify-center rounded-md bg-accent-primary px-5 py-3 text-sm font-medium text-white transition hover:bg-state-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
            >
              {cta.label}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
