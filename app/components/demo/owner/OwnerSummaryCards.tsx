import type { LucideIcon } from 'lucide-react';
import { BadgePercent, CarFront, CheckCircle2, ClipboardList, Clock3, Users } from 'lucide-react';
import { formatOwnerDuration, formatOwnerInteger } from './owner-formatters';
import type { OwnerSummary } from './owner-types';

function KpiCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-5 text-slate-600">{label}</p>
        <span className="shrink-0 rounded-xl bg-slate-100 p-2 text-slate-600"><Icon aria-hidden="true" size={18} /></span>
      </div>
      <p className="mt-3 text-[2rem] font-bold leading-none tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

export default function OwnerSummaryCards({ summary }: { summary: OwnerSummary }) {
  return (
    <section aria-labelledby="owner-summary-title">
      <h3 id="owner-summary-title" className="sr-only">Сводные показатели парковки</h3>
      <div className="grid gap-3 min-[380px]:grid-cols-2 xl:grid-cols-3">
        <KpiCard icon={Users} label="Арендаторы" value={formatOwnerInteger(summary.tenantCount)} />
        <KpiCard icon={ClipboardList} label="Гостевые заявки" value={formatOwnerInteger(summary.guestRequestCount)} />
        <KpiCard icon={CarFront} label="Гостевые проезды" value={formatOwnerInteger(summary.guestPassageCount)} />
        <KpiCard icon={BadgePercent} label="Парковки оплачены арендаторами" value={formatOwnerInteger(summary.webDiscountCount)} />
        <KpiCard icon={Clock3} label="Среднее время стоянки" value={formatOwnerDuration(summary.averageDurationMinutes)} />
        <KpiCard icon={CheckCircle2} label="Завершённые операции" value={formatOwnerInteger(summary.completedOperationCount)} />
      </div>
    </section>
  );
}
