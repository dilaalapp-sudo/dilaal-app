import React from 'react';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: string;
  trendPositive?: boolean;
  /** Makes the card clickable (e.g. navigate to the related screen). */
  onClick?: () => void;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendPositive = true,
  onClick,
}) => {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-outline font-semibold uppercase tracking-wide leading-tight mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold text-on-surface">{value}</span>
            {subtitle && <span className="text-[10px] sm:text-xs text-outline">{subtitle}</span>}
          </div>
        </div>
        <div className="hidden sm:flex w-9 h-9 rounded-xl bg-primary/10 items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      {trend && (
        <p className={`mt-2 text-[10px] font-semibold ${trendPositive ? 'text-success' : 'text-error'}`}>
          {trendPositive ? '↑ ' : '↓ '}
          {trend}
        </p>
      )}
    </>
  );

  const shell = 'w-full text-left bg-surface-container rounded-2xl border border-outline-variant/25 p-3.5 sm:p-5';

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`${shell} hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer`}
      >
        {body}
      </button>
    );
  }
  return <div className={shell}>{body}</div>;
};
