import React from 'react';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: string;
  trendPositive?: boolean;
  /** 0-100 values for a mini sparkline (recent trend) */
  sparkline?: number[];
  /** Makes the card clickable (e.g. navigate to the related screen). */
  onClick?: () => void;
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');
  const color = positive ? 'var(--color-success)' : 'var(--color-error)';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0 opacity-90">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendPositive = true,
  sparkline,
  onClick,
}) => {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-outline font-semibold uppercase tracking-wider leading-tight mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-extrabold text-on-surface tabular-nums tracking-tight">{value}</span>
            {subtitle && <span className="text-[10px] sm:text-xs text-on-surface-variant">{subtitle}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="hidden sm:flex w-10 h-10 rounded-xl bg-primary/10 text-primary items-center justify-center ring-1 ring-primary/10">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{icon}</span>
          </div>
          {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} positive={trendPositive} />}
        </div>
      </div>
      {trend && (
        <p className={`mt-2.5 text-[11px] font-semibold flex items-center gap-1 ${trendPositive ? 'text-success' : 'text-error'}`}>
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{trendPositive ? 'trending_up' : 'trending_down'}</span>
          {trend}
        </p>
      )}
    </>
  );

  const shell =
    'w-full text-left bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-4 sm:p-5 shadow-[var(--shadow-sm)] transition-all duration-200';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${title}: ${value}`}
        className={`${shell} hover:border-primary/30 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface cursor-pointer`}
      >
        {body}
      </button>
    );
  }
  return <div className={shell}>{body}</div>;
};
