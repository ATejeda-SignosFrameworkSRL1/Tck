import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
}) => {
  const variants = {
    primary: 'bg-primary/20 text-primary dark:text-primary-light',
    success: 'bg-accent-success/20 text-accent-success',
    warning: 'bg-accent-warning/20 text-accent-warning',
    danger: 'bg-accent-danger/20 text-accent-danger',
    info: 'bg-accent-info/20 text-accent-info',
    neutral: 'bg-zinc-200 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-400',
  };

  const dotColors = {
    primary: 'bg-primary',
    success: 'bg-accent-success',
    warning: 'bg-accent-warning',
    danger: 'bg-accent-danger',
    info: 'bg-accent-info',
    neutral: 'bg-zinc-500',
  };

  const sizes = {
    sm: 'px-1.5 py-0.5 text-xxs',
    md: 'px-2 py-0.5 text-xs',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  );
};

// Status Badge for tickets
export interface StatusBadgeProps {
  status: 'open' | 'in_progress' | 'blocked' | 'in_review' | 'done';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const statusConfig: Record<string, { label: string; variant: 'info' | 'warning' | 'danger' | 'success' | 'neutral' }> = {
    open: { label: 'Abierto', variant: 'info' },
    in_progress: { label: 'En Progreso', variant: 'warning' },
    blocked: { label: 'Bloqueado', variant: 'danger' },
    in_review: { label: 'En Revisión', variant: 'neutral' },
    done: { label: 'Completado', variant: 'success' },
  };

  const config = statusConfig[status] || { label: status, variant: 'neutral' };

  return (
    <Badge variant={config.variant} size={size} dot>
      {config.label}
    </Badge>
  );
};

// Priority Badge for tickets
export interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const priorityConfig: Record<string, { label: string; variant: 'neutral' | 'warning' | 'danger' }> = {
    low: { label: 'Baja', variant: 'neutral' },
    medium: { label: 'Media', variant: 'warning' },
    high: { label: 'Alta', variant: 'danger' },
  };

  const config = priorityConfig[priority] || { label: priority, variant: 'neutral' };

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
};

// Role Badge for users
export interface RoleBadgeProps {
  role: 'admin' | 'dev' | 'user';
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'md' }) => {
  const roleConfig: Record<string, { label: string; variant: 'primary' | 'info' | 'neutral' }> = {
    admin: { label: 'Administrador', variant: 'primary' },
    dev: { label: 'Desarrollador', variant: 'info' },
    user: { label: 'Usuario', variant: 'neutral' },
  };

  const config = roleConfig[role] || { label: role, variant: 'neutral' };

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
};

export default Badge;
