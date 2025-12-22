import LeadForm from './LeadForm';

type LeadFormSectionProps = {
  title?: string;
  description?: string;
  sourceSection?: string;
  sourcePage?: string;
  submitLabel?: string;
  className?: string;
  compact?: boolean;
};

export default function LeadFormSection({
  title = 'Получить коммерческое предложение',
  description = 'Оставьте контакты — мы уточним задачу и пришлём расчёт/КП. Обычно отвечаем в течение рабочего дня.',
  sourceSection,
  sourcePage,
  submitLabel,
  className,
  compact = false,
}: LeadFormSectionProps) {
  return (
    <section className={className ?? 'py-16'}>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 md:p-10 shadow-sm">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h2>
            <p className="mt-3 text-slate-700">{description}</p>
          </div>

          <div className="mt-8">
            <LeadForm
              sourceSection={sourceSection}
              sourcePage={sourcePage}
              submitLabel={submitLabel}
              compact={compact}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
