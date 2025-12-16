import Button from '@/app/components/ui/Button';
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
        'relative overflow-hidden rounded-md border border-border-primary bg-bg-secondary p-8 sm:p-10',
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
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-md text-text-secondary">{description}</p>
        ) : null}

        {cta ? (
          <div className="mt-6">
            <Link href={cta.href}>
              <Button>{cta.label}</Button>
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
