import Hero from '@/app/components/ui/Hero';
import QuizForm from '@/app/components/forms/QuizForm';

export const metadata = {
  title: 'Квиз / Получить КП',
  description: 'Ответьте на несколько вопросов — мы подготовим коммерческое предложение.',
};

export default function QuizPage() {
  return (
    <div>
      <Hero
        title="Получить коммерческое предложение"
        description="Оставьте контакты и тип объекта — мы вернёмся с расчётом стоимости и сроков."
      />
      <QuizForm />
    </div>
  );
}
