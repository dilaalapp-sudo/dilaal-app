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
  published: 'bg-success-container text-on-success-container',
  under_review: 'bg-pending-container text-on-pending-container',
  flagged: 'bg-error-container text-on-error-container',
  removed: 'bg-error-container text-on-error-container',
  pending: 'bg-pending-container text-on-pending-container',
  approved: 'bg-success-container text-on-success-container',
  rejected: 'bg-error-container text-on-error-container',
  active: 'bg-success-container text-on-success-container',
  suspended: 'bg-error-container text-on-error-container',
  verified: 'bg-success-container text-on-success-container',
  unverified: 'bg-surface-container text-on-surface-variant',
  resolved: 'bg-success-container text-on-success-container',
  dismissed: 'bg-surface-container text-on-surface-variant',
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
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${badgeClass} ${className}`}
    >
      {label}
    </span>
  );
};