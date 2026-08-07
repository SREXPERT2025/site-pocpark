import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Building2, CalendarDays, CarFront, Clock3, ExternalLink, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import { getPublicDemoRequest } from '@/app/lib/demo-request-store';
import { absoluteUrl } from '@/app/config/site-url';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Гостевая заявка — demo РОСПАРК',
  description: 'Публичный demo-просмотр гостевой заявки бизнес-центра РОСПАРК.',
  robots: { index: false, follow: false, nocache: true },
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));
}

function stayMinutes(enteredAt?: string, exitedAt?: string) {
  if (!enteredAt || !exitedAt) return 0;
  return Math.max(0, Math.round((new Date(exitedAt).getTime() - new Date(enteredAt).getTime()) / 60_000));
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} мин`;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

const statusLabels = {
  waiting: 'Ожидает въезда', active: 'На территории', completed: 'Завершена', cancelled: 'Отменена',
} as const;

const statusClasses = {
  waiting: 'border-amber-200 bg-amber-50 text-amber-900',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  completed: 'border-blue-200 bg-blue-50 text-blue-800',
  cancelled: 'border-rose-200 bg-rose-50 text-rose-800',
} as const;

export default async function PublicDemoRequestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = getPublicDemoRequest(token);
  if (!request) notFound();
  const publicUrl = absoluteUrl(`/demo/arendar/${request.publicToken}`);
  const qrCode = await QRCode.toDataURL(publicUrl, {
    width: 240,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: { dark: '#0f172a', light: '#ffffff' },
  });
  const minutes = stayMinutes(request.enteredAt, request.exitedAt);
  const cost = request.status === 'completed' ? Math.ceil(minutes / 60) * (request.hourlyRate ?? 100) : 0;

  return (
    <div className="bg-slate-50 py-10 sm:py-14">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Все демо', href: '/demo' }, { label: 'Гостевые заявки', href: '/demo/gostevaya-zayavka' }, { label: `Заявка № ${request.id}` }]} />
        <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <header className="flex flex-col gap-5 bg-slate-950 px-6 py-7 text-white sm:flex-row sm:items-center sm:justify-between sm:px-9">
            <div className="flex items-center gap-4">
              <span className="rounded-2xl bg-blue-600 p-3"><Building2 aria-hidden="true" size={25} /></span>
              <div><p className="text-sm text-blue-200">Бизнес-центр «РОСПАРК»</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Гостевая заявка</h1></div>
            </div>
            <span className={`inline-flex self-start rounded-full border px-3 py-1.5 text-sm font-semibold ${statusClasses[request.status]}`}>{statusLabels[request.status]}</span>
          </header>

          <div className="grid lg:grid-cols-[1fr_300px]">
            <section className="p-6 sm:p-9" aria-labelledby="request-number">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Публичный demo-пропуск</p>
              <h2 id="request-number" className="mt-2 break-all font-mono text-xl font-bold text-slate-950 sm:text-2xl">№ {request.id}</h2>
              <dl className="mt-7 grid gap-5 text-sm sm:grid-cols-2">
                <div><dt className="text-slate-500">Гость</dt><dd className="mt-1 text-lg font-bold text-slate-950">{request.guestName}</dd></div>
                <div><dt className="text-slate-500">Автомобиль</dt><dd className="mt-1 inline-flex items-center gap-2 rounded-lg border-2 border-slate-900 px-3 py-1 font-mono text-lg font-bold"><CarFront aria-hidden="true" size={17} />{request.vehicleNumber}</dd></div>
                <div><dt className="text-slate-500">Действует от</dt><dd className="mt-1 flex items-center gap-2 font-semibold text-slate-950"><CalendarDays aria-hidden="true" size={17} />{formatDateTime(request.validFrom)}</dd></div>
                <div><dt className="text-slate-500">Действует до</dt><dd className="mt-1 flex items-center gap-2 font-semibold text-slate-950"><Clock3 aria-hidden="true" size={17} />{formatDateTime(request.validUntil)}</dd></div>
                {request.exitedAt ? <div><dt className="text-slate-500">Время на территории</dt><dd className="mt-1 font-semibold text-slate-950">{formatDuration(minutes)}</dd></div> : null}
                {request.status === 'completed' ? <div><dt className="text-slate-500">Начислено</dt><dd className="mt-1 text-lg font-bold text-blue-700">{new Intl.NumberFormat('ru-RU').format(cost)} ₽</dd></div> : null}
                <div className="sm:col-span-2"><dt className="text-slate-500">Примечание</dt><dd className="mt-1 leading-6 text-slate-900">{request.note || '—'}</dd></div>
              </dl>
              <div className="mt-7 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><ShieldCheck aria-hidden="true" size={19} className="mb-2" />Телефон гостя скрыт. Страница доступна только по непредсказуемой ссылке и закрыта от поисковой индексации.</div>
            </section>
            <aside className="flex flex-col items-center justify-center border-t border-slate-200 bg-slate-50 p-7 lg:border-l lg:border-t-0">
              <Image src={qrCode} alt="QR-код публичной demo-заявки" width={208} height={208} unoptimized className="h-52 w-52 rounded-2xl" />
              <p className="mt-4 text-center text-xs leading-5 text-slate-500">QR-код ведёт на эту публичную страницу</p>
            </aside>
          </div>
          <footer className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-9">
            <span>Демонстрационный интерфейс РОСПАРК</span>
            <Link href="/demo/gostevaya-zayavka" className="inline-flex items-center gap-2 font-semibold text-blue-700 hover:text-blue-900">Открыть demo-кабинет <ExternalLink aria-hidden="true" size={15} /></Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
