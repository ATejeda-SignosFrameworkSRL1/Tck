import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  CheckCircle2,
  Clock,
  Users,
  ArrowRight,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { ticketsAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button, Table, StatusBadge, PriorityBadge, Spinner } from '../../components/ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingTicket {
  id: number;
  title: string;
  status: 'open' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignments?: { user: { name: string }; role?: 'assignee' | 'observer' | 'responsible' }[];
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

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    departmentTickets: 0,
    assignedTickets: 0,
    unassignedTickets: 0,
    teamMembers: 0,
    blockedTickets: 0,
  });
  const [pendingTickets, setPendingTickets] = useState<PendingTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [ticketsSettled, usersSettled] = await Promise.allSettled([
        ticketsAPI.getAll(),
        usersAPI.getAll(),
      ]);

      const tickets = ticketsSettled.status === 'fulfilled' ? ticketsSettled.value?.data ?? [] : [];
      const users = usersSettled.status === 'fulfilled' ? usersSettled.value?.data ?? [] : [];
      if (ticketsSettled.status === 'rejected') console.error('Error loading tickets:', ticketsSettled.reason?.message);
      if (usersSettled.status === 'rejected') console.error('Error loading users:', usersSettled.reason?.message);

      const norm = (s: string) => (s || '').toLowerCase().replace(/\s/g, '_');
      const activeTickets = tickets.filter((t: any) => norm(t.status) !== 'done');
      const assignedTickets = activeTickets.filter((t: any) => t.assignments && t.assignments.length > 0).length;
      const unassignedTickets = activeTickets.filter((t: any) => !t.assignments || t.assignments.length === 0).length;
      const blockedTickets = activeTickets.filter((t: any) => norm(t.status) === 'blocked').length;

      setStats({
        departmentTickets: activeTickets.length,
        assignedTickets,
        unassignedTickets,
        teamMembers: users.length,
        blockedTickets,
      });

      const pending = tickets
        .filter((t: any) => ['open', 'in_progress', 'blocked'].includes(norm(t.status)))
        .sort((a: any, b: any) => {
          if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        })
        .slice(0, 6);

      setPendingTickets(pending);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pendingTicketsColumns = [
    {
      key: 'id',
      header: '#',
      width: '60px',
      render: (ticket: PendingTicket) => (
        <span className="text-zinc-400 font-mono text-xs">#{ticket.id}</span>
      ),
    },
    {
      key: 'title',
      header: 'Ticket',
      render: (ticket: PendingTicket) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{ticket.title}</p>
          {ticket.assignments && ticket.assignments.length > 0 && (() => {
            const assignees = ticket.assignments!.filter((a) => (a as { role?: string }).role !== 'observer');
            const observers = ticket.assignments!.filter((a) => (a as { role?: string }).role === 'observer');
            return (
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {assignees.length > 0 && <span>Responsables: {assignees.map((a) => a.user.name).join(', ')}</span>}
                {assignees.length > 0 && observers.length > 0 && ' · '}
                {observers.length > 0 && <span>En obs.: {observers.map((a) => a.user.name).join(', ')}</span>}
              </p>
            );
          })()}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      width: '120px',
      render: (ticket: PendingTicket) => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'priority',
      header: 'Prioridad',
      width: '100px',
      render: (ticket: PendingTicket) => <PriorityBadge priority={ticket.priority} />,
    },
    {
      key: 'dueDate',
      header: 'Entrega',
      width: '110px',
      render: (ticket: PendingTicket) => {
        if (!ticket.dueDate) return <span className="text-zinc-300">-</span>;
        const isOverdue = new Date(ticket.dueDate) < new Date();
        return (
          <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-zinc-500'}`}>
            {format(new Date(ticket.dueDate), 'dd MMM yy', { locale: es })}
          </span>
        );
      },
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
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Dashboard de Equipo</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Bienvenido, {user?.name}</p>
        </div>
        <Button onClick={() => navigate('/tickets/new')} leftIcon={<Plus className="w-4 h-4" />}>
          Nuevo Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatWidget
          label="Tickets Activos"
          value={stats.departmentTickets}
          icon={<Ticket className="w-5 h-5" />}
          color="#2FC6F6"
          onClick={() => navigate('/kanban')}
        />
        <StatWidget
          label="Asignados"
          value={stats.assignedTickets}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="#59C74C"
        />
        <StatWidget
          label="Sin Asignar"
          value={stats.unassignedTickets}
          icon={<Clock className="w-5 h-5" />}
          color={stats.unassignedTickets > 0 ? '#FFA900' : '#a1a1aa'}
          subtitle={stats.unassignedTickets > 0 ? 'Requieren asignación' : 'Todo asignado'}
        />
        <StatWidget
          label="Miembros"
          value={stats.teamMembers}
          icon={<Users className="w-5 h-5" />}
          color="#8B5CF6"
        />
      </div>

      {stats.blockedTickets > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {stats.blockedTickets} ticket{stats.blockedTickets > 1 ? 's' : ''} bloqueado{stats.blockedTickets > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-500/70">Requieren atención inmediata</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/kanban')}>
            Ver
          </Button>
        </div>
      )}

      {/* Pending Tickets */}
      <div className="bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-light-border dark:border-dark-border">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Tickets Pendientes</h2>
          <button
            onClick={() => navigate('/kanban')}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <Table
          columns={pendingTicketsColumns}
          data={pendingTickets}
          keyExtractor={(ticket) => ticket.id}
          onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
          emptyMessage="No hay tickets pendientes"
        />
      </div>
    </div>
  );
};

export default ManagerDashboard;
