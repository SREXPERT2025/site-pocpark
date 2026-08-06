import type { Metadata } from 'next';
import FeaturesShowcase from '@/app/components/FeaturesShowcase';
import Hero from "@/app/components/landing/Hero";
import RoleSelector from "@/app/components/landing/RoleSelector";
import ObjectTypesSection from "@/app/components/landing/ObjectTypesSection";
import CapabilitiesSection from "@/app/components/landing/CapabilitiesSection";
import PriceList from "@/app/components/landing/PriceList";
import LeadForm from "@/app/components/landing/LeadForm";
import LandingChoiceSection from '@/app/components/landing/LandingChoiceSection';
import { canonicalUrl } from '@/app/config/site-url';

export const metadata: Metadata = {
  title: 'Автоматизация парковок и контроль въезда',
  description:
    'РОСПАРК автоматизирует въезд, доступ, оплату и контроль парковки. Подберём решение под задачу торгового центра, бизнес-центра, ЖК, гостиницы или предприятия.',
  alternates: {
    canonical: canonicalUrl('/'),
  },
  openGraph: {
    title: 'Автоматизация парковок и контроль въезда — РОСПАРК',
    description:
      'Автоматизация въезда, доступа, оплаты и контроля парковки под задачу вашего объекта.',
    url: canonicalUrl('/'),
    type: 'website',
  },
};

export default function HomePage() {
  return (
    <div className="pt-0">
      <Hero />

      <LandingChoiceSection />

      <div className="flex flex-col gap-24">
        {/* 2. Архитектура системы — усиливает Hero */}
        <CapabilitiesSection />

        {/* 3. Где применяется */}
        <ObjectTypesSection />

        {/* 4. Кто внутри компании работает */}
        <RoleSelector />

        {/* 5. Коммерческий блок */}
        <PriceList />

        {/* 6. Конверсия */}
        <LeadForm />

      </div>
    </div>
  );
}
