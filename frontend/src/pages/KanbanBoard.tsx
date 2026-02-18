import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Calendar,
  Search,
  LayoutGrid,
  List,
  AlertTriangle,
  Tag,
  X,
  Trash2,
  Bug,
  Code,
  FileText,
  Shield,
  Zap,
  Layout,
  Database,
  Server,
  Cpu,
  Image,
  Palette,
  BookOpen,
  Lock,
  Gauge,
  type LucideIcon,
} from 'lucide-react';
import { ticketsAPI, departmentsAPI, tagsAPI } from '../services/api';
import { notify } from '../store/notificationStore';
import { useProject } from '../context/ProjectContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import TicketDetailDrawer from '../components/tickets/TicketDetailDrawer';
import {
  Select,
  PriorityBadge,
  StatusBadge,
  AvatarGroup,
  Avatar,
  Button,
  EmptyState,
  Input,
  Table,
  Tabs,
  Spinner,
  Modal,
} from '../components/ui';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketData {
  id: number;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'blocked' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  dueDate?: string;
  project?: { id: number; name: string };
  createdBy?: { id: number; name: string };
  assignments?: { user: { id: number; name: string }; role?: 'assignee' | 'observer' | 'responsible' }[];
}

function splitAssignments(assignments: TicketData['assignments']) {
  const list = assignments ?? [];
  const assignees = list.filter((a) => (a as { role?: string }).role !== 'observer');
  const observers = list.filter((a) => (a as { role?: string }).role === 'observer');
  return { assignees, observers };
}

// ===================== TAGS =====================

interface TagData {
  id: number;
  name: string;
  color: string;
  icon?: string | null;
}

const TAG_ICONS: Record<string, LucideIcon> = {
  tag: Tag,
  bug: Bug,
  code: Code,
  fileText: FileText,
  shield: Shield,
  zap: Zap,
  layout: Layout,
  database: Database,
  server: Server,
  cpu: Cpu,
  image: Image,
  palette: Palette,
  bookOpen: BookOpen,
  lock: Lock,
  gauge: Gauge,
  none: Tag,
};

const TAG_COLOR_PRESETS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6',
  '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#84CC16', '#64748B',
];

const TAG_ICON_OPTIONS: { value: string; label: string }[] = [
  { value: 'tag', label: 'Tag' },
  { value: 'bug', label: 'Bug' },
  { value: 'code', label: 'Code' },
  { value: 'fileText', label: 'Documento' },
  { value: 'shield', label: 'Shield' },
  { value: 'zap', label: 'Zap' },
  { value: 'layout', label: 'Layout' },
  { value: 'database', label: 'BD' },
  { value: 'server', label: 'Server' },
  { value: 'cpu', label: 'Cpu' },
  { value: 'image', label: 'Image' },
  { value: 'palette', label: 'Palette' },
  { value: 'bookOpen', label: 'Libro' },
  { value: 'lock', label: 'Lock' },
  { value: 'gauge', label: 'Gauge' },
];

// ===================== CONSTANTES BITRIX STYLE =====================

const STATUS_COLUMNS = [
  { id: 'open', name: 'Nuevo', color: '#2FC6F6', bg: '#f0faff' , darkBg: 'rgba(47,198,246,0.06)' },
  { id: 'in_progress', name: 'En progreso', color: '#FFA900', bg: '#fffbf0', darkBg: 'rgba(255,169,0,0.06)' },
  { id: 'blocked', name: 'Bloqueado', color: '#FF5752', bg: '#fff5f5', darkBg: 'rgba(255,87,82,0.06)' },
  { id: 'in_review', name: 'En Revisión', color: '#A855F7', bg: '#faf5ff', darkBg: 'rgba(168,85,247,0.06)' },
  { id: 'done', name: 'Completado', color: '#59C74C', bg: '#f2fdf0', darkBg: 'rgba(89,199,76,0.06)' },
];

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-zinc-300 dark:bg-zinc-600',
};

// ===================== BITRIX KANBAN CARD =====================

interface KanbanCardProps {
  ticket: TicketData;
  onClick: () => void;
  isDragging?: boolean;
  getTagsForTicket: (ticketId: number) => TagData[];
}

