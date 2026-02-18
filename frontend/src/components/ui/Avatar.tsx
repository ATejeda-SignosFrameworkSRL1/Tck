import React from 'react';
import { clsx } from 'clsx';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getColorFromName = (name: string): string => {
  const colors = [
    'bg-red-600',
    'bg-orange-600',
    'bg-amber-600',
    'bg-yellow-600',
    'bg-lime-600',
    'bg-green-600',
    'bg-emerald-600',
    'bg-teal-600',
    'bg-cyan-600',
    'bg-sky-600',
    'bg-blue-600',
    'bg-indigo-600',
    'bg-violet-600',
    'bg-purple-600',
    'bg-fuchsia-600',
    'bg-pink-600',
    'bg-rose-600',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className,
}) => {
  const sizes = {
    xs: 'w-6 h-6 text-xxs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx(
          'rounded-full object-cover ring-2 ring-dark-border',
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-dark-border',
        sizes[size],
        getColorFromName(name),
        className
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

// Avatar Group
export interface AvatarGroupProps {
  users: { name: string; src?: string }[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  users,
  max = 3,
  size = 'sm',
}) => {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  const overlapStyles = {
    xs: '-ml-2',
    sm: '-ml-2.5',
    md: '-ml-3',
  };

  return (
    <div className="flex items-center">
      {visibleUsers.map((user, index) => (
        <div
          key={index}
          className={clsx(index > 0 && overlapStyles[size])}
          style={{ zIndex: visibleUsers.length - index }}
        >
          <Avatar src={user.src} name={user.name} size={size} />
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={clsx(
            'flex items-center justify-center rounded-full bg-dark-hover text-zinc-400 font-medium ring-2 ring-dark-border',
            overlapStyles[size],
            size === 'xs' && 'w-6 h-6 text-xxs',
            size === 'sm' && 'w-8 h-8 text-xs',
            size === 'md' && 'w-10 h-10 text-sm'
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default Avatar;
