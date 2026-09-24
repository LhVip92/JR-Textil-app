import type { ReactNode } from 'react';
import clsx from 'clsx';

interface MetricCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon?: ReactNode;
  tone?: 'default' | 'positive' | 'warning' | 'danger';
  loading?: boolean;
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  loading = false
}: MetricCardProps) {
  const toneStyles: Record<NonNullable<MetricCardProps['tone']>, string> = {
    default: 'text-brand-black',
    positive: 'text-green-600',
    warning: 'text-orange-600',
    danger: 'text-brand-red'
  };

  return (
    <div className="bg-white rounded-xl border border-black/5 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-black/50 truncate">
            {label}
          </p>
          {loading ? (
            <div className="h-8 w-20 bg-neutral-200 rounded animate-pulse mt-2" />
          ) : (
            <p className={clsx('text-2xl font-bold mt-1', toneStyles[tone])}>
              {value}
            </p>
          )}
          {hint && (
            <p className="text-[11px] text-black/50 mt-1">{hint}</p>
          )}
        </div>
        {icon && (
          <div className="text-brand-black/30 flex-shrink-0">{icon}</div>
        )}
      </div>
    </div>
  );
}