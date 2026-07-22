import { CheckCircle2, Clock3, XCircle } from 'lucide-react';

type DemoStatusBadgeProps = {
  status: 'active' | 'discounted' | 'completed';
};

const styles = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  discounted: 'border-blue-200 bg-blue-50 text-blue-800',
  completed: 'border-slate-200 bg-slate-100 text-slate-600',
};

const labels = {
  active: 'На территории',
  discounted: 'Оплачено арендатором',
  completed: 'Сессия завершена',
};

export default function DemoStatusBadge({ status }: DemoStatusBadgeProps) {
  const Icon = status === 'discounted' ? CheckCircle2 : status === 'completed' ? XCircle : Clock3;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      <Icon aria-hidden="true" size={14} />
      {labels[status]}
    </span>
  );
}
