import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  variant = 'default',
  className,
}) => {
  const iconBgVariants = {
    default: 'bg-light-hover dark:bg-dark-hover text-zinc-500 dark:text-zinc-400',
    primary: 'bg-primary/20 text-primary-light',
    success: 'bg-accent-success/20 text-accent-success',
    warning: 'bg-accent-warning/20 text-accent-warning',
    danger: 'bg-accent-danger/20 text-accent-danger',
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-4 h-4" />;
    if (trend.value < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.value > 0) return 'text-accent-success';
    if (trend.value < 0) return 'text-accent-danger';
    return 'text-zinc-500';
  };

  return (
    <div
      className={clsx(
        'bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-4',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-zinc-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
          {trend && (
            <div className={clsx('flex items-center gap-1 mt-2 text-sm', getTrendColor())}>
              {getTrendIcon()}
              <span className="font-medium">{Math.abs(trend.value)}%</span>
              {trend.label && (
                <span className="text-zinc-500">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={clsx(
              'flex items-center justify-center w-10 h-10 rounded-lg',
              iconBgVariants[variant]
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

// Stat Grid for multiple stats
export interface StatGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export const StatGrid: React.FC<StatGridProps> = ({ children, columns = 4 }) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={clsx('grid gap-4', gridCols[columns])}>
      {children}
    </div>
  );
};

export default StatCard;
