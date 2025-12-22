import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-border-primary bg-bg-primary">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-text-primary">РОСПАРК</div>
            <div className="mt-2 text-xs text-text-secondary">© {new Date().getFullYear()} СР-Эксперт</div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
            <Link className="hover:text-text-primary" href="/resheniya/dlya-rukovoditeley">Решения</Link>
            <Link className="hover:text-text-primary" href="/vozmozhnosti">Возможности</Link>
            <Link className="hover:text-text-primary" href="/oborudovanie">Оборудование</Link>
            <Link className="hover:text-text-primary" href="/keysy">Проекты</Link>
            <Link className="hover:text-text-primary" href="/contacts">Контакты</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
