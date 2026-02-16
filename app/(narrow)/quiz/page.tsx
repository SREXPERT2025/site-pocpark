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
        title: 'Рассчитать экономику объекта',
        description:
          'Ответьте на несколько вопросов — мы рассчитаем доходность и модель работы парковки для вашего объекта.',
      };

    case 'kp':
      return {
        title: 'Получить коммерческое предложение',
        description:
          'Оставьте контакты и тип объекта — мы подготовим коммерческое предложение с расчётом стоимости и сроков.',
      };

    case 'request':
      return {
        title: 'Запросить расчёт проекта',
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
        title: 'Рассчитать стоимость внедрения',
        description:
          'Ответьте на несколько вопросов — мы подготовим предварительный расчёт стоимости.',
      };

    case 'lead':
      return {
        title: 'Оставить заявку',
        description:
          'Оставьте контакты — мы свяжемся с вами для уточнения деталей.',
      };

    default:
      return {
        title: 'Получить коммерческое предложение',
        description:
          'Ответьте на несколько вопросов — мы подготовим расчёт стоимости и модель внедрения.',
      };
  }
}

export const metadata = {
  title: 'Расчёт проекта | РОСПАРК',
  description:
    'Ответьте на несколько вопросов — мы подготовим расчёт стоимости и экономической модели парковки.',
};

export default function QuizPage({ searchParams }: Props) {
  const content = resolveContent(searchParams?.source);

  return (
    <div className="mx-auto max-w-[980px] px-4 sm:px-6">
      <Hero title={content.title} description={content.description} />
      <QuizForm />
    </div>
  );
}
