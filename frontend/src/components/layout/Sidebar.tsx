import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Ticket,
  FolderKanban,
  Building2,
  Users,
  Shield,
  Settings,
  ChevronRight,
  Wrench,
  Activity,
  Package,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: NavItem[];
  adminOnly?: boolean;
  accentColor?: string;
}

/* ═══════════════════ SIPE ACCENT COLORS (Bitrix24-style) ═══════════════════ */
const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    path: '/dashboard',
  },
  {
    id: 'divider-0',
    label: '',
    icon: null,
  },
  {
    id: 'sipe',
    label: 'Centro de Proyecto',
    icon: <Activity className="w-5 h-5" />,
    path: '/matrix',
    accentColor: '#6366f1',
  },
  {
    id: 'deliverables',
    label: 'Proyectos Entregables',
    icon: <Package className="w-5 h-5" />,
    path: '/deliverables',
    accentColor: '#10b981',
  },
  {
    id: 'divider-2',
    label: '',
    icon: null,
  },
  {
    id: 'maintenance',
    label: 'Mantenimiento',
    icon: <Wrench className="w-5 h-5" />,
    adminOnly: true,
    children: [
      {
        id: 'projects',
        label: 'Proyectos',
        icon: <FolderKanban className="w-4 h-4" />,
        path: '/maintenance/projects',
      },
      {
        id: 'departments',
        label: 'Departamentos',
        icon: <Building2 className="w-4 h-4" />,
        path: '/maintenance/departments',
      },
      {
        id: 'users',
        label: 'Usuarios',
        icon: <Users className="w-4 h-4" />,
        path: '/maintenance/users',
      },
      {
        id: 'roles',
        label: 'Roles',
        icon: <Shield className="w-4 h-4" />,
        path: '/maintenance/roles',
      },
    ],
  },
  {
    id: 'divider-3',
    label: '',
    icon: null,
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: <Settings className="w-5 h-5" />,
    path: '/settings',
  },
];

export const Sidebar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>(['maintenance']);
  const location = useLocation();
  const { user } = useAuth();

  const toggleMenu = (id: string) => {
    setOpenMenus((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    // Skip admin-only items for non-admin users
    if (item.adminOnly && user?.role !== 'admin') {
      return null;
    }

    // Divider
    if (item.id.startsWith('divider')) {
      return (
        <div
          key={item.id}
          className={clsx(
            'my-2 border-t border-light-border dark:border-sidebar-border',
            !isExpanded && 'mx-3'
          )}
        />
      );
    }

    // Item with children (submenu)
    if (item.children) {
      const isOpen = openMenus.includes(item.id);
      const hasActiveChild = item.children.some((child) => child.path && isActive(child.path));
      const isSipe = item.id === 'sipe';

      return (
        <div key={item.id}>
          <button
            onClick={() => toggleMenu(item.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
              'hover:bg-light-hover dark:hover:bg-sidebar-hover hover:text-zinc-900 dark:hover:text-white',
              hasActiveChild && 'text-zinc-900 dark:text-white bg-light-hover dark:bg-sidebar-active',
              !hasActiveChild && 'text-zinc-600 dark:text-zinc-400',
              !isExpanded && 'justify-center'
            )}
          >
            {/* Bitrix24: colored icon background for SIPE */}
            {isSipe && item.accentColor ? (
              <div className="p-1 rounded-md" style={{ backgroundColor: `${item.accentColor}14` }}>
                <Activity className="w-4 h-4" style={{ color: item.accentColor }} />
              </div>
            ) : (
              item.icon
            )}
            {isExpanded && (
              <>
                <span className="flex-1 text-left text-sm font-medium">
                  {item.label}
                </span>
                {isSipe && (
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary mr-1">
                    v2
                  </span>
                )}
                <ChevronRight
                  className={clsx(
                    'w-4 h-4 transition-transform',
                    isOpen && 'rotate-90'
                  )}
                />
              </>
            )}
          </button>

          {isExpanded && isOpen && (
            <div className="mt-1 ml-4 space-y-0.5">
              {item.children.map((child) => renderNavItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    // Regular nav item / child item
    if (!item.path) return null;

    const active = isActive(item.path);

    const isSipeItem = item.id === 'sipe';
    const isAccentedItem = item.id === 'sipe' || item.id === 'deliverables';

    return (
      <NavLink
        key={item.id}
        to={item.path}
        className={clsx(
          'flex items-center gap-3 px-3 rounded-lg transition-all duration-200 relative',
          active
            ? 'bg-light-hover dark:bg-sidebar-active text-zinc-900 dark:text-white'
            : 'text-zinc-600 dark:text-zinc-400 hover:bg-light-hover dark:hover:bg-sidebar-hover hover:text-zinc-900 dark:hover:text-white',
          !isExpanded && 'justify-center',
          isChild ? 'py-2' : 'py-2.5'
        )}
      >
        {/* Colored left indicator for active items with accent */}
        {item.accentColor && active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full" style={{ backgroundColor: item.accentColor }} />
        )}
        {/* SIPE: colored icon background */}
        {isAccentedItem && item.accentColor ? (
          <div className="p-1 rounded-md" style={{ backgroundColor: `${item.accentColor}14` }}>
            {isSipeItem ? <Activity className="w-4 h-4" style={{ color: item.accentColor }} /> : <span style={{ color: item.accentColor }}>{item.icon}</span>}
          </div>
        ) : item.accentColor ? (
          <span style={{ color: active ? item.accentColor : undefined }}>
            {item.icon}
          </span>
        ) : (
          item.icon
        )}
        {isExpanded && (
          <span className={clsx('text-sm font-medium', isChild && 'text-xs')}>
            {item.label}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-white dark:bg-sidebar-bg border-r border-light-border dark:border-sidebar-border z-40 transition-all duration-300 ease-in-out shadow-sm dark:shadow-none',
        isExpanded ? 'w-64' : 'w-16'
      )}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo */}
      <div
        className={clsx(
          'flex items-center h-16 border-b border-light-border dark:border-sidebar-border px-4 bg-white dark:bg-sidebar-bg',
          !isExpanded && 'justify-center'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_2px_6px_rgba(99,102,241,0.3)]">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          {isExpanded && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                SIPE
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                TicketSystem
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-sidebar-bg">
        {navItems.map((item) => renderNavItem(item))}
      </nav>

      {/* Footer */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-light-border dark:border-sidebar-border bg-white dark:bg-sidebar-bg">
          <p className="text-xxs text-zinc-500 dark:text-zinc-600">
            v2.0.0 Enterprise
          </p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
