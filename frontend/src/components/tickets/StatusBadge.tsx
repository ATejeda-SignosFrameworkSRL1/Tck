import React from 'react';

interface StatusBadgeProps {
  status: 'open' | 'in_progress' | 'blocked' | 'in_review' | 'done';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'open':
        return { label: 'Abierto', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
      case 'in_progress':
        return { label: 'En Progreso', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
      case 'blocked':
        return { label: 'Bloqueado', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
      case 'in_review':
        return { label: 'En Revisión', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' };
      case 'done':
        return { label: 'Completado', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
      default:
        return { label: status, className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
