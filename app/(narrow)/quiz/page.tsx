import Hero from '@/app/components/ui/Hero';
import QuizForm from '@/app/components/forms/QuizForm';

type Props = {
  searchParams?: {
    source?: string;
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

    default:
      return {
        title: 'Получить предварительное предложение',
        description:
          'Квиз помогает собрать исходные параметры для предварительной оценки парковочной системы.',
      };
  }
}

export const metadata = {
  title: 'Расчёт проекта | РОСПАРК',
  description:
    'Ответьте на несколько вопросов — мы подготовим предварительную оценку конфигурации, бюджета и сценария работы парковки.',
};

export default function QuizPage({ searchParams }: Props) {
  const content = resolveContent(searchParams?.source);

  return (
    <div className="mx-auto max-w-[980px] px-4 sm:px-6 min-w-0 overflow-hidden [&_h1]:break-words [&_h1]:hyphens-auto [&_h1]:text-[clamp(2rem,11vw,3.5rem)]">
      <Hero title={content.title} description={content.description} />
      <QuizForm />
    </div>
  );
}
