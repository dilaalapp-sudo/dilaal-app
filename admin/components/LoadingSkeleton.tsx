import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  height?: number | string;
  width?: number | string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  height = 16,
  width = '100%',
}) => (
  <div
    className={`animate-shimmer rounded bg-surface-container-high ${className}`}
    style={{ height, width }}
  />
);

interface LoadingSkeletonTextProps {
  className?: string;
  lines?: number;
  lineHeight?: number;
}

export const LoadingSkeletonText: React.FC<LoadingSkeletonTextProps> = ({
  className = '',
  lines = 3,
  lineHeight = 1.5,
}) => (
  <div className={className}>
    {Array.from({ length: lines }).map((_, i) => (
      <LoadingSkeleton
        key={i}
        height={lineHeight * 16}
        width={i === lines - 1 ? '60%' : '100%'}
      />
    ))}
  </div>
);