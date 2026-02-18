import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronRight,
  LogOut,
  User,
  Settings,
  Moon,
  Sun,
  FolderKanban,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useProject } from '../../context/ProjectContext';
import { useNotificationStore } from '../../store/notificationStore';
import { usersAPI, ticketsAPI } from '../../services/api';
import { Avatar } from '../ui/Avatar';
import { Dropdown } from '../ui/Dropdown';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/kanban': 'Kanban Board',
  '/tickets': 'Tickets',
  '/tickets/new': 'Nuevo Ticket',
  '/maintenance': 'Mantenimiento',
  '/maintenance/projects': 'Proyectos',
  '/maintenance/departments': 'Departamentos',
  '/maintenance/users': 'Usuarios',
  '/maintenance/roles': 'Roles',
  '/settings': 'Configuración',
};

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { projects, setSelectedProjectId } = useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [userDepartments, setUserDepartments] = useState<{ id: number; name: string }[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchTickets, setSearchTickets] = useState<{ id: number; title: string; project?: { id: number; name: string } }[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  const notifications = useNotificationStore((s) => s.notifications);
  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const { markAsRead, markAllAsRead } = useNotificationStore.getState();

  const query = searchQuery.trim().toLowerCase();
  const matchingProjects = query.length >= 1
    ? projects.filter((p) => p.name.toLowerCase().includes(query))
    : [];
  const showDropdown = searchFocused && (query.length >= 1 || matchingProjects.length > 0 || searchTickets.length > 0);

  useEffect(() => {
    if (!user?.id) {
      setUserDepartments([]);
      return;
    }
    usersAPI
      .getOneWithDepartments(user.id)
      .then((res) => setUserDepartments(res.data?.departments || []))
      .catch(() => setUserDepartments([]));
  }, [user?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchFocused(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(target)) {
        setShowNotificationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Buscar tickets cuando el usuario escribe (mín. 2 caracteres)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchTickets([]);
      return;
    }
    const t = setTimeout(() => {
      setLoadingTickets(true);
      ticketsAPI
        .getAll({ search: q })
        .then((res) => setSearchTickets(res.data || []))
        .catch(() => setSearchTickets([]))
        .finally(() => setLoadingTickets(false));
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const goToKanbanWithSearch = (projectId?: number) => {
    const q = searchQuery.trim();
    if (!q) return;
    if (projectId != null) setSelectedProjectId(projectId);
    const params = new URLSearchParams({ search: q, view: 'list' });
    if (projectId != null) params.set('projectId', String(projectId));
    navigate(`/kanban?${params.toString()}`);
    setSearchQuery('');
    setSearchFocused(false);
  };

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    if (!q) return;
    const match = projects.find((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    goToKanbanWithSearch(match?.id);
  };

  const handleSelectProject = (projectId: number) => {
    const q = searchQuery.trim();
    setSelectedProjectId(projectId);
    const params = new URLSearchParams({ search: q || '', view: 'list', projectId: String(projectId) });
    navigate(`/kanban?${params.toString()}`);
    setSearchQuery('');
    setSearchFocused(false);
  };

  const handleSelectTicket = (ticketId: number) => {
    navigate(`/tickets/${ticketId}`);
    setSearchQuery('');
    setSearchFocused(false);
  };

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    let currentPath = '';

    paths.forEach((segment) => {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath] || segment;
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems = [
    {
      id: 'profile',
      label: 'Mi Perfil',
      icon: <User className="w-4 h-4" />,
      onClick: () => navigate('/settings'),
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: <Settings className="w-4 h-4" />,
      onClick: () => navigate('/settings'),
    },
    { id: 'divider', label: '', divider: true },
    {
      id: 'logout',
      label: 'Cerrar Sesión',
      icon: <LogOut className="w-4 h-4" />,
      onClick: handleLogout,
    },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-dark-bg border-b border-light-border dark:border-dark-border transition-colors shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left side - Breadcrumbs */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path || index}>
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />
                )}
                {index === breadcrumbs.length - 1 ? (
                  <span className="text-zinc-900 dark:text-white font-medium">{crumb.label}</span>
                ) : (
                  <button
                    onClick={() => crumb.path && navigate(crumb.path)}
                    className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    {crumb.label}
                  </button>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Right side - Search, Notifications, User */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block" ref={searchContainerRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none z-10" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar tickets, proyectos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchQuery.trim()) handleSearchSubmit();
                }
                if (e.key === 'Escape') {
                  setSearchFocused(false);
                  searchInputRef.current?.blur();
                }
              }}
              className="w-64 pl-10 pr-16 py-2 bg-light-bg dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xxs text-zinc-500 bg-light-hover dark:bg-dark-hover rounded border border-light-border dark:border-dark-border pointer-events-none">
              ⌘K
            </kbd>

            {/* Dropdown resultados */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                {matchingProjects.length > 0 && (
                  <div className="px-2 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 px-2 mb-1">Proyectos</p>
                    {matchingProjects.slice(0, 5).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProject(p.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm text-zinc-900 dark:text-zinc-100 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                      >
                        <FolderKanban className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {(searchTickets.length > 0 || loadingTickets) && query.length >= 2 && (
                  <div className="px-2 py-1.5 border-t border-light-border dark:border-dark-border">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 px-2 mb-1">Tickets</p>
                    {loadingTickets ? (
                      <p className="px-3 py-2 text-xs text-zinc-500">Buscando...</p>
                    ) : (
                      searchTickets.slice(0, 8).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTicket(t.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm text-zinc-900 dark:text-zinc-100 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                        >
                          <Ticket className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span className="font-mono text-xs text-zinc-500">#{t.id}</span>
                          <span className="truncate flex-1">{t.title || 'Sin título'}</span>
                          {t.project && (
                            <span className="text-[10px] text-zinc-400 truncate max-w-[80px]">{t.project.name}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {query.length >= 1 && (
                  <div className="border-t border-light-border dark:border-dark-border">
                    <button
                      type="button"
                      onClick={handleSearchSubmit}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-left text-sm font-medium text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                    >
                      <Ticket className="w-4 h-4 flex-shrink-0" />
                      Buscar &quot;{searchQuery.trim()}&quot; en tickets
                    </button>
                  </div>
                )}
                {query.length >= 1 && matchingProjects.length === 0 && searchTickets.length === 0 && !loadingTickets && (
                  <p className="px-3 py-2 text-xs text-zinc-500">Sin proyectos coincidentes. Escribe 2+ caracteres para buscar tickets.</p>
                )}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-light-hover dark:hover:bg-dark-hover rounded-lg transition-colors"
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {isDark ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationDropdownRef}>
            <button
              type="button"
              onClick={() => setShowNotificationDropdown((v) => !v)}
              className="relative p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-light-hover dark:hover:bg-dark-hover rounded-lg transition-colors"
              title="Notificaciones"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-semibold text-white bg-red-500 rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {showNotificationDropdown && (
              <div className="absolute right-0 top-full mt-1 w-[360px] max-h-[400px] flex flex-col bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-light-border dark:border-dark-border">
                  <span className="font-semibold text-zinc-900 dark:text-white">Notificaciones</span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => { markAllAsRead(); }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Marcar todas leídas
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto max-h-[320px]">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                      No hay notificaciones
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          markAsRead(n.id);
                          if (n.link) {
                            navigate(n.link);
                            setShowNotificationDropdown(false);
                          }
                        }}
                        className={`w-full text-left px-4 py-3 border-b border-light-border dark:border-dark-border last:border-b-0 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors ${!n.readAt ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                      >
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{n.title}</p>
                        {n.body && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-[11px] text-zinc-400 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: es })}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <Dropdown
            trigger={
              <div className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-light-hover dark:hover:bg-dark-hover cursor-pointer transition-colors h-full max-h-16 min-h-0 overflow-hidden">
                <Avatar name={user?.name || 'Usuario'} size="sm" className="flex-shrink-0" />
                <div className="hidden sm:block text-left min-w-0 max-w-[180px] overflow-hidden">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                    {user?.name || 'Usuario'}
                  </p>
                  <p className="text-xs text-zinc-500 capitalize truncate">
                    {user?.role || 'user'}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5" title={userDepartments.length > 0 ? userDepartments.map((d) => d.name).join(', ') : undefined}>
                    {userDepartments.length > 0
                      ? `Mis dept.: ${userDepartments.map((d) => d.name).join(', ')}`
                      : 'Sin departamentos'}
                  </p>
                </div>
              </div>
            }
            items={userMenuItems}
            align="right"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
