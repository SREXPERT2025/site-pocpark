import type { Metadata } from 'next';
import Hero from '@/app/components/ui/Hero';
import QuizForm from '@/app/components/forms/QuizForm';
import { canonicalUrl } from '@/app/config/site-url';

type Props = {
  searchParams?: {
    source?: string;
    intent?: string;
    product?: string;
    package?: string;
    packageName?: string;
  };
};

function resolveContent(source?: string) {
  switch (source) {
    case 'economy':
      return {
        title: 'Рассчитать параметры проекта',
        description:
          'Ответьте на несколько вопросов — мы оценим параметры, бюджет и модель работы парковки для вашего объекта.',
      };

    case 'kp':
      return {
        title: 'Получить предварительное предложение',
        description:
          'Оставьте контакты и тип объекта — мы уточним параметры и подготовим предварительное предложение.',
      };

    case 'request':
      return {
        title: 'Рассчитать проект парковки',
        description:
          'Ответьте на вопросы — мы рассчитаем конфигурацию и бюджет внедрения.',
      };

    case 'consult':
      return {
        title: 'Получить консультацию',
        description:
          'Оставьте контакты — специалист свяжется с вами для консультации по управлению парковкой.',
      };

    case 'project':
      return {
        title: 'Рассчитать проект парковки',
        description:
          'Мы подготовим проектное решение и предварительную смету для вашего объекта.',
      };

    case 'price':
      return {
        title: 'Рассчитать стоимость проекта',
        description:
          'Ответьте на несколько вопросов — мы подготовим предварительную оценку стоимости.',
      };

    case 'lead':
      return {
        title: 'Оставить заявку',
        description:
          'Оставьте контакты — мы свяжемся с вами для уточнения деталей.',
      };

    case 'articles':
      return {
        title: 'Обсудить задачу по парковке',
        description:
          'Оставьте контакты и тип объекта — мы подскажем, какие сценарии доступа, оплаты и контроля стоит заложить в проект.',
      };

    case 'article-kak-vybrat-sistemu-avtomatizacii-parkovki':
    case 'article-system-choice':
      return {
        title: 'Подобрать парковочную систему под объект',
        description:
          'Оставьте контакты и тип объекта — мы поможем определить сценарии, состав оборудования и следующий шаг по проекту.',
      };

    case 'article-avtomatizaciya-parkovki-torgovogo-centra':
      return {
        title: 'Обсудить парковку торгового центра',
        description:
          'Оставьте контакты — разберём поток посетителей, оплату, бесплатное время, льготы и контроль выезда для вашего торгового центра.',
      };

    case 'article-parkovka-biznes-centra-arendatory-gosti-limity':
    case 'article-bc-parking':
      return {
        title: 'Настроить парковку бизнес-центра',
        description:
          'Оставьте контакты — обсудим арендаторов, гостей, лимиты мест, роли охраны и отчётность для управляющей компании.',
      };

    case 'article-iz-chego-sostoit-parkovochnaya-sistema':
      return {
        title: 'Подобрать состав парковочной системы',
        description:
          'Оставьте контакты — подскажем, какие стойки, шлагбаумы, терминалы, оплату и программные сценарии стоит рассмотреть.',
      };

    case 'article-ispravlenie-oshibok-oplaty-parkovki':
    case 'article-payment-errors':
      return {
        title: 'Разобрать сценарий оплаты и ошибок',
        description:
          'Оставьте контакты — обсудим оплату, корректировки, журнал событий и действия оператора в спорных ситуациях.',
      };

    default:
      return {
        title: 'Получить предварительное предложение',
        description:
          'Квиз помогает собрать исходные параметры для предварительной оценки парковочной системы.',
      };
  }
}

export const metadata: Metadata = {
  title: 'Расчёт проекта | РОСПАРК',
  description:
    'Ответьте на несколько вопросов — мы подготовим предварительную оценку конфигурации, бюджета и сценария работы парковки.',
  alternates: {
    canonical: canonicalUrl('/quiz'),
  },
};

export default function QuizPage({ searchParams }: Props) {
  const content = resolveContent(searchParams?.source);
  const query = new URLSearchParams();
  if (searchParams?.source) query.set('source', searchParams.source);
  if (searchParams?.intent) query.set('intent', searchParams.intent);
  if (searchParams?.product) query.set('product', searchParams.product);
  if (searchParams?.package) query.set('package', searchParams.package);
  if (searchParams?.packageName) query.set('packageName', searchParams.packageName);
  const queryString = query.toString();
  const sourceUrl = `/quiz${queryString ? `?${queryString}` : ''}`;

  return (
    <div className="mx-auto max-w-[980px] px-4 sm:px-6 min-w-0 overflow-hidden [&_h1]:break-words [&_h1]:hyphens-auto [&_h1]:text-[clamp(2rem,11vw,3.5rem)]">
      <Hero title={content.title} description={content.description} />
      <QuizForm
        source={searchParams?.source}
        intent={searchParams?.intent || searchParams?.source}
        product={searchParams?.product}
        packageName={searchParams?.packageName || searchParams?.package}
        sourceUrl={sourceUrl}
      />
    </div>
  );
}
