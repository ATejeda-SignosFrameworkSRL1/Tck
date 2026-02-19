import React from 'react';
import { clsx } from 'clsx';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  className,
}) => {
  const baseStyles = 'flex items-center';

  const variantStyles = {
    default: 'border-b border-light-border dark:border-dark-border',
    pills: 'gap-2 p-1 bg-light-hover dark:bg-dark-surface rounded-lg',
    underline: 'border-b border-light-border dark:border-dark-border',
  };

  const tabBaseStyles = 'flex items-center gap-2 font-medium transition-all duration-200 cursor-pointer';

  const tabVariantStyles = {
    default: {
      base: 'px-4 py-2 text-sm border-b-2 -mb-px',
      active: 'text-zinc-900 dark:text-white border-primary',
      inactive: 'text-zinc-500 dark:text-zinc-400 border-transparent hover:text-zinc-900 dark:hover:text-white hover:border-light-hover dark:hover:border-dark-hover',
    },
    pills: {
      base: 'px-4 py-2 text-sm rounded-md',
      active: 'bg-primary text-white',
      inactive: 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-light-hover dark:hover:bg-dark-hover',
    },
    underline: {
      base: 'px-4 py-2 text-sm border-b-2 -mb-px',
      active: 'text-primary border-primary',
      inactive: 'text-zinc-500 dark:text-zinc-400 border-transparent hover:text-zinc-900 dark:hover:text-white',
    },
  };

  return (
    <div className={clsx(baseStyles, variantStyles[variant], className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && onChange(tab.id)}
          disabled={tab.disabled}
          className={clsx(
            tabBaseStyles,
            tabVariantStyles[variant].base,
            tab.id === activeTab
              ? tabVariantStyles[variant].active
              : tabVariantStyles[variant].inactive,
            tab.disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.badge !== undefined && (
            <span
              className={clsx(
                'px-1.5 py-0.5 text-xs font-medium rounded-full',
                tab.id === activeTab
                  ? 'bg-white/20 text-white'
                  : 'bg-light-hover dark:bg-dark-hover text-zinc-500 dark:text-zinc-400'
              )}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

// Tab Panel
export interface TabPanelProps {
  children: React.ReactNode;
  tabId: string;
  activeTab: string;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  tabId,
  activeTab,
  className,
}) => {
  if (tabId !== activeTab) return null;

  return (
    <div className={clsx('animate-fade-in', className)}>
      {children}
    </div>
  );
};

export default Tabs;
