import LeadForm from "./LeadForm";

export type LeadFormSectionProps = {
  title?: string;
  description?: string;
  submitLabel?: string;
  /**
   * Откуда пришла заявка (логика/блок): hero / lead_bottom / contacts и т.п.
   */
  sourceSection?: string;
  /**
   * Страница-источник (например: /resheniya/biznes-centry)
   */
  sourcePage?: string;
  /** Минимальный набор полей (без компании и типа объекта) */
  minimalFields?: boolean;
  /** Компактный режим формы */
  compact?: boolean;
  className?: string;
};

export default function LeadFormSection(props: LeadFormSectionProps) {
  const {
    title = "Получить КП",
    description = "Оставьте контакты — мы уточним задачу и предложим оптимальное решение.",
    submitLabel = "Получить КП",
    sourceSection,
    sourcePage,
    minimalFields = false,
    compact = false,
    className,
  } = props;

  return (
    <section className={className}>
      <div className="mx-auto max-w-[920px]">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{title}</h2>
          <p className="mt-4 text-base text-slate-600 md:text-lg">{description}</p>
        </div>

        <div className="mt-10">
          <LeadForm
            sourceSection={sourceSection}
            sourcePage={sourcePage}
            submitLabel={submitLabel}
            minimalFields={minimalFields}
            compact={compact}
          />
        </div>
      </div>
    </section>
  );
}
