import React from 'react';

type StatusVariant =
  | 'published'
  | 'under_review'
  | 'flagged'
  | 'removed'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'suspended'
  | 'verified'
  | 'unverified'
  | 'resolved'
  | 'dismissed';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

// Semantic status mapping. CSS custom properties resolve to different
// colors in light vs dark mode, so no dark: prefixes are needed here.
const VARIANT_CLASSES: Record<StatusVariant, string> = {
  published: 'bg-success/12 text-success ring-1 ring-success/20',
  under_review: 'bg-pending/12 text-pending ring-1 ring-pending/20',
  flagged: 'bg-error/12 text-error ring-1 ring-error/20',
  removed: 'bg-error/12 text-error ring-1 ring-error/20',
  pending: 'bg-pending/12 text-pending ring-1 ring-pending/20',
  approved: 'bg-success/12 text-success ring-1 ring-success/20',
  rejected: 'bg-error/12 text-error ring-1 ring-error/20',
  active: 'bg-success/12 text-success ring-1 ring-success/20',
  suspended: 'bg-error/12 text-error ring-1 ring-error/20',
  verified: 'bg-success/12 text-success ring-1 ring-success/20',
  unverified: 'bg-surface-container-high text-on-surface-variant ring-1 ring-outline-variant/30',
  resolved: 'bg-success/12 text-success ring-1 ring-success/20',
  dismissed: 'bg-surface-container-high text-on-surface-variant ring-1 ring-outline-variant/30',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  className = '',
}) => {
  const v = variant || (status as StatusVariant) || 'pending';
  const badgeClass = VARIANT_CLASSES[v] || VARIANT_CLASSES.pending;
  const label = status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${badgeClass} ${className}`}
      role="status"
    >
      {label}
    </span>
  );
};