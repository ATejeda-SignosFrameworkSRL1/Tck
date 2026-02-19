import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { ticketsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button, Table, StatusBadge, PriorityBadge, EmptyState, Spinner } from '../../components/ui';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserTicket {
  id: number;
  title: string;
  status: 'open' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  dueDate?: string;
  project?: { name: string };
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

const UserDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    myTickets: 0,
    inProgress: 0,
    resolved: 0,
    pendingAction: 0,
  });
  const [myTickets, setMyTickets] = useState<UserTicket[]>([]);
  const [assignedToMe, setAssignedToMe] = useState<UserTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const ticketsRes = await ticketsAPI.getAll();
      const tickets = Array.isArray(ticketsRes?.data) ? ticketsRes.data : [];

      const createdByMe = tickets.filter((t: any) => t.createdById === user.id);
      const assigned = tickets.filter((t: any) =>
        t.assignments?.some((a: any) => a.userId === user.id)
      );

      const inProgress = assigned.filter((t: any) => t.status === 'in_progress').length;
      const resolved = assigned.filter((t: any) => t.status === 'done').length;
      const pendingAction = assigned.filter((t: any) => t.status === 'open').length;

      setStats({ myTickets: createdByMe.length, inProgress, resolved, pendingAction });

      setMyTickets(
        createdByMe
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      );

      setAssignedToMe(
        assigned
          .filter((t: any) => t.status !== 'done')
          .sort((a: any, b: any) => {
            if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
          .slice(0, 5)
      );
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const ticketColumns = [
    {
      key: 'id',
      header: '#',
      width: '55px',
      render: (ticket: UserTicket) => (
        <span className="text-zinc-400 font-mono text-xs">#{ticket.id}</span>
      ),
    },
    {
      key: 'title',
      header: 'Ticket',
      render: (ticket: UserTicket) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{ticket.title}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">{ticket.project?.name || 'Sin proyecto'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      width: '110px',
      render: (ticket: UserTicket) => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'priority',
      header: 'Prioridad',
      width: '90px',
      render: (ticket: UserTicket) => <PriorityBadge priority={ticket.priority} />,
    },
    {
      key: 'date',
      header: 'Fecha',
      width: '100px',
      render: (ticket: UserTicket) => (
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
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Mi Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Hola, {user?.name}</p>
        </div>
        <Button onClick={() => navigate('/tickets/new')} leftIcon={<Plus className="w-4 h-4" />}>
          Crear Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatWidget
          label="Mis Tickets"
          value={stats.myTickets}
          icon={<Ticket className="w-5 h-5" />}
          color="#2FC6F6"
        />
        <StatWidget
          label="En Progreso"
          value={stats.inProgress}
          icon={<Clock className="w-5 h-5" />}
          color="#FFA900"
        />
        <StatWidget
          label="Resueltos"
          value={stats.resolved}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="#59C74C"
        />
        <StatWidget
          label="Pendientes"
          value={stats.pendingAction}
          icon={<AlertCircle className="w-5 h-5" />}
          color={stats.pendingAction > 0 ? '#FF5752' : '#a1a1aa'}
          subtitle={stats.pendingAction > 0 ? 'Requieren tu atención' : 'Todo al día'}
        />
      </div>

      {/* Tables grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned to me */}
        <div className="bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-light-border dark:border-dark-border">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-amber-500" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Asignados a Mí</h2>
              {assignedToMe.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                  {assignedToMe.length}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/kanban')}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {assignedToMe.length > 0 ? (
            <Table
              columns={ticketColumns}
              data={assignedToMe}
              keyExtractor={(ticket) => ticket.id}
              onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
            />
          ) : (
            <div className="p-8">
              <EmptyState
                icon="inbox"
                title="Sin tickets asignados"
                description="No tienes tickets asignados actualmente"
              />
            </div>
          )}
        </div>

        {/* Created by me */}
        <div className="bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-light-border dark:border-dark-border">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-primary" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Creados por Mí</h2>
              {myTickets.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary text-white">
                  {myTickets.length}
                </span>
              )}
            </div>
          </div>
          {myTickets.length > 0 ? (
            <Table
              columns={ticketColumns}
              data={myTickets}
              keyExtractor={(ticket) => ticket.id}
              onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
            />
          ) : (
            <div className="p-8">
              <EmptyState
                icon="file"
                title="Sin tickets creados"
                description="Aún no has creado ningún ticket"
                action={{
                  label: 'Crear Ticket',
                  onClick: () => navigate('/tickets/new'),
                }}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default UserDashboard;
