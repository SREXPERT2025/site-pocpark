import type { ReactNode } from 'react';
import { Maximize2 } from 'lucide-react';

type DemoBrowserFrameProps = {
  previewLabel: string;
  address: string;
  children: ReactNode;
};

export default function DemoBrowserFrame({ previewLabel, address, children }: DemoBrowserFrameProps) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden="true" />
        {previewLabel}
      </div>
      <div className="overflow-hidden rounded-[28px] border-2 border-blue-200 bg-slate-100 shadow-[0_30px_90px_rgba(15,23,42,0.18)] ring-4 ring-blue-50">
        <div className="flex items-center gap-2 border-b border-blue-100 bg-white px-3 py-3 sm:px-4">
          <span className="h-3 w-3 shrink-0 rounded-full bg-rose-400" aria-hidden="true" />
          <span className="h-3 w-3 shrink-0 rounded-full bg-amber-400" aria-hidden="true" />
          <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
          <div className="ml-1 min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-center text-[11px] font-semibold text-slate-700 sm:ml-2 sm:px-3 sm:text-xs">
            {address}
          </div>
          <Maximize2 aria-hidden="true" size={16} className="shrink-0 text-slate-400" />
        </div>
        {children}
      </div>
    </div>
  );
}
