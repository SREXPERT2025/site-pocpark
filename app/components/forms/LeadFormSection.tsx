import LeadForm from "./LeadForm";

export type LeadFormSectionProps = {
  title?: string;
  description?: string;
  submitLabel?: string;
  sourceSection?: string;
  sourcePage?: string;
  minimalFields?: boolean;
  compact?: boolean;
  className?: string;
};

export default function LeadFormSection(props: LeadFormSectionProps) {
  const {
    title = "Рассчитать конфигурацию под ваш объект",
    description = "Подготовим оптимальный формат внедрения и предварительную финансовую модель проекта.",
    submitLabel = "Получить расчёт конфигурации",
    sourceSection,
    sourcePage,
    minimalFields = false,
    compact = false,
    className,
  } = props;

  return (
    <section className={`bg-[#F7F8FA] py-24 ${className ?? ""}`}>
      <div className="mx-auto max-w-[980px] px-6">

        {/* Заголовок */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            {title}
          </h2>

          <p className="mt-5 text-lg text-slate-600">
            {description}
          </p>

          {/* Доверительные маркеры */}
          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-slate-600 md:flex-row md:justify-center md:gap-8">
            <span>⏱ Ответ в течение 1 рабочего дня</span>
            <span>🔍 Предварительный аудит объекта — бесплатно</span>
            <span>📊 Подбор конфигурации под бюджет и трафик</span>
          </div>
        </div>

        {/* Форма */}
        <div className="mt-12 rounded-3xl bg-white p-8 shadow-[0_25px_60px_rgba(15,23,42,0.08)] md:p-12">
          <LeadForm
            sourceSection={sourceSection}
            sourcePage={sourcePage}
            submitLabel={submitLabel}
            minimalFields={minimalFields}
            compact={compact}
          />

          {/* Микро-пояснение по данным */}
          <p className="mt-6 text-center text-xs text-slate-500">
            Данные используются только для подготовки расчёта и связи по проекту.
          </p>
        </div>

        {/* Социальное доказательство */}
        <div className="mt-10 text-center text-sm text-slate-600">
          Более 350 реализованных объектов — работаем с ТЦ, БЦ и жилыми комплексами.
        </div>
      </div>
    </section>
  );
}
