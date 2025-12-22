export type FaqItem = {
  question: string;
  answer: string;
};

export default function FaqBlock({
  title = 'FAQ',
  items,
}: {
  title?: string;
  items: FaqItem[];
}) {
  if (!items?.length) return null;

  return (
    <section className="mt-section">
      <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">{title}</h2>
      <div className="mt-6 rounded-md border border-border-primary bg-bg-secondary p-6">
        <div className="divide-y divide-border-primary">
          {items
            .filter((i) => i && i.question?.trim() && i.answer?.trim())
            .map((item, idx) => (
              <details key={`${item.question}-${idx}`} className="py-4">
                <summary className="cursor-pointer text-sm font-semibold text-text-primary">
                  {item.question}
                </summary>
                <div className="mt-3 text-sm text-text-secondary">
                  {item.answer}
                </div>
              </details>
            ))}
        </div>
      </div>
    </section>
  );
}
