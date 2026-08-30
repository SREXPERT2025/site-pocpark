import LandingEntryLink from '@/app/components/landing/LandingEntryLink';

type Props = {
  description: string;
  sourceSection: string;
  target: 'parkovka' | 'puzzle2';
  title: string;
};

export default function LandingEntryBanner({
  description,
  sourceSection,
  target,
  title,
}: Props) {
  const turnkey = target === 'puzzle2';
  return (
    <aside className="mx-auto my-12 max-w-[1088px] px-4 sm:px-6" aria-label="Помощь с выбором парковочной системы">
      <div className="flex flex-col gap-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 shadow-sm sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">
            {turnkey ? 'Не знаете, что выбрать?' : 'От информации к решению'}
          </p>
          <h2 className="mt-2 max-w-full break-words text-[clamp(1.75rem,7vw,2.25rem)] font-bold leading-tight tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-3 leading-7 text-slate-600">{description}</p>
        </div>
        <LandingEntryLink
          href={turnkey ? '/parkovka-pod-klyuch' : '/parkovka'}
          sourceSection={sourceSection}
          targetVariant={target}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-6 py-4 text-center font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          {turnkey ? 'Подобрать парковку под ключ' : 'Организовать парковку'}
        </LandingEntryLink>
      </div>
    </aside>
  );
}
