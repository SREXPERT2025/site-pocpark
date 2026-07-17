import type { Metadata } from 'next';
import BreadcrumbJsonLd from '@/app/components/content/BreadcrumbJsonLd';
import FaqJsonLd from '@/app/components/content/FaqJsonLd';
import Breadcrumbs from '@/app/components/ui/Breadcrumbs';
import FaqBlock from '@/app/components/ui/FaqBlock';
import { canonicalUrl } from '@/app/config/site-url';
import GuestRequestPortal from './GuestRequestPortal';

const pagePath = '/demo/gostevaya-zayavka';

const faq = [
  {
    question: 'Это настоящий личный кабинет парковки?',
    answer:
      'Нет. Это интерактивная демонстрация интерфейса РОСПАРК. Она не открывает шлагбаум, не создаёт пропуск в действующей системе и не связана с парковочным контроллером.',
  },
  {
    question: 'Где хранятся созданные заявки?',
    answer:
      'Только в localStorage текущего браузера: до 20 записей и не более 24 часов. После очистки данных браузера или истечения срока заявки исчезают.',
  },
  {
    question: 'Можно ли отправить заявку гостю в MAX?',
    answer:
      'Да. Для demo предусмотрена серверная отправка через MAX-инстанс GREEN-API. Пока интеграция не включена, интерфейс использует системное меню отправки или копирование текста и ссылки.',
  },
  {
    question: 'Можно ли отменить заявку?',
    answer:
      'Да. Арендатор может отменить заявку, пока она находится в статусе ожидания. Просроченные и уже отменённые заявки изменить нельзя.',
  },
];

export const metadata: Metadata = {
  title: 'Демо личного кабинета гостевых заявок',
  description:
    'Интерактивное демо РОСПАРК: вход арендатора, создание гостевой заявки, QR-код, история заявок и отмена ожидающего доступа.',
  alternates: { canonical: canonicalUrl(pagePath) },
  openGraph: {
    title: 'Демо личного кабинета арендатора | РОСПАРК',
    description: 'Создайте тестовую гостевую заявку, получите QR-код и проверьте историю внутри безопасного demo-режима.',
    url: canonicalUrl(pagePath),
    type: 'website',
  },
};

export default function GuestRequestDemoPage() {
  return (
    <div className="pb-8">
      <BreadcrumbJsonLd items={[{ name: 'Главная', url: '/' }, { name: 'Возможности', url: '/vozmozhnosti' }, { name: 'Демо гостевых заявок', url: pagePath }]} />
      <FaqJsonLd items={faq} />
      <Breadcrumbs items={[{ label: 'Главная', href: '/' }, { label: 'Возможности', href: '/vozmozhnosti' }, { label: 'Демо гостевых заявок' }]} />

      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 px-5 py-9 sm:px-9 sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">Интерактивное demo РОСПАРК</p>
        <h1 className="mt-4 max-w-4xl text-[clamp(2rem,7vw,3.5rem)] font-bold leading-[1.08] tracking-tight text-slate-950">
          Создайте гостевую заявку как арендатор бизнес-центра
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
          Войдите с TEST/TEST, оформите временный доступ, получите карточку с QR-кодом и управляйте своими заявками — в одном демонстрационном кабинете.
        </p>
      </section>

      <GuestRequestPortal />
      <FaqBlock title="Вопросы о demo-кабинете" items={faq} />
    </div>
  );
}
