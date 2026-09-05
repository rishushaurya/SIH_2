import React from 'react';

interface SkeletonProps {
  height?: string;
  width?: string;
  count?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  height = '24px',
  width = '100%',
  count = 1,
  className = '',
  style = {},
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`skeleton-shimmer ${className}`}
          style={{
            height,
            width,
            borderRadius: 'var(--radius-sm)',
            ...style,
          }}
        />
      ))}
    </div>
  );
};
