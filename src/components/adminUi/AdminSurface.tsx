'use client';

import React from 'react';

import './AdminSurface.scss';

type SurfaceProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> & {
  children: React.ReactNode;
};

type AdminPanelProps = SurfaceProps & {
  density?: 'compact' | 'default';
};

export function AdminPanel({
  children,
  className,
  density = 'default',
  ...props
}: AdminPanelProps) {
  return (
    <div
      {...props}
      className={['admin-panel', className].filter(Boolean).join(' ')}
      data-density={density}
    >
      {children}
    </div>
  );
}

type AdminNoticeProps = Omit<SurfaceProps, 'role'> & {
  density?: 'compact' | 'default';
  variant: 'error' | 'hint';
};

export function AdminNotice({
  children,
  className,
  density = 'default',
  variant,
  ...props
}: AdminNoticeProps) {
  return (
    <div
      {...props}
      className={['admin-notice', `admin-notice--${variant}`, className].filter(Boolean).join(' ')}
      data-density={density}
      role={variant === 'error' ? 'alert' : undefined}
    >
      {children}
    </div>
  );
}
