import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  FolderKanban,
  ArrowRight,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { ticketsAPI, projectsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button, Table, StatusBadge, PriorityBadge, Spinner } from '../../components/ui';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedToday: number;
  overdueTickets: number;
  totalProjects: number;
  totalUsers: number;
  doneTickets: number;
}

interface RecentTicket {
  id: number;
  title: string;
  status: 'open' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  project?: { name: string };
  createdBy?: { name: string };
}

// Bitrix-style stat widget
const StatWidget: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  onClick?: () => void;
}> = ({ label, value, icon, color, subtitle, onClick }) => (
  <div
    onClick={onClick}
    className={`relative overflow-hidden bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
  >
    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: color }} />
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}14` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">{value}</p>
        <p className="text-xs text-zinc-500 font-medium mt-0.5">{label}</p>
        {subtitle && <p className="text-[10px] text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      {onClick && <ArrowRight className="w-4 h-4 text-zinc-300" />}
    </div>
  </div>
);

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    inProgressTickets: 0,
    resolvedToday: 0,
    overdueTickets: 0,
    totalProjects: 0,
    totalUsers: 0,
    doneTickets: 0,
  });
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [ticketsSettled, projectsSettled, usersSettled] = await Promise.allSettled([
        ticketsAPI.getAll(),
        projectsAPI.getAll(),
        usersAPI.getAll(),
      ]);

      const tickets = ticketsSettled.status === 'fulfilled' ? ticketsSettled.value?.data ?? [] : [];
      const projects = projectsSettled.status === 'fulfilled' ? projectsSettled.value?.data ?? [] : [];
      const users = usersSettled.status === 'fulfilled' ? usersSettled.value?.data ?? [] : [];

      if (ticketsSettled.status === 'rejected') console.error('Error loading tickets:', ticketsSettled.reason?.message);
      if (projectsSettled.status === 'rejected') console.error('Error loading projects:', projectsSettled.reason?.message);
      if (usersSettled.status === 'rejected') console.error('Error loading users:', usersSettled.reason?.message);

      const norm = (s: string) => (s || '').toLowerCase().replace(/\s/g, '_');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const openTickets = tickets.filter((t: any) => norm(t.status) === 'open').length;
      const inProgressTickets = tickets.filter((t: any) => norm(t.status) === 'in_progress').length;
      const doneTickets = tickets.filter((t: any) => norm(t.status) === 'done').length;

      const resolvedToday = tickets.filter((t: any) => {
        if (norm(t.status) !== 'done') return false;
        const resolvedDate = new Date(t.updatedAt || t.resolvedAt || 0);
        resolvedDate.setHours(0, 0, 0, 0);
        return resolvedDate.getTime() === today.getTime();
      }).length;

      const overdueTickets = tickets.filter((t: any) => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date() && norm(t.status) !== 'done';
      }).length;

      setStats({
        totalTickets: tickets.length,
        openTickets,
        inProgressTickets,
        resolvedToday,
        overdueTickets,
        totalProjects: Array.isArray(projects) ? projects.length : 0,
        totalUsers: Array.isArray(users) ? users.length : 0,
        doneTickets,
      });

      const sortedTickets = [...tickets]
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 6);
      setRecentTickets(sortedTickets);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completionRate = stats.totalTickets > 0
    ? Math.round((stats.doneTickets / stats.totalTickets) * 100)
    : 0;

  const recentTicketsColumns = [
    {
      key: 'id',
      header: '#',
      width: '60px',
      render: (ticket: RecentTicket) => (
        <span className="text-zinc-400 font-mono text-xs">#{ticket.id}</span>
      ),
    },
    {
      key: 'title',
      header: 'Ticket',
      render: (ticket: RecentTicket) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{ticket.title}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">{ticket.project?.name || 'Sin proyecto'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      width: '120px',
      render: (ticket: RecentTicket) => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'priority',
      header: 'Prioridad',
      width: '100px',
      render: (ticket: RecentTicket) => <PriorityBadge priority={ticket.priority} />,
    },
    {
      key: 'createdAt',
      header: 'Creado',
      width: '110px',
      render: (ticket: RecentTicket) => (
        <span className="text-xs text-zinc-400">
          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-zinc-400">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Bienvenido, {user?.name}</p>
        </div>
        <Button onClick={() => navigate('/tickets/new')} leftIcon={<Plus className="w-4 h-4" />}>
          Nuevo Ticket
        </Button>
      </div>

      {/* Main Stats - Bitrix style with left color bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatWidget
          label="Total Tickets"
          value={stats.totalTickets}
          icon={<Ticket className="w-5 h-5" />}
          color="#2FC6F6"
          onClick={() => navigate('/kanban')}
        />
        <StatWidget
          label="Abiertos"
          value={stats.openTickets}
          icon={<Clock className="w-5 h-5" />}
          color="#FFA900"
          subtitle={`${stats.inProgressTickets} en progreso`}
          onClick={() => navigate('/kanban')}
        />
        <StatWidget
          label="Resueltos Hoy"
          value={stats.resolvedToday}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="#59C74C"
          subtitle={`${completionRate}% tasa completados`}
        />
        <StatWidget
          label="Vencidos"
          value={stats.overdueTickets}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={stats.overdueTickets > 0 ? '#FF5752' : '#a1a1aa'}
          subtitle={stats.overdueTickets > 0 ? 'Requieren atención' : 'Todo al día'}
        />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatWidget
          label="Proyectos Activos"
          value={stats.totalProjects}
          icon={<FolderKanban className="w-5 h-5" />}
          color="#8B5CF6"
          onClick={() => navigate('/maintenance/projects')}
        />
        <StatWidget
          label="Usuarios"
          value={stats.totalUsers}
          icon={<Users className="w-5 h-5" />}
          color="#06B6D4"
          onClick={() => navigate('/maintenance/users')}
        />
        <StatWidget
          label="Completados"
          value={`${completionRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="#10B981"
          subtitle={`${stats.doneTickets} de ${stats.totalTickets} tickets`}
        />
      </div>

      {/* Recent Tickets */}
      <div className="bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-light-border dark:border-dark-border">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Tickets Recientes</h2>
          <button
            onClick={() => navigate('/kanban')}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <Table
          columns={recentTicketsColumns}
          data={recentTickets}
          keyExtractor={(ticket) => ticket.id}
          onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
          emptyMessage="No hay tickets recientes"
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
