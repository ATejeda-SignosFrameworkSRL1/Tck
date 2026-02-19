import React from 'react';
import { clsx } from 'clsx';
import { Inbox, Search, FileText, Users, FolderOpen, AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: 'inbox' | 'search' | 'file' | 'users' | 'folder' | 'error' | React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const iconMap = {
  inbox: Inbox,
  search: Search,
  file: FileText,
  users: Users,
  folder: FolderOpen,
  error: AlertCircle,
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  action,
  className,
}) => {
  const IconComponent = typeof icon === 'string' ? iconMap[icon as keyof typeof iconMap] : null;

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-light-hover dark:bg-dark-surface mb-4">
        {IconComponent ? (
          <IconComponent className="w-8 h-8 text-zinc-500" />
        ) : (
          icon
        )}
      </div>
      <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-zinc-500 max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;