const TagChip: React.FC<{ tag: TagData; size?: 'sm' | 'md'; showIcon?: boolean }> = ({ tag, size = 'md', showIcon = true }) => {
  const IconComp = TAG_ICONS[tag.icon || 'none'] || TAG_ICONS.tag;
  const isSm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold text-white whitespace-nowrap ${
        isSm ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
      }`}
      style={{ backgroundColor: tag.color }}
      title={tag.name}
    >
      {showIcon && <IconComp className={isSm ? 'w-2.5 h-2.5' : 'w-2.5 h-2.5'} />}
      {tag.name}
    </span>
  );
};

const KanbanCard: React.FC<KanbanCardProps> = ({ ticket, onClick, isDragging, getTagsForTicket }) => {
  const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() && ticket.status !== 'done';
  const { assignees, observers } = splitAssignments(ticket.assignments);
  const assignee = assignees.length > 0 ? assignees[0].user : null;
  const tags = getTagsForTicket(ticket.id);

  return (
    <div
      onClick={onClick}
      className={`group bg-white dark:bg-dark-card rounded-md shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-transparent cursor-pointer transition-all duration-150 ${
        isDragging
          ? 'shadow-xl scale-[1.02] border-primary/40'
          : 'hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] hover:-translate-y-px'
      }`}
    >
      {/* Main content */}
      <div className="px-3.5 pt-3 pb-2.5">
        {/* Title */}
        <h4 className="text-[13px] font-medium text-zinc-900 dark:text-white leading-snug line-clamp-2 mb-2">
          {ticket.title}
        </h4>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-2">
            {tags.slice(0, 3).map((tag) => (
              <TagChip key={tag.id} tag={tag} size="sm" showIcon />
            ))}
            {tags.length > 3 && (
              <span className="text-[9px] font-medium text-zinc-400">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="font-mono">#{ticket.id}</span>
          {ticket.project && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600">&middot;</span>
              <span className="truncate max-w-[100px]">{ticket.project.name}</span>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3.5 py-2 border-t border-zinc-50 dark:border-zinc-800/50">
        <div className="flex items-center gap-2">
          {/* Priority dot */}
          <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[ticket.priority]}`} title={`Prioridad: ${ticket.priority}`} />

          {/* Due date */}
          {ticket.dueDate && (
            <span className={`flex items-center gap-1 text-[11px] font-medium ${
              isOverdue ? 'text-red-500' : 'text-zinc-400'
            }`}>
              <Calendar className="w-3 h-3" />
              {format(new Date(ticket.dueDate), 'dd MMM', { locale: es })}
            </span>
          )}
        </div>

        {/* Assignees / observers */}
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {assignee ? (
            <>
              <Avatar name={assignee.name} size="xs" />
              {assignees.length > 1 && (
                <span className="text-[9px] text-zinc-400">+{assignees.length - 1}</span>
              )}
              {observers.length > 0 && (
                <span className="text-[9px] text-zinc-500" title={`En observación: ${observers.map((o) => o.user.name).join(', ')}`}>
                  · obs.
                </span>
              )}
            </>
          ) : (
            <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-dashed border-zinc-300 dark:border-zinc-600" />
          )}
        </div>
      </div>
    </div>
  );
};

// ===================== DRAGGABLE CARD =====================

interface DraggableCardProps {
  ticket: TicketData;
  onClick: () => void;
  getTagsForTicket: (ticketId: number) => TagData[];
}

const DraggableCard: React.FC<DraggableCardProps> = ({ ticket, onClick, getTagsForTicket }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `ticket-${ticket.id}`,
    data: { type: 'ticket', ticket },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <KanbanCard ticket={ticket} onClick={onClick} isDragging={isDragging} getTagsForTicket={getTagsForTicket} />
    </div>
  );
};

// ===================== BITRIX DROPPABLE COLUMN =====================

