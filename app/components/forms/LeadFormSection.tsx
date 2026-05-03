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
    <section className={`overflow-hidden bg-[#F7F8FA] py-14 sm:py-20 md:py-24 ${className ?? ""}`}>
      <div className="mx-auto w-full max-w-[980px] px-4 sm:px-6">

        {/* Заголовок */}
        <div className="text-center">
          <h2 className="break-words text-[30px] font-extrabold leading-[1.15] tracking-tight text-slate-900 md:text-4xl">
            {title}
          </h2>

          <p className="mt-5 break-words text-base leading-relaxed text-slate-600 sm:text-lg">
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
        <div className="mt-10 w-full max-w-full overflow-hidden rounded-3xl bg-white p-4 shadow-[0_25px_60px_rgba(15,23,42,0.08)] sm:p-6 md:p-12">
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
