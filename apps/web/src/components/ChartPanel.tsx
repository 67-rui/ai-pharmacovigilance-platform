import type { ReactNode } from "react";

type ChartPanelProps = {
  title: string;
  eyebrow?: string;
  children: ReactNode;
};

export function ChartPanel({ title, eyebrow, children }: ChartPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex min-h-10 items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {eyebrow}
            </div>
          ) : null}
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        </div>
      </div>
      <div className="h-72">{children}</div>
    </section>
  );
}
