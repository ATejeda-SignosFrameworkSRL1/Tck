import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'left',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={clsx('relative', className)}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={clsx(
            'absolute z-50 mt-1 py-1 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-dropdown min-w-[160px] animate-fade-in',
            align === 'left' ? 'left-0' : 'right-0'
          )}
        >
          {items.map((item, index) => {
            if (item.divider) {
              return (
                <div
                  key={index}
                  className="my-1 border-t border-light-border dark:border-dark-border"
                />
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  item.onClick?.();
                  setIsOpen(false);
                }}
                disabled={item.disabled}
                className={clsx(
                  'flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors',
                  item.disabled
                    ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-light-hover dark:hover:bg-dark-hover hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                {item.icon && (
                  <span className="w-4 h-4">{item.icon}</span>
                )}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Simple Button Dropdown
export interface DropdownButtonProps {
  label: string;
  items: DropdownItem[];
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  label,
  items,
  variant = 'secondary',
  size = 'md',
}) => {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    secondary: 'bg-light-card dark:bg-dark-card text-zinc-700 dark:text-zinc-300 border border-light-border dark:border-dark-border hover:bg-light-hover dark:hover:bg-dark-hover',
    ghost: 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-light-hover dark:hover:bg-dark-hover',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  return (
    <Dropdown
      trigger={
        <button
          className={clsx(
            'inline-flex items-center gap-2 rounded-lg font-medium transition-colors',
            variants[variant],
            sizes[size]
          )}
        >
          {label}
          <ChevronDown className="w-4 h-4" />
        </button>
      }
      items={items}
    />
  );
};

export default Dropdown;