interface DroppableColumnProps {
  column: typeof STATUS_COLUMNS[0];
  tickets: TicketData[];
  onTicketClick: (ticket: TicketData) => void;
  onAddClick: () => void;
  isOver?: boolean;
  getTagsForTicket: (ticketId: number) => TagData[];
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ column, tickets, onTicketClick, onAddClick, isOver, getTagsForTicket }) => {
  const { setNodeRef } = useDroppable({
    id: `column-${column.id}`,
    data: { type: 'column', column },
  });

  const highCount = tickets.filter((t) => t.priority === 'high').length;

  return (
    <div className="flex-1 min-w-[260px] flex flex-col">
      {/* Top color bar - Bitrix signature */}
      <div
        className="h-[3px] rounded-t-lg"
        style={{ backgroundColor: column.color }}
      />

      <div
        ref={setNodeRef}
        className={`flex flex-col flex-1 rounded-b-lg transition-all duration-200 ${
          isOver ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''
        }`}
        style={{
          backgroundColor: isOver ? `${column.color}12` : undefined,
          ...(isOver ? { ringColor: column.color } as any : {}),
        }}
      >
        {/* Column header */}
        <div className="px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              {column.name}
            </span>
            <span
              className="flex-shrink-0 min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: column.color }}
            >
              {tickets.length}
            </span>
            {highCount > 0 && (
              <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
                <AlertTriangle className="w-3 h-3" />
                {highCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onAddClick}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Cards container */}
        <div className="flex-1 px-1.5 pb-2 space-y-1.5 min-h-[120px] max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-thin">
          <SortableContext
            items={tickets.map((t) => `ticket-${t.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {tickets.map((ticket) => (
              <DraggableCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => onTicketClick(ticket)}
                getTagsForTicket={getTagsForTicket}
              />
            ))}
          </SortableContext>

          {tickets.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-300 dark:text-zinc-600">
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-2">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-medium">Sin tickets</span>
            </div>
          )}
        </div>

        {/* Column summary footer */}
        {tickets.length > 0 && (
          <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800/50">
            <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wide font-medium">
              <span>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
              <div className="flex items-center gap-1.5">
                {tickets.filter((t) => t.priority === 'high').length > 0 && (
                  <span className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" /> {tickets.filter((t) => t.priority === 'high').length} alta
                  </span>
                )}
                {tickets.filter((t) => t.priority === 'medium').length > 0 && (
                  <span className="flex items-center gap-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {tickets.filter((t) => t.priority === 'medium').length} media
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ===================== MAIN COMPONENT =====================

type ViewMode = 'kanban' | 'list';

interface KanbanBoardProps {
  /** When provided, hides toolbar project selector and uses this projectId */
  embeddedProjectId?: number | null;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ embeddedProjectId }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, selectedProjectId: ctxProjectId, selectedProject, setSelectedProjectId: ctxSetSelectedProjectId } = useProject();
  const { ticketDetailMode } = useSettings();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isEmbedded = embeddedProjectId !== undefined;

  // In embedded mode, use the passed projectId; otherwise use the context
  const selectedProjectId = isEmbedded ? embeddedProjectId : ctxProjectId;
  const setSelectedProjectId = isEmbedded ? (() => {}) as any : ctxSetSelectedProjectId;

  // Helper: cuando está embebido, pasar projectId al crear ticket
  const navigateToNewTicket = () => {
    const url = selectedProjectId
      ? `/tickets/new?projectId=${selectedProjectId}`
      : '/tickets/new';
    navigate(url);
  };

  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const v = searchParams.get('view');
    return v === 'list' ? 'list' : 'kanban';
  });

  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [activeTicket, setActiveTicket] = useState<TicketData | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [tags, setTags] = useState<TagData[]>([]);

  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLOR_PRESETS[0]);
  const [newTagIcon, setNewTagIcon] = useState<string>('tag');

  // Modal confirmación de eliminar tag
  const [tagToDelete, setTagToDelete] = useState<TagData | null>(null);
  const [isDeletingTag, setIsDeletingTag] = useState(false);

  /** Obtiene tags de un ticket a partir de la propiedad ticketTags del ticket (ya viene del backend) */
  const getTagsForTicket = useMemo(
    () => (ticketId: number): TagData[] => {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket || !(ticket as any).ticketTags) return [];
      return ((ticket as any).ticketTags as any[]).map((tt: any) => tt.tag).filter(Boolean);
    },
    [tickets]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Stats
  const stats = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'open').length;
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
    const blocked = tickets.filter((t) => t.status === 'blocked').length;
    const done = tickets.filter((t) => t.status === 'done').length;
    const overdue = tickets.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length;
    return { total: tickets.length, open, inProgress, blocked, done, overdue };
  }, [tickets]);

  // Load departments & tags
  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await departmentsAPI.getAll();
        setDepartments(res.data);
      } catch (error) {
        console.error('Error loading departments:', error);
      }
    };
    const loadTags = async () => {
      try {
        const res = await tagsAPI.getAll();
        setTags(res.data);
      } catch (error) {
        console.error('Error loading tags:', error);
      }
    };
    loadDepts();
    loadTags();
  }, []);

  // URL params (desde header u otro enlace: aplicar search, view, projectId y luego limpiar URL)
  useEffect(() => {
    const projectIdParam = searchParams.get('projectId');
    const viewParam = searchParams.get('view');
    const searchParam = searchParams.get('search');
    if (projectIdParam) {
      const id = parseInt(projectIdParam, 10);
      if (!isNaN(id)) setSelectedProjectId(id);
    }
    if (viewParam === 'list') setViewMode('list');
    if (searchParam) setViewMode('list');
    if (searchParams.has('view') || searchParams.has('search') || searchParams.has('projectId')) {
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    } else {
      setTickets([]);
      setIsLoading(false);
    }
  }, [selectedProjectId, selectedDepartmentId]);

  const loadData = async () => {
    if (!selectedProjectId) return;
    try {
      setIsLoading(true);
      const params: Record<string, number> = { projectId: selectedProjectId };
      if (selectedDepartmentId) params.currentDepartmentId = selectedDepartmentId;
      const ticketsRes = await ticketsAPI.getAll(params);
      setTickets(ticketsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ===================== HANDLERS =====================

  // Estado de retorno para que TicketDetail sepa volver al Centro de Proyecto
  const returnState = isEmbedded && selectedProjectId
    ? { from: 'matrix', projectId: selectedProjectId, tab: 'tickets' }
    : undefined;

  const openTicketDetail = (ticketId: number) => {
    if (ticketDetailMode === 'page') {
      navigate(`/tickets/${ticketId}`, { state: returnState });
      return;
    }
    setSelectedTicketId(ticketId);
    setIsDrawerOpen(true);
  };

  const closeTicketDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedTicketId(null);
  };

  const handleTicketUpdated = () => { loadData(); };

  const getTicketsByStatus = (status: string): TicketData[] => {
    return tickets.filter((t) => t.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticketId = parseInt(String(active.id).replace('ticket-', ''));
    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket) setActiveTicket(ticket);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overId = String(over.id);
      if (overId.startsWith('column-')) {
        setOverColumnId(overId.replace('column-', ''));
      } else if (overId.startsWith('ticket-')) {
        const ticketId = parseInt(overId.replace('ticket-', ''));
        const ticket = tickets.find((t) => t.id === ticketId);
        if (ticket) setOverColumnId(ticket.status);
      }
    } else {
      setOverColumnId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);
    setOverColumnId(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const ticketId = parseInt(activeId.replace('ticket-', ''));
    const draggedTicket = tickets.find((t) => t.id === ticketId);
    if (!draggedTicket) return;

    let targetStatus: string | null = null;
    if (overId.startsWith('column-')) {
      targetStatus = overId.replace('column-', '');
    } else if (overId.startsWith('ticket-')) {
      const overTicketId = parseInt(overId.replace('ticket-', ''));
      const overTicket = tickets.find((t) => t.id === overTicketId);
      if (overTicket) targetStatus = overTicket.status;
    }

    if (targetStatus && targetStatus !== draggedTicket.status) {
      try {
        await ticketsAPI.update(ticketId, { status: targetStatus });
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId ? { ...t, status: targetStatus as TicketData['status'] } : t
          )
        );
      } catch (error) {
        console.error('Error updating ticket status:', error);
        loadData();
      }
    }
  };

  // ===================== LIST HELPERS =====================

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const clearTagFilter = () => setSelectedTagIds([]);

  const handleAddTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    try {
      const res = await tagsAPI.create({ name, color: newTagColor, icon: newTagIcon });
      setTags((prev) => [...prev, res.data]);
      setNewTagName('');
      setNewTagColor(TAG_COLOR_PRESETS[0]);
      setNewTagIcon('tag');
      setShowAddTag(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Error al crear tag';
      notify({ type: 'error', title: 'Error al crear tag', body: msg });
    }
  };

  const confirmDeleteTag = async () => {
    if (!tagToDelete) return;
    try {
      setIsDeletingTag(true);
      await tagsAPI.delete(tagToDelete.id);
      setTags((prev) => prev.filter((t) => t.id !== tagToDelete.id));
      setSelectedTagIds((prev) => prev.filter((id) => id !== tagToDelete.id));
      setTagToDelete(null);
    } catch (error: any) {
      const msg = error.response?.status === 403
        ? 'No tienes permisos para eliminar tags. Solo los administradores pueden hacerlo.'
        : error.response?.data?.message || 'Error al eliminar tag';
      notify({ type: 'error', title: 'Error al eliminar tag', body: msg });
    } finally {
      setIsDeletingTag(false);
    }
  };

  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.id.toString().includes(query) ||
          getTagsForTicket(t.id).some((tag) => tag.name.toLowerCase().includes(query))
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }
    if (selectedTagIds.length > 0) {
      filtered = filtered.filter((t) => {
        const ticketTagIds = getTagsForTicket(t.id).map((tag) => tag.id);
        return selectedTagIds.every((tagId) => ticketTagIds.includes(tagId));
      });
    }
    return filtered;
  }, [tickets, searchQuery, statusFilter, selectedTagIds, getTagsForTicket]);

  const statusTabs = [
    { id: 'all', label: 'Todos', badge: tickets.length },
    { id: 'open', label: 'Nuevos', badge: stats.open },
    { id: 'in_progress', label: 'En Progreso', badge: stats.inProgress },
    { id: 'blocked', label: 'Bloqueados', badge: stats.blocked },
    { id: 'done', label: 'Completados', badge: stats.done },
  ];

  const tableColumns = [
    {
      key: 'id',
      header: 'ID',
      width: '70px',
      render: (ticket: TicketData) => (
        <span className="text-zinc-400 font-mono text-xs">#{ticket.id}</span>
      ),
    },
    {
      key: 'title',
      header: 'Ticket',
      sortable: true,
      render: (ticket: TicketData) => {
        const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() && ticket.status !== 'done';
        return (
          <div className="flex items-center gap-3">
            <div className={`w-1 h-8 rounded-full flex-shrink-0 ${PRIORITY_DOT[ticket.priority]}`} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{ticket.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {ticket.project && (
                  <span className="text-[10px] text-zinc-400">{ticket.project.name}</span>
                )}
                {isOverdue && (
                  <span className="text-[10px] font-semibold text-red-500 flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> Vencido
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      width: '130px',
      render: (ticket: TicketData) => <StatusBadge status={ticket.status} />,
    },
    {
      key: 'priority',
      header: 'Prioridad',
      width: '100px',
      render: (ticket: TicketData) => <PriorityBadge priority={ticket.priority} />,
    },
    {
      key: 'tags',
      header: 'Tags',
      width: '200px',
      render: (ticket: TicketData) => {
        const ticketTags = getTagsForTicket(ticket.id);
        if (ticketTags.length === 0) return <span className="text-zinc-300 text-xs">-</span>;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {ticketTags.map((tag) => (
              <TagChip key={tag.id} tag={tag} size="md" showIcon />
            ))}
          </div>
        );
      },
    },
    {
      key: 'assignments',
      header: 'Responsable',
      width: '180px',
      render: (ticket: TicketData) => {
        const { assignees, observers } = splitAssignments(ticket.assignments);
        if (assignees.length === 0 && observers.length === 0) {
          return <span className="text-zinc-300 text-xs">-</span>;
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
      header: 'Entrega',
      width: '110px',
      render: (ticket: TicketData) => {
        if (!ticket.dueDate) return <span className="text-zinc-300">-</span>;
        const isOverdue = new Date(ticket.dueDate) < new Date() && ticket.status !== 'done';
        return (
          <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-zinc-500'}`}>
            {format(new Date(ticket.dueDate), 'dd MMM yy', { locale: es })}
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
        <span className="text-zinc-400 text-xs">
          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: es })}
        </span>
      ),
    },
  ];

  // ===================== RENDER =====================

  return (
    <div className="space-y-4 h-full">
      {/* ===== TOOLBAR ===== */}
      {isEmbedded ? (
        /* Embedded toolbar: compact, no project selector */
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Summary pills */}
            {tickets.length > 0 && STATUS_COLUMNS.map((col) => {
              const count = getTicketsByStatus(col.id).length;
              if (count === 0) return null;
              return (
                <span key={col.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: col.color }}>
                  {count}
                </span>
              );
            })}
            {stats.overdue > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                <AlertTriangle className="w-3.5 h-3.5" /> {stats.overdue} vencido{stats.overdue > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
              <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Kanban
              </button>
              <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
                <List className="w-3.5 h-3.5" /> Lista
              </button>
            </div>
            <Select
              value={selectedDepartmentId?.toString() || ''}
              onChange={(value) => setSelectedDepartmentId(value ? parseInt(value) : null)}
              options={[{ value: '', label: 'Todos los dptos.' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
              className="w-44"
            />
            <Button size="sm" onClick={() => navigateToNewTicket()} leftIcon={<Plus className="w-3.5 h-3.5" />}>Nuevo Ticket</Button>
          </div>
        </div>
      ) : (
        /* Standalone toolbar */
        <div className="flex items-center justify-between gap-4 flex-wrap py-1">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              {selectedProject?.name || 'Tablero'}
            </h1>

            {/* Summary pills */}
            {tickets.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 ml-1">
                {STATUS_COLUMNS.map((col) => {
                  const count = getTicketsByStatus(col.id).length;
                  if (count === 0) return null;
                  return (
                    <span
                      key={col.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: col.color }}
                    >
                      {count}
                    </span>
                  );
                })}
                {stats.overdue > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {stats.overdue} vencido{stats.overdue > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-7 bg-zinc-200 dark:bg-zinc-700" />

            {/* Filters */}
            <Select
              value={selectedProjectId?.toString() || ''}
              onChange={(value) => setSelectedProjectId(value ? parseInt(value) : null)}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Proyecto"
              className="w-48"
            />
            <Select
              value={selectedDepartmentId?.toString() || ''}
              onChange={(value) => setSelectedDepartmentId(value ? parseInt(value) : null)}
              options={[
                { value: '', label: 'Todos los dptos.' },
                ...departments.map((d) => ({ value: d.id, label: d.name })),
              ]}
              className="w-48"
            />

            {/* Divider */}
            <div className="w-px h-7 bg-zinc-200 dark:bg-zinc-700" />

            <Button
              onClick={() => navigateToNewTicket()}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Nuevo Ticket
            </Button>
          </div>
        </div>
      )}

      {/* ===== CONTENT ===== */}
      {!selectedProjectId ? (
        isEmbedded ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-300 dark:text-zinc-600">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <LayoutGrid className="w-7 h-7 text-zinc-300 dark:text-zinc-600" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">Selecciona un proyecto</h3>
            <p className="text-sm text-zinc-500 mb-5">Elige un proyecto para ver su tablero Kanban</p>
            <Select
              value=""
              onChange={(value) => setSelectedProjectId(value ? parseInt(value) : null)}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Seleccionar proyecto..."
              className="w-56"
            />
          </div>
        )
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center h-72 gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-zinc-400">Cargando...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
            <Plus className="w-7 h-7 text-zinc-300 dark:text-zinc-600" />
          </div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">Sin tickets</h3>
          <p className="text-sm text-zinc-500 mb-5">Este proyecto no tiene tickets aún</p>
          <Button onClick={() => navigateToNewTicket()} leftIcon={<Plus className="w-4 h-4" />}>
            Crear primer ticket
          </Button>
        </div>
      ) : (
        <>
          {/* ==================== KANBAN VIEW ==================== */}
          {viewMode === 'kanban' && (
            <DndContext
              sensors={sensors}
              collisionDetection={rectIntersection}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
                {STATUS_COLUMNS.map((column) => (
                  <DroppableColumn
                    key={column.id}
                    column={column}
                    tickets={getTicketsByStatus(column.id)}
                    onTicketClick={(ticket) => openTicketDetail(ticket.id)}
                    onAddClick={() => navigateToNewTicket()}
                    isOver={overColumnId === column.id}
                    getTagsForTicket={getTagsForTicket}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeTicket && (
                  <div className="w-[260px]">
                    <KanbanCard
                      ticket={activeTicket}
                      onClick={() => {}}
                      isDragging
                      getTagsForTicket={getTagsForTicket}
                    />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}

          {/* ==================== LIST VIEW ==================== */}
          {viewMode === 'list' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px] max-w-sm">
                  <Input
                    placeholder="Buscar tickets o tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" />}
                  />
                </div>
              </div>

              {/* ===== TAG FILTER BAR ===== */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  <Tag className="w-3.5 h-3.5" />
                  Tags
                </span>
                <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700" />
                {tags.map((tag) => {
                  const isActive = selectedTagIds.includes(tag.id);
                  const IconComp = TAG_ICONS[tag.icon || 'none'];
                  return (
                    <span
                      key={tag.id}
                      className="inline-flex items-center rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-dark-card hover:shadow-sm"
                      style={isActive ? { borderColor: tag.color } : {}}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 text-[11px] font-semibold transition-all duration-150 ${
                          isActive ? 'text-white' : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        }`}
                        style={isActive ? { backgroundColor: tag.color } : {}}
                      >
                        <IconComp className="w-3 h-3 flex-shrink-0" style={isActive ? {} : { color: tag.color }} />
                        {tag.name}
                        {isActive && <X className="w-3 h-3 ml-0.5" />}
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setTagToDelete(tag); }}
                          className="p-1 rounded-r-full text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Eliminar tag del sistema"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
                {showAddTag ? (
                  <div className="inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card shadow-sm">
                    <Input
                      placeholder="Nombre del tag"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="w-32 h-8 text-xs"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <div className="flex items-center gap-1">
                      {TAG_COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewTagColor(c)}
                          className={`w-5 h-5 rounded-full border-2 transition-transform ${
                            newTagColor === c ? 'border-zinc-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                    </div>
                    <select
                      value={newTagIcon}
                      onChange={(e) => setNewTagIcon(e.target.value)}
                      className="h-8 px-2 rounded border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-surface text-xs text-zinc-700 dark:text-zinc-200 min-w-[100px]"
                    >
                      {TAG_ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" onClick={handleAddTag} disabled={!newTagName.trim()} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                      Agregar
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setShowAddTag(false); setNewTagName(''); }}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddTag(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-dashed border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-primary hover:text-primary transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar tag
                  </button>
                )}
                {selectedTagIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearTagFilter}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Limpiar filtros ({selectedTagIds.length})
                  </button>
                )}
              </div>

              <Tabs
                tabs={statusTabs}
                activeTab={statusFilter}
                onChange={setStatusFilter}
                variant="pills"
              />

              {filteredTickets.length > 0 ? (
                <Table
                  columns={tableColumns}
                  data={filteredTickets}
                  keyExtractor={(t) => t.id}
                  onRowClick={(t) => openTicketDetail(t.id)}
                  isLoading={isLoading}
                />
              ) : (
                <EmptyState
                  icon="inbox"
                  title="No hay tickets"
                  description={searchQuery ? 'No se encontraron tickets con esa búsqueda' : 'Crea tu primer ticket'}
                  action={
                    !searchQuery
                      ? { label: 'Crear Ticket', onClick: () => navigateToNewTicket() }
                      : undefined
                  }
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: Confirmar eliminación de tag */}
      <Modal
        isOpen={!!tagToDelete}
        onClose={() => { if (!isDeletingTag) setTagToDelete(null); }}
        title="Eliminar tag"
        size="sm"
        showCloseButton
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            ¿Estás seguro de que deseas eliminar el tag{' '}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: tagToDelete?.color }}
            >
              {tagToDelete?.name}
            </span>
            {' '}del sistema?
          </p>
          <p className="text-xs text-zinc-500">
            Esta acción es irreversible. El tag será removido de todos los tickets que lo tengan asignado.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setTagToDelete(null)}
              disabled={isDeletingTag}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={confirmDeleteTag}
              disabled={isDeletingTag}
              className="bg-red-600 hover:bg-red-700 text-white"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              {isDeletingTag ? 'Eliminando...' : 'Eliminar tag'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Ticket Detail Drawer */}
      {(ticketDetailMode === 'drawer' || ticketDetailMode === 'modal') && (
        <TicketDetailDrawer
          ticketId={selectedTicketId}
          isOpen={isDrawerOpen}
          onClose={closeTicketDrawer}
          onTicketUpdated={handleTicketUpdated}
          variant={ticketDetailMode === 'modal' ? 'modal' : 'drawer'}
          returnState={returnState}
        />
      )}
    </div>
  );
};

export default KanbanBoard;
