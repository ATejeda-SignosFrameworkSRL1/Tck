import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, Search, Ticket } from 'lucide-react';
import { ticketsAPI, projectsAPI } from '../services/api';
import { useProject } from '../context/ProjectContext';
import { PageHeader, Button, Table, StatusBadge, PriorityBadge, Avatar, AvatarGroup, Select, Input, EmptyState, Tabs, Card } from '../components/ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketData {
  id: number;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  dueDate?: string;
  project?: { id: number; name: string };
  createdBy?: { id: number; name: string };
  assignments?: { user: { id: number; name: string }; role?: 'assignee' | 'observer' | 'responsible' }[];
}

const TicketsList: React.FC = () => {
  const navigate = useNavigate();
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadTickets();
  }, [selectedProjectId]);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, statusFilter]);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const response = await ticketsAPI.getAll(selectedProjectId || undefined);
      setTickets(response.data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.id.toString().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    setFilteredTickets(filtered);
  };

  const statusTabs = [
    { id: 'all', label: 'Todos', badge: tickets.length },
    { id: 'open', label: 'Abiertos', badge: tickets.filter((t) => t.status === 'open').length },
    { id: 'in_progress', label: 'En Progreso', badge: tickets.filter((t) => t.status === 'in_progress').length },
    { id: 'blocked', label: 'Bloqueados', badge: tickets.filter((t) => t.status === 'blocked').length },
    { id: 'done', label: 'Completados', badge: tickets.filter((t) => t.status === 'done').length },
  ];

  const columns = [
    {
      key: 'id',
      header: 'ID',
      width: '80px',
      render: (ticket: TicketData) => (
        <span className="text-zinc-500 font-mono">#{ticket.id}</span>
      ),
    },
    {
      key: 'title',
      header: 'Ticket',
      sortable: true,
      render: (ticket: TicketData) => (
        <div>
          <p className="font-medium text-zinc-900 dark:text-white">{ticket.title}</p>
          <p className="text-xs text-zinc-500">{ticket.project?.name || 'Sin proyecto'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      width: '120px',
      render: (ticket: TicketData) => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'priority',
      header: 'Prioridad',
      width: '100px',
      render: (ticket: TicketData) => <PriorityBadge priority={ticket.priority} />,
    },
    {
      key: 'assignments',
      header: 'Asignados',
      width: '180px',
      render: (ticket: TicketData) => {
        const assignees = (ticket.assignments ?? []).filter((a) => (a as { role?: string }).role !== 'observer');
        const observers = (ticket.assignments ?? []).filter((a) => (a as { role?: string }).role === 'observer');
        if (assignees.length === 0 && observers.length === 0) {
          return <span className="text-zinc-500 text-sm">Sin asignar</span>;
        }
        return (
          <div className="flex flex-col gap-0.5">
            {assignees.length > 0 && (
              <div className="flex items-center gap-1">
                <AvatarGroup users={assignees.map((a) => ({ name: a.user.name }))} max={3} size="xs" />
                <span className="text-[10px] text-zinc-500">responsable{assignees.length > 1 ? 's' : ''}</span>
              </div>
            )}
            {observers.length > 0 && (
              <div className="flex items-center gap-1">
                <AvatarGroup users={observers.map((o) => ({ name: o.user.name }))} max={3} size="xs" />
                <span className="text-[10px] text-zinc-500">en observación</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'dueDate',
      header: 'Fecha Entrega',
      width: '120px',
      render: (ticket: TicketData) => {
        if (!ticket.dueDate) return <span className="text-zinc-500">-</span>;
        const isOverdue = new Date(ticket.dueDate) < new Date() && ticket.status !== 'done';
        return (
          <span className={isOverdue ? 'text-accent-danger' : 'text-zinc-600 dark:text-zinc-400'}>
            {format(new Date(ticket.dueDate), 'dd MMM', { locale: es })}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Creado',
      width: '100px',
      sortable: true,
      render: (ticket: TicketData) => (
        <span className="text-zinc-600 dark:text-zinc-400 text-sm">
          {format(new Date(ticket.createdAt), 'dd MMM', { locale: es })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        subtitle={`${filteredTickets.length} tickets encontrados`}
        actions={
          <Button onClick={() => navigate('/tickets/new')} leftIcon={<Plus className="w-4 h-4" />}>
            Nuevo Ticket
          </Button>
        }
      />

      {/* Filters */}
      <Card padding="sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <Input
              placeholder="Buscar tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <Select
            value={selectedProjectId?.toString() || ''}
            onChange={(value) => setSelectedProjectId(value ? parseInt(value) : null)}
            options={[
              { value: '', label: 'Todos los proyectos' },
              ...projects.map((p) => ({
                value: p.id,
                label: p.name,
              })),
            ]}
            className="w-48"
          />
        </div>
      </Card>

      {/* Status Tabs */}
      <Tabs
        tabs={statusTabs}
        activeTab={statusFilter}
        onChange={setStatusFilter}
        variant="pills"
      />

      {/* Tickets Table */}
      {filteredTickets.length > 0 ? (
        <Table
          columns={columns}
          data={filteredTickets}
          keyExtractor={(t) => t.id}
          onRowClick={(t) => navigate(`/tickets/${t.id}`)}
          isLoading={isLoading}
        />
      ) : (
        <EmptyState
          icon="inbox"
          title="No hay tickets"
          description={searchQuery ? 'No se encontraron tickets con esa búsqueda' : 'Crea tu primer ticket'}
          action={
            !searchQuery
              ? {
                  label: 'Crear Ticket',
                  onClick: () => navigate('/tickets/new'),
                }
              : undefined
          }
        />
      )}
    </div>
  );
};

export default TicketsList;
