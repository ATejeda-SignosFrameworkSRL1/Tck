import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Plus, Trash2, Target, CheckCircle2, AlertTriangle,
  Diamond, Edit3, Layers, X, Save, FolderTree, ArrowRight, Search, MoreHorizontal,
  Copy, Ticket, Link2, BookMarked, ChevronsUpDown,
  PlusCircle, History, Eye,
  Grid3X3, GanttChart, Columns3, BarChart3, Zap, Package,
} from 'lucide-react';
import { matrixAPI, projectsAPI, deliverablesAPI } from '../services/api';
import { useProject } from '../context/ProjectContext';
import { ClientProjectFilters } from '../components/layout/ClientProjectFilters';
import { useAuth } from '../context/AuthContext';
import { notify } from '../store/notificationStore';
import { Button, Modal, Spinner, ConfirmDialog } from '../components/ui';
import type { MatrixItem, MatrixDependency, ProjectBaseline, Project, DeliverableEntry } from '../types';

/* Lazy-loaded embedded views */
const GanttView = lazy(() => import('./GanttView'));
const KanbanBoard = lazy(() => import('./KanbanBoard'));
const SipeDashboard = lazy(() => import('./dashboards/SipeDashboard'));

/* Tab definitions */
type ProjectTab = 'matrix' | 'gantt' | 'tickets' | 'metrics';
const PROJECT_TABS: { id: ProjectTab; label: string; icon: React.ReactNode; accent: string }[] = [
  { id: 'matrix',  label: 'Matriz',   icon: <Grid3X3 className="w-4 h-4" />,    accent: '#6366f1' },
  { id: 'gantt',   label: 'Gantt',    icon: <GanttChart className="w-4 h-4" />,  accent: '#FFA900' },
  { id: 'tickets', label: 'Tickets',  icon: <Columns3 className="w-4 h-4" />,    accent: '#2FC6F6' },
  { id: 'metrics', label: 'Métricas', icon: <BarChart3 className="w-4 h-4" />,   accent: '#59C74C' },
];

/* ═══════════════════ CONSTANTS ═══════════════════ */
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Sin Iniciar', color: '#94a3b8' },
  in_progress: { label: 'En Progreso', color: '#FFA900' },
  delayed:     { label: 'Retrasado',   color: '#FF5752' },
  completed:   { label: 'Completado',  color: '#59C74C' },
};
const DEP_TYPE_LABELS: Record<string, string> = { FS: 'Fin → Inicio', SS: 'Inicio → Inicio', FF: 'Fin → Fin', SF: 'Inicio → Fin' };
const INPUT_CLS = "w-full text-sm border border-light-border dark:border-dark-border rounded-lg px-3 py-2.5 bg-light-bg dark:bg-dark-surface text-zinc-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors";
const LABEL_CLS = "block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5";

/* ═══════════════════ TREE NODE ═══════════════════ */
interface TreeNodeProps {
  item: MatrixItem; level: number; expandedIds: Set<number>; toggleExpand: (id: number) => void;
  onSelect: (item: MatrixItem) => void; onEdit: (item: MatrixItem) => void; onDelete: (id: number) => void;
  onAddChild: (parent: MatrixItem) => void; onDuplicate: (item: MatrixItem) => void; onCreateTicket: (item: MatrixItem) => void;
  canManage: boolean;
}
const TreeNode: React.FC<TreeNodeProps> = ({ item, level, expandedIds, toggleExpand, onSelect, onEdit, onDelete, onAddChild, onDuplicate, onCreateTicket, canManage }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedIds.has(item.id);
  const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.not_started;
  const progress = Number(item.progressPercentage) || 0;

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 192 });
    }
    setMenuOpen(!menuOpen);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    const onScroll = () => setMenuOpen(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', onScroll, true); };
  }, [menuOpen]);

  const menuItems = (
    <div ref={menuRef} className="fixed w-48 bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-xl py-1 text-sm" style={{ top: menuPos.top, left: menuPos.left, zIndex: 9999 }}>
      <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onSelect(item); }} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-light-hover dark:hover:bg-dark-hover text-zinc-700 dark:text-zinc-300"><Eye className="w-3.5 h-3.5" /> Ver detalle</button>
      {canManage && <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(item); }} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-light-hover dark:hover:bg-dark-hover text-zinc-700 dark:text-zinc-300"><Edit3 className="w-3.5 h-3.5" /> Editar</button>}
      {canManage && <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onAddChild(item); }} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-light-hover dark:hover:bg-dark-hover text-zinc-700 dark:text-zinc-300"><PlusCircle className="w-3.5 h-3.5" /> Agregar sub-ítem</button>}
      {canManage && <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate(item); }} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-light-hover dark:hover:bg-dark-hover text-zinc-700 dark:text-zinc-300"><Copy className="w-3.5 h-3.5" /> Duplicar</button>}
      <button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onCreateTicket(item); }} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-light-hover dark:hover:bg-dark-hover text-zinc-700 dark:text-zinc-300"><Ticket className="w-3.5 h-3.5" /> Crear ticket</button>
      {canManage && <><div className="my-1 border-t border-light-border dark:border-dark-border" /><button onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(item.id); }} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"><Trash2 className="w-3.5 h-3.5" /> Eliminar</button></>}
    </div>
  );

  return (
    <>
      <tr className="group border-b border-light-border dark:border-dark-border hover:bg-light-hover dark:hover:bg-dark-hover cursor-pointer transition-colors duration-150" onClick={() => onSelect(item)}>
        <td className="py-2.5 pr-3" style={{ paddingLeft: `${level * 20 + 16}px` }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <button onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }} className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
              </button>
            ) : <span className="w-5" />}
            {item.isMilestone && <Diamond className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            <span className="text-[11px] font-mono text-zinc-400 tabular-nums flex-shrink-0">{item.code}</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">{item.title}</span>
            {item.isCriticalPath && <span className="flex-shrink-0 text-[9px] leading-none px-1.5 py-[3px] rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold tracking-wide uppercase">RC</span>}
            {item.isDeliverable && <span className="flex-shrink-0 text-[9px] leading-none px-1.5 py-[3px] rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold tracking-wide uppercase flex items-center gap-0.5"><Package className="w-2.5 h-2.5" /> E</span>}
          </div>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-[6px] bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: config.color }} />
            </div>
            <span className="text-[11px] font-bold font-mono text-zinc-500 dark:text-zinc-400 w-9 text-right tabular-nums">{progress.toFixed(0)}%</span>
          </div>
        </td>
        <td className="px-3 py-2.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ backgroundColor: `${config.color}18`, color: config.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
            {config.label}
          </span>
        </td>
        <td className="px-3 py-2.5 text-[12px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums text-center">{item.weight > 0 ? `${item.weight}%` : '—'}</td>
        <td className="px-3 py-2.5 text-[12px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{item.plannedStart ? new Date(item.plannedStart).toLocaleDateString('es', { day: '2-digit', month: 'short' }) : '—'}</td>
        <td className="px-3 py-2.5 text-[12px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{item.plannedEnd ? new Date(item.plannedEnd).toLocaleDateString('es', { day: '2-digit', month: 'short' }) : '—'}</td>
        <td className="px-3 py-2.5">
          <div className="flex items-center justify-end">
            <button ref={btnRef} onClick={openMenu} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 transition-colors opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && createPortal(menuItems, document.body)}
          </div>
        </td>
      </tr>
      {hasChildren && isExpanded && item.children!.map((child) => (
        <TreeNode key={child.id} item={child} level={level + 1} expandedIds={expandedIds} toggleExpand={toggleExpand} onSelect={onSelect} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} onDuplicate={onDuplicate} onCreateTicket={onCreateTicket} canManage={canManage} />
      ))}
    </>
  );
};

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
const MatrixView: React.FC = () => {
  const navigate = useNavigate();
  const { projectId: urlProjectId } = useParams();
  const [searchParams] = useSearchParams();
  const { selectedProject, selectedProjectId: globalProjectId, setSelectedProjectId: setGlobalProjectId } = useProject();
  const { user } = useAuth();
  const projectId = urlProjectId ? +urlProjectId : globalProjectId ?? selectedProject?.id;

  // Active tab — lee ?tab= de la URL para que "regresar" funcione correctamente
  const initialTab = (searchParams.get('tab') as ProjectTab) || 'matrix';
  const [activeTab, setActiveTab] = useState<ProjectTab>(
    PROJECT_TABS.some((t) => t.id === initialTab) ? initialTab : 'matrix',
  );

  // Core state
  const [tree, setTree] = useState<MatrixItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(projectId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState({ totalItems: 0, completedItems: 0, overallProgress: 0, byStatus: {} as Record<string, number> });

  // Modals / drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MatrixItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<MatrixItem | null>(null);
  const [showBaselineModal, setShowBaselineModal] = useState(false);
  const [showBaselinesPanel, setShowBaselinesPanel] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<number | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [milestonesOnly, setMilestonesOnly] = useState(false);
  const [criticalOnly, setCriticalOnly] = useState(false);

  // Form data (shared create/edit)
  const emptyForm = { code: '', title: '', description: '', weight: 0, plannedStart: '', plannedEnd: '', isMilestone: false, isCriticalPath: false, isDeliverable: false, deliverableEntryId: null as number | null, parentId: null as number | null, status: 'not_started', codeMode: 'auto' as 'auto' | 'manual' };
  const [formData, setFormData] = useState({ ...emptyForm });
  const [deliverableEntriesForProject, setDeliverableEntriesForProject] = useState<DeliverableEntry[]>([]);

  // Drawer state for criteria, dependencies
  const [newCriteria, setNewCriteria] = useState('');
  const [dependencies, setDependencies] = useState<MatrixDependency[]>([]);
  const [baselines, setBaselines] = useState<ProjectBaseline[]>([]);
  const [depForm, setDepForm] = useState({ targetId: '', type: 'FS', lagDays: 0, direction: 'successor' as 'successor' | 'predecessor' });
  const [baselineName, setBaselineName] = useState('');
  const [drawerTab, setDrawerTab] = useState<'info' | 'criteria' | 'deps'>('info');

  const canManage = user?.role === 'admin' || user?.role === 'supervisor';
  const activeProject = projects.find((p) => p.id === selectedProjectId);

  /* ═══ Data loading ═══ */
  const loadProjects = useCallback(async () => { try { setProjects((await projectsAPI.getAll()).data || []); } catch { /**/ } }, []);

  const loadTree = useCallback(async () => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    try {
      const [treeRes, progressRes] = await Promise.all([matrixAPI.getProjectTree(selectedProjectId), matrixAPI.getProjectProgress(selectedProjectId)]);
      setTree(treeRes.data || []);
      setProgress(progressRes.data || { totalItems: 0, completedItems: 0, overallProgress: 0, byStatus: {} });
      const allIds = new Set<number>();
      const collect = (items: MatrixItem[]) => items.forEach((i) => { allIds.add(i.id); if (i.children) collect(i.children); });
      collect(treeRes.data || []);
      setExpandedIds(allIds);
    } catch { /**/ } finally { setIsLoading(false); }
  }, [selectedProjectId]);

  const loadDependencies = useCallback(async () => {
    if (!selectedProjectId) return;
    try { setDependencies((await matrixAPI.getDependencies(selectedProjectId)).data || []); } catch { /**/ }
  }, [selectedProjectId]);

  const loadBaselines = useCallback(async () => {
    if (!selectedProjectId) return;
    try { setBaselines((await matrixAPI.getProjectBaselines(selectedProjectId)).data || []); } catch { /**/ }
  }, [selectedProjectId]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadTree(); loadDependencies(); loadBaselines(); }, [loadTree, loadDependencies, loadBaselines]);

  // Sync global project selection -> local
  useEffect(() => {
    if (globalProjectId != null && globalProjectId !== selectedProjectId) {
      setSelectedProjectId(globalProjectId);
    }
  }, [globalProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local -> global when user picks from local dropdown
  const handleLocalProjectChange = (id: number | null) => {
    setSelectedProjectId(id);
    setGlobalProjectId(id);
  };

  useEffect(() => {
    if (showCreateModal && selectedProjectId) {
      deliverablesAPI.getByProject(selectedProjectId).then((r) => setDeliverableEntriesForProject(r.data || [])).catch(() => setDeliverableEntriesForProject([]));
    } else {
      setDeliverableEntriesForProject([]);
    }
  }, [showCreateModal, selectedProjectId]);

  /* ═══ Helpers ═══ */
  const flatItems = useCallback((): MatrixItem[] => {
    const r: MatrixItem[] = [];
    const f = (items: MatrixItem[]) => items.forEach((i) => { r.push(i); if (i.children) f(i.children); });
    f(tree);
    return r;
  }, [tree]);

  const toggleExpand = (id: number) => setExpandedIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const expandAll = () => { const allIds = new Set<number>(); const c = (items: MatrixItem[]) => items.forEach((i) => { allIds.add(i.id); if (i.children) c(i.children); }); c(tree); setExpandedIds(allIds); };
  const collapseAll = () => setExpandedIds(new Set());
  const allExpanded = expandedIds.size > 0 && expandedIds.size >= flatItems().length;

  // Normalizar id (API puede devolver number o string por bigint)
  const idNum = (x: unknown): number | null => (x == null || x === '') ? null : Number(x);

  // Sincronizar selectedItem con el árbol actualizado
  useEffect(() => {
    if (!selectedItem) return;
    const fresh = flatItems().find((i) => idNum(i.id) === idNum(selectedItem.id));
    if (fresh && JSON.stringify(fresh) !== JSON.stringify(selectedItem)) {
      setSelectedItem(fresh);
    }
  }, [tree]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calcular código WBS automático según padre
  const calculateAutoCode = useCallback((parentId: number | null): string => {
    if (parentId === null || parentId === undefined) {
      // Raíz: buscar el siguiente número (1, 2, 3...)
      const rootItems = tree.filter((i) => i.parentId == null);
      const existingCodes = rootItems.map((i) => i.code).filter((c) => /^\d+$/.test(c)).map((c) => parseInt(c));
      const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
      return String(maxNum + 1);
    } else {
      // Hijo: padre.code + "." + siguiente número (comparar ids normalizados)
      const parentItem = flatItems().find((i) => idNum(i.id) === idNum(parentId));
      if (!parentItem) return '';
      const siblings = flatItems().filter((i) => idNum(i.parentId) === idNum(parentId) && idNum(i.id) !== idNum(editingItem?.id));
      const parentCode = parentItem.code;
      const existingSuffixes = siblings
        .map((s) => s.code)
        .filter((c) => c.startsWith(parentCode + '.'))
        .map((c) => c.substring(parentCode.length + 1))
        .filter((s) => /^\d+$/.test(s))
        .map((s) => parseInt(s));
      const maxSuffix = existingSuffixes.length > 0 ? Math.max(...existingSuffixes) : 0;
      return `${parentCode}.${maxSuffix + 1}`;
    }
  }, [tree, flatItems, editingItem]);

  // Calcular código WBS automático cuando cambia el padre en modo automático
  useEffect(() => {
    if (formData.codeMode === 'auto' && showCreateModal) {
      const autoCode = calculateAutoCode(formData.parentId);
      setFormData((prev) => ({ ...prev, code: autoCode }));
    }
  }, [formData.codeMode, formData.parentId, showCreateModal, calculateAutoCode]);

  /* ═══ Filtered tree ═══ */
  const filteredTree = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filterNode = (item: MatrixItem): MatrixItem | null => {
      const matchesSelf = (!q || item.code.toLowerCase().includes(q) || item.title.toLowerCase().includes(q))
        && (!statusFilter || item.status === statusFilter)
        && (!milestonesOnly || item.isMilestone)
        && (!criticalOnly || item.isCriticalPath);
      const filteredChildren = (item.children || []).map(filterNode).filter(Boolean) as MatrixItem[];
      if (matchesSelf || filteredChildren.length > 0) return { ...item, children: filteredChildren };
      return null;
    };
    if (!q && !statusFilter && !milestonesOnly && !criticalOnly) return tree;
    return tree.map(filterNode).filter(Boolean) as MatrixItem[];
  }, [tree, searchQuery, statusFilter, milestonesOnly, criticalOnly]);

  /* ═══ CRUD handlers ═══ */
  const openCreateModal = (parentItem?: MatrixItem) => {
    const parentId = parentItem?.id ?? null;
    const autoCode = calculateAutoCode(parentId);
    setFormData({ ...emptyForm, parentId, code: autoCode, codeMode: 'auto' });
    setEditingItem(null);
    setShowCreateModal(true);
  };

  const openEditModal = (item: MatrixItem) => {
    setFormData({
      code: item.code, title: item.title, description: item.description || '',
      weight: Number(item.weight) || 0,
      plannedStart: item.plannedStart ? String(item.plannedStart).slice(0, 10) : '',
      plannedEnd: item.plannedEnd ? String(item.plannedEnd).slice(0, 10) : '',
      isMilestone: !!item.isMilestone, isCriticalPath: !!item.isCriticalPath, isDeliverable: !!item.isDeliverable,
      deliverableEntryId: item.deliverableEntryId ?? null,
      parentId: item.parentId ? Number(item.parentId) : null, status: item.status,
      codeMode: 'manual', // Al editar, permitir modificación manual del código
    });
    setEditingItem(item);
    setShowCreateModal(true);
  };

  const validateChildDatesAgainstParent = (): string | null => {
    if (formData.parentId == null) return null;
    const parent = flatItems().find((i) => idNum(i.id) === idNum(formData.parentId));
    if (!parent?.plannedStart && !parent?.plannedEnd) return null;
    const parentStart = parent.plannedStart ? new Date(parent.plannedStart).getTime() : null;
    const parentEnd = parent.plannedEnd ? new Date(parent.plannedEnd).getTime() : null;
    if (formData.plannedStart && parentStart !== null) {
      const childStart = new Date(formData.plannedStart).getTime();
      if (childStart < parentStart) {
        return 'La fecha de inicio no puede ser anterior a la fecha de inicio de la partida padre.';
      }
    }
    if (formData.plannedEnd && parentEnd !== null) {
      const childEnd = new Date(formData.plannedEnd).getTime();
      if (childEnd > parentEnd) {
        return 'La fecha de fin no puede ser posterior a la fecha de fin de la partida padre.';
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (!selectedProjectId || !formData.code || !formData.title) return;
    const dateError = validateChildDatesAgainstParent();
    if (dateError) {
      notify({ type: 'error', title: 'Fechas no válidas', body: dateError });
      return;
    }
    try {
      const payload = {
        code: formData.code,
        title: formData.title,
        description: formData.description,
        weight: Number(formData.weight) || 0,
        plannedStart: formData.plannedStart || undefined,
        plannedEnd: formData.plannedEnd || undefined,
        isMilestone: !!formData.isMilestone,
        isCriticalPath: !!formData.isCriticalPath,
        isDeliverable: !!formData.isDeliverable,
        deliverableEntryId: formData.isDeliverable ? (formData.deliverableEntryId ?? null) : null,
      };
      if (editingItem) {
        await matrixAPI.updateItem(Number(editingItem.id), {
          ...payload,
          parentId: formData.parentId !== null ? Number(formData.parentId) : null,
          status: formData.status,
        });
      } else {
        await matrixAPI.createItem({
          ...payload,
          projectId: selectedProjectId,
          parentId: formData.parentId != null ? Number(formData.parentId) : undefined,
        });
      }
      const wasEditing = !!editingItem;
      setShowCreateModal(false);
      setEditingItem(null);
      setFormData({ ...emptyForm });
      await loadTree();
      notify({ type: 'success', title: wasEditing ? 'Ítem actualizado' : 'Ítem creado' });
    } catch (err: any) {
      const msg = Array.isArray(err?.response?.data?.message) ? err.response.data.message.join(', ') : err?.response?.data?.message;
      notify({ type: 'error', title: 'Error al guardar', body: msg || 'Ocurrió un error inesperado' });
    }
  };

  const handleDelete = (id: number) => {
    setItemToDeleteId(id);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDeleteId) return;
    try {
      setIsDeletingItem(true);
      await matrixAPI.deleteItem(itemToDeleteId);
      setSelectedItem(null);
      setItemToDeleteId(null);
      await loadTree();
      notify({ type: 'success', title: 'Ítem eliminado' });
    } catch (err: any) {
      notify({
        type: 'error',
        title: 'Error al eliminar',
        body: err?.response?.data?.message,
      });
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleDuplicate = async (item: MatrixItem) => {
    if (!selectedProjectId) return;
    try {
      await matrixAPI.createItem({
        projectId: selectedProjectId, parentId: item.parentId ?? undefined,
        code: `${item.code}-copia`, title: `${item.title} (copia)`, description: item.description,
        weight: item.weight, plannedStart: item.plannedStart?.slice(0, 10) || undefined,
        plannedEnd: item.plannedEnd?.slice(0, 10) || undefined, isMilestone: item.isMilestone,
        isCriticalPath: item.isCriticalPath, isDeliverable: item.isDeliverable,
      });
      await loadTree();
    } catch (err: any) { notify({ type: 'error', title: 'Error al duplicar', body: err?.response?.data?.message }); }
  };

  /* ═══ Criteria handlers ═══ */
  const handleAddCriteria = async () => {
    if (!selectedItem || !newCriteria.trim()) return;
    try {
      await matrixAPI.addCriteria(selectedItem.id, { description: newCriteria.trim() });
      setNewCriteria('');
      const refreshed = (await matrixAPI.getItem(selectedItem.id)).data;
      setSelectedItem(refreshed);
      await loadTree();
    } catch (err: any) { notify({ type: 'error', title: 'Error', body: err?.response?.data?.message }); }
  };
  const handleVerifyCriteria = async (criteriaId: number, isMet: boolean) => {
    try {
      await matrixAPI.verifyCriteria(criteriaId, isMet);
      if (selectedItem) { const refreshed = (await matrixAPI.getItem(selectedItem.id)).data; setSelectedItem(refreshed); }
    } catch (err: any) { notify({ type: 'error', title: 'Error', body: err?.response?.data?.message }); }
  };
  const handleDeleteCriteria = async (criteriaId: number) => {
    try {
      await matrixAPI.deleteCriteria(criteriaId);
      if (selectedItem) { const refreshed = (await matrixAPI.getItem(selectedItem.id)).data; setSelectedItem(refreshed); }
    } catch (err: any) { notify({ type: 'error', title: 'Error', body: err?.response?.data?.message }); }
  };

  /* ═══ Dependency handlers ═══ */
  const handleAddDependency = async () => {
    if (!selectedItem || !depForm.targetId) return;
    const pred = depForm.direction === 'predecessor' ? +depForm.targetId : selectedItem.id;
    const succ = depForm.direction === 'successor' ? +depForm.targetId : selectedItem.id;
    try {
      await matrixAPI.createDependency({ predecessorId: pred, successorId: succ, type: depForm.type, lagDays: depForm.lagDays });
      setDepForm({ targetId: '', type: 'FS', lagDays: 0, direction: 'successor' });
      await loadDependencies();
    } catch (err: any) { notify({ type: 'error', title: 'Error', body: err?.response?.data?.message }); }
  };
  const handleDeleteDependency = async (id: number) => {
    try { await matrixAPI.deleteDependency(id); await loadDependencies(); } catch (err: any) { notify({ type: 'error', title: 'Error', body: err?.response?.data?.message }); }
  };
  const itemDeps = useMemo(() => {
    if (!selectedItem) return { predecessors: [], successors: [] };
    return {
      predecessors: dependencies.filter((d) => d.successorId === selectedItem.id),
      successors: dependencies.filter((d) => d.predecessorId === selectedItem.id),
    };
  }, [selectedItem, dependencies]);

  /* ═══ Baseline handlers ═══ */
  const handleCreateBaseline = async () => {
    if (!selectedProjectId || !baselineName.trim()) return;
    try {
      await matrixAPI.createBaseline({ projectId: selectedProjectId, name: baselineName.trim() });
      setBaselineName('');
      setShowBaselineModal(false);
      await loadBaselines();
    } catch (err: any) { notify({ type: 'error', title: 'Error', body: err?.response?.data?.message }); }
  };

  /* ═══ Render ═══ */
  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap py-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: '#6366f114' }}><FolderTree className="w-5 h-5 text-primary" /></div>
          <div>
            {activeProject ? (
              <>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-primary/70 mb-0.5">Centro de Proyecto</p>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">{activeProject.name}</h1>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Centro de Proyecto</h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">SIPE — Sistema Integrado de Planificación y Ejecución</p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ClientProjectFilters />
          {canManage && selectedProjectId && activeTab === 'matrix' && (
            <>
              <Button onClick={() => setShowBaselineModal(true)} variant="secondary" leftIcon={<BookMarked className="w-4 h-4" />}>Baseline</Button>
              <Button onClick={() => openCreateModal()} leftIcon={<Plus className="w-4 h-4" />}>Nueva Partida</Button>
            </>
          )}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      {selectedProjectId && (
        <div className="flex items-center gap-1 bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border p-1 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          {PROJECT_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
                style={isActive ? { backgroundColor: tab.accent } : undefined}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ═══════════════ TAB CONTENT ═══════════════ */}

      {/* ── TAB: MATRIZ ── */}
      {activeTab === 'matrix' && (
        <>
          {/* Summary pills */}
          {selectedProjectId && (
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: 'Total', value: progress.totalItems, color: '#6366f1' },
                { label: 'Completados', value: progress.completedItems, color: '#59C74C' },
                { label: 'En Progreso', value: progress.byStatus?.in_progress || 0, color: '#FFA900' },
                { label: 'Retrasados', value: progress.byStatus?.delayed || 0, color: '#FF5752' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border px-3.5 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">{s.value}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border px-3.5 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ml-auto">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Avance</span>
                <div className="w-20 h-[6px] bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(progress.overallProgress, 100)}%` }} /></div>
                <span className="text-sm font-bold text-primary tabular-nums">{progress.overallProgress.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Search + Filters + Expand/Collapse */}
          {selectedProjectId && tree.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por código o título..." className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-light-border dark:border-dark-border rounded-lg px-2.5 py-2 bg-white dark:bg-dark-card text-zinc-700 dark:text-zinc-300 focus:outline-none focus:border-primary">
                <option value="">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={() => setMilestonesOnly(!milestonesOnly)} className={`flex items-center gap-1 text-xs px-2.5 py-2 rounded-lg border transition-colors ${milestonesOnly ? 'bg-amber-500/10 border-amber-500/40 text-amber-600' : 'border-light-border dark:border-dark-border text-zinc-500 hover:border-zinc-300'}`}>
                <Diamond className="w-3 h-3" /> Hitos
              </button>
              <button onClick={() => setCriticalOnly(!criticalOnly)} className={`flex items-center gap-1 text-xs px-2.5 py-2 rounded-lg border transition-colors ${criticalOnly ? 'bg-red-500/10 border-red-500/40 text-red-600' : 'border-light-border dark:border-dark-border text-zinc-500 hover:border-zinc-300'}`}>
                <AlertTriangle className="w-3 h-3" /> RC
              </button>
              <div className="ml-auto">
                <button onClick={allExpanded ? collapseAll : expandAll} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2.5 py-2 rounded-lg border border-light-border dark:border-dark-border hover:border-zinc-300 transition-colors">
                  <ChevronsUpDown className="w-3.5 h-3.5" /> {allExpanded ? 'Colapsar' : 'Expandir'}
                </button>
              </div>
              {baselines.length > 0 && (
                <button onClick={() => setShowBaselinesPanel(!showBaselinesPanel)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2.5 py-2 rounded-lg border border-light-border dark:border-dark-border hover:border-zinc-300 transition-colors">
                  <History className="w-3.5 h-3.5" /> Baselines ({baselines.length})
                </button>
              )}
            </div>
          )}

          {/* Baselines panel */}
          {showBaselinesPanel && baselines.length > 0 && (
            <div className="bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Líneas Base</h3>
                <button onClick={() => setShowBaselinesPanel(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-red-500 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-1.5">
                {baselines.map((bl) => (
                  <div key={bl.id} className="flex items-center justify-between p-2.5 rounded-lg bg-light-bg dark:bg-dark-surface border border-light-border dark:border-dark-border">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{bl.name}</p>
                      <p className="text-[11px] text-zinc-400">{new Date(bl.createdAt).toLocaleDateString('es')} {bl.createdBy ? `· ${bl.createdBy.name}` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading */}
          {isLoading && tree.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-300 dark:text-zinc-600"><Spinner size="lg" /><span className="text-sm mt-3">Cargando Matriz...</span></div>
          )}

          {/* Tree table */}
          {selectedProjectId && !isLoading && (
            <div className="bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="h-[3px] rounded-t-lg bg-primary" />
              <table className="w-full">
                <thead>
                  <tr className="border-b border-light-border dark:border-dark-border">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Partida / Ítem</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-44">Progreso</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-32">Estado</th>
                    <th className="px-3 py-3 text-center text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-16">Peso</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-24">Inicio</th>
                    <th className="px-3 py-3 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-24">Fin</th>
                    <th className="px-3 py-3 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {filteredTree.length === 0 ? (
                    <tr><td colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-16 text-zinc-300 dark:text-zinc-600">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-3"><Layers className="w-5 h-5" /></div>
                        <span className="text-sm font-medium">{tree.length === 0 ? 'Sin ítems en la matriz' : 'Sin resultados para el filtro'}</span>
                        {tree.length === 0 && <span className="text-xs mt-1">Crea la primera partida para comenzar</span>}
                      </div>
                    </td></tr>
                  ) : filteredTree.map((item) => (
                    <TreeNode key={item.id} item={item} level={0} expandedIds={expandedIds} toggleExpand={toggleExpand} onSelect={setSelectedItem} onEdit={openEditModal} onDelete={handleDelete} onAddChild={(p) => openCreateModal(p)} onDuplicate={handleDuplicate} onCreateTicket={(it) => navigate(`/tickets/new?matrixItemId=${it.id}&projectId=${selectedProjectId}`)} canManage={canManage} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── TAB: GANTT ── */}
      {activeTab === 'gantt' && selectedProjectId && (
        <Suspense fallback={<div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>}>
          <GanttView embeddedProjectId={selectedProjectId} />
        </Suspense>
      )}

      {/* ── TAB: TICKETS ── */}
      {activeTab === 'tickets' && selectedProjectId && (
        <Suspense fallback={<div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>}>
          <KanbanBoard embeddedProjectId={selectedProjectId} />
        </Suspense>
      )}

      {/* ── TAB: MÉTRICAS ── */}
      {activeTab === 'metrics' && selectedProjectId && (
        <Suspense fallback={<div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>}>
          <SipeDashboard embeddedProjectId={selectedProjectId} />
        </Suspense>
      )}

      {/* ═══════════════ DETAIL DRAWER (always available) ═══════════════ */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setSelectedItem(null)} />
          <div className="fixed inset-y-0 right-0 w-[480px] max-w-full bg-white dark:bg-dark-card border-l border-light-border dark:border-dark-border shadow-xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-light-border dark:border-dark-border">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-zinc-500 font-mono">{selectedItem.code}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${STATUS_CONFIG[selectedItem.status]?.color || '#94a3b8'}18`, color: STATUS_CONFIG[selectedItem.status]?.color || '#94a3b8' }}>
                      {STATUS_CONFIG[selectedItem.status]?.label || selectedItem.status}
                    </span>
                    {selectedItem.isCriticalPath && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 font-bold">RC</span>}
                  </div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white truncate">{selectedItem.title}</h2>
                </div>
                <div className="flex items-center gap-1">
                  {canManage && <button onClick={() => { setSelectedItem(null); openEditModal(selectedItem); }} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-primary transition-colors" title="Editar"><Edit3 className="w-4 h-4" /></button>}
                  <button onClick={() => setSelectedItem(null)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-500 transition-colors"><X className="w-5 h-5" /></button>
                </div>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className="flex-shrink-0 border-b border-light-border dark:border-dark-border flex">
              {[
                { id: 'info' as const, label: 'Información' },
                { id: 'criteria' as const, label: `Criterios (${selectedItem.acceptanceCriteria?.length || 0})` },
                { id: 'deps' as const, label: `Dependencias (${itemDeps.predecessors.length + itemDeps.successors.length})` },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setDrawerTab(tab.id)} className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${drawerTab === tab.id ? 'text-primary border-b-2 border-primary' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>{tab.label}</button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {drawerTab === 'info' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div><p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">Progreso</p><div className="flex items-center gap-2"><div className="flex-1 h-[6px] bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${Number(selectedItem.progressPercentage)}%` }} /></div><span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">{Number(selectedItem.progressPercentage).toFixed(0)}%</span></div></div>
                    <div><p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">Peso</p><p className="text-sm font-bold text-zinc-900 dark:text-white">{selectedItem.weight}%</p></div>
                    <div><p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">Tipo</p><p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{selectedItem.isMilestone ? 'Hito' : 'Partida'}</p></div>
                  </div>
                  {selectedItem.description && (<div><p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Descripción</p><p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{selectedItem.description}</p></div>)}
                  <div className="grid grid-cols-2 gap-3">
                    {[{ label: 'Inicio Plan.', value: selectedItem.plannedStart }, { label: 'Fin Plan.', value: selectedItem.plannedEnd }, { label: 'Inicio Real', value: selectedItem.actualStart }, { label: 'Fin Real', value: selectedItem.actualEnd }].map((d) => (
                      <div key={d.label} className="p-3 rounded-lg bg-light-bg dark:bg-dark-surface border border-light-border dark:border-dark-border">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">{d.label}</p>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{d.value ? new Date(d.value).toLocaleDateString('es') : '—'}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {drawerTab === 'criteria' && (
                <>
                  {canManage && (
                    <div className="flex gap-2">
                      <input type="text" value={newCriteria} onChange={(e) => setNewCriteria(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddCriteria()} placeholder="Nuevo criterio de aceptación..." className="flex-1 text-sm border border-light-border dark:border-dark-border rounded-lg px-3 py-2 bg-light-bg dark:bg-dark-surface text-zinc-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      <Button size="sm" onClick={handleAddCriteria} disabled={!newCriteria.trim()} leftIcon={<Plus className="w-3.5 h-3.5" />}>Agregar</Button>
                    </div>
                  )}
                  {selectedItem.acceptanceCriteria && selectedItem.acceptanceCriteria.length > 0 ? (
                    <div className="space-y-1.5">
                      {selectedItem.acceptanceCriteria.map((c) => (
                        <div key={c.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-light-bg dark:bg-dark-surface border border-light-border dark:border-dark-border group">
                          {canManage ? (
                            <button onClick={() => handleVerifyCriteria(c.id, !c.isMet)} className={`mt-0.5 flex-shrink-0 transition-colors ${c.isMet ? 'text-green-500 hover:text-green-600' : 'text-zinc-300 dark:text-zinc-600 hover:text-green-400'}`}>
                              {c.isMet ? <CheckCircle2 className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                            </button>
                          ) : (
                            <span className={`mt-0.5 flex-shrink-0 ${c.isMet ? 'text-green-500' : 'text-zinc-300 dark:text-zinc-600'}`}>{c.isMet ? <CheckCircle2 className="w-4 h-4" /> : <Target className="w-4 h-4" />}</span>
                          )}
                          <span className={`flex-1 text-sm leading-relaxed ${c.isMet ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{c.description}</span>
                          {canManage && <button onClick={() => handleDeleteCriteria(c.id)} className="p-1 text-zinc-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-400 italic text-center py-4">Sin criterios definidos</p>
                  )}
                </>
              )}
              {drawerTab === 'deps' && (
                <>
                  {canManage && (
                    <div className="p-3 rounded-lg bg-light-bg dark:bg-dark-surface border border-light-border dark:border-dark-border space-y-2">
                      <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">Nueva dependencia</p>
                      <div className="grid grid-cols-2 gap-2">
                        <select value={depForm.direction} onChange={(e) => setDepForm({ ...depForm, direction: e.target.value as any })} className="text-xs border border-light-border dark:border-dark-border rounded-lg px-2 py-2 bg-white dark:bg-dark-card text-zinc-900 dark:text-white">
                          <option value="predecessor">Predecesor de este ítem</option>
                          <option value="successor">Sucesor de este ítem</option>
                        </select>
                        <select value={depForm.targetId} onChange={(e) => setDepForm({ ...depForm, targetId: e.target.value })} className="text-xs border border-light-border dark:border-dark-border rounded-lg px-2 py-2 bg-white dark:bg-dark-card text-zinc-900 dark:text-white">
                          <option value="">Seleccionar ítem...</option>
                          {flatItems().filter((i) => i.id !== selectedItem?.id).map((i) => <option key={i.id} value={i.id}>{i.code} — {i.title}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <label className="text-[10px] text-zinc-400">Tipo</label>
                          <select value={depForm.type} onChange={(e) => setDepForm({ ...depForm, type: e.target.value })} className="w-full text-xs border border-light-border dark:border-dark-border rounded-lg px-2 py-2 bg-white dark:bg-dark-card text-zinc-900 dark:text-white">
                            {Object.entries(DEP_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                          </select>
                        </div>
                        <div className="w-20">
                          <label className="text-[10px] text-zinc-400">Lag (días)</label>
                          <input type="number" value={depForm.lagDays} onChange={(e) => setDepForm({ ...depForm, lagDays: +e.target.value })} className="w-full text-xs border border-light-border dark:border-dark-border rounded-lg px-2 py-2 bg-white dark:bg-dark-card text-zinc-900 dark:text-white" />
                        </div>
                        <Button size="sm" onClick={handleAddDependency} disabled={!depForm.targetId} leftIcon={<Link2 className="w-3.5 h-3.5" />}>Crear</Button>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Predecesores ({itemDeps.predecessors.length})</p>
                    {itemDeps.predecessors.length > 0 ? (
                      <div className="space-y-1">{itemDeps.predecessors.map((d) => (
                        <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-light-bg dark:bg-dark-surface border border-light-border dark:border-dark-border group">
                          <div className="flex items-center gap-2"><span className="text-[10px] font-mono text-zinc-400">{d.predecessor?.code}</span><span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{d.predecessor?.title}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{d.type}{d.lagDays ? ` +${d.lagDays}d` : ''}</span></div>
                          {canManage && <button onClick={() => handleDeleteDependency(d.id)} className="p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>}
                        </div>
                      ))}</div>
                    ) : <p className="text-xs text-zinc-400 italic">Sin predecesores</p>}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Sucesores ({itemDeps.successors.length})</p>
                    {itemDeps.successors.length > 0 ? (
                      <div className="space-y-1">{itemDeps.successors.map((d) => (
                        <div key={d.id} className="flex items-center justify-between p-2 rounded-lg bg-light-bg dark:bg-dark-surface border border-light-border dark:border-dark-border group">
                          <div className="flex items-center gap-2"><span className="text-[10px] font-mono text-zinc-400">{d.successor?.code}</span><span className="text-xs text-zinc-700 dark:text-zinc-300 truncate">{d.successor?.title}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">{d.type}{d.lagDays ? ` +${d.lagDays}d` : ''}</span></div>
                          {canManage && <button onClick={() => handleDeleteDependency(d.id)} className="p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>}
                        </div>
                      ))}</div>
                    ) : <p className="text-xs text-zinc-400 italic">Sin sucesores</p>}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-3 border-t border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-surface flex gap-2">
              <Button onClick={() => { setSelectedItem(null); setActiveTab('tickets'); }} className="flex-1" variant="secondary" leftIcon={<ArrowRight className="w-4 h-4" />}>Ver Tickets</Button>
              <Button onClick={() => navigate(`/tickets/new?matrixItemId=${selectedItem.id}&projectId=${selectedProjectId}`)} className="flex-1" variant="secondary" leftIcon={<Ticket className="w-4 h-4" />}>Crear Ticket</Button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════ CREATE / EDIT MODAL ═══════════════ */}
      {showCreateModal && (
        <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setEditingItem(null); }} title={editingItem ? `Editar: ${editingItem.code}` : 'Nueva Partida / Ítem WBS'}>
          <div className="space-y-4">
            {/* Toggle Modo Código WBS: Automático / Manual */}
            {!editingItem && (
              <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500/5 to-transparent border border-cyan-500/20">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">MODO CÓDIGO WBS:</label>
                <div className="flex items-center bg-white dark:bg-dark-surface rounded-lg p-0.5 border border-light-border dark:border-dark-border">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, codeMode: 'auto' })}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${formData.codeMode === 'auto' ? 'bg-cyan-500 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    Automático
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, codeMode: 'manual' })}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${formData.codeMode === 'manual' ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                  >
                    Manual
                  </button>
                </div>
                {formData.codeMode === 'auto' && (
                  <span className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Herencia desde padre
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Código WBS *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="1.1.2"
                    disabled={formData.codeMode === 'auto'}
                    className={`${INPUT_CLS} ${formData.codeMode === 'auto' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed' : ''}`}
                  />
                  {formData.codeMode === 'auto' && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <span className="text-xs text-cyan-500 font-medium">AUTO</span>
                    </div>
                  )}
                </div>
              </div>
              <div><label className={LABEL_CLS}>Partida Padre</label>
                <select value={formData.parentId != null ? String(formData.parentId) : ''} onChange={(e) => setFormData({ ...formData, parentId: e.target.value ? Number(e.target.value) : null })} className={INPUT_CLS}>
                  <option value="">Raíz (sin padre)</option>
                  {flatItems().filter((i) => idNum(i.id) !== idNum(editingItem?.id)).map((i) => <option key={String(i.id)} value={Number(i.id)}>{i.code} — {i.title}</option>)}
                </select>
              </div>
            </div>
            <div><label className={LABEL_CLS}>Título *</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Nombre de la partida..." className={INPUT_CLS} /></div>
            <div><label className={LABEL_CLS}>Descripción</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className={INPUT_CLS} /></div>
            {(() => {
              const parentForDates = formData.parentId != null
                ? flatItems().find((i) => idNum(i.id) === idNum(formData.parentId))
                : null;
              const parentMinStart = parentForDates?.plannedStart
                ? String(parentForDates.plannedStart).slice(0, 10)
                : undefined;
              const parentMaxEnd = parentForDates?.plannedEnd
                ? String(parentForDates.plannedEnd).slice(0, 10)
                : undefined;
              return (
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={LABEL_CLS}>Peso (%)</label><input type="number" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: +e.target.value })} min={0} max={100} className={INPUT_CLS} /></div>
                  <div><label className={LABEL_CLS}>Inicio Plan.</label><input type="date" value={formData.plannedStart} onChange={(e) => setFormData({ ...formData, plannedStart: e.target.value })} min={parentMinStart} max={parentMaxEnd} className={INPUT_CLS} title={parentMinStart ? `Debe ser >= ${parentMinStart} (fecha inicio padre)` : undefined} /></div>
                  <div><label className={LABEL_CLS}>Fin Plan.</label><input type="date" value={formData.plannedEnd} onChange={(e) => setFormData({ ...formData, plannedEnd: e.target.value })} min={parentMinStart} max={parentMaxEnd} className={INPUT_CLS} title={parentMaxEnd ? `Debe ser <= ${parentMaxEnd} (fecha fin padre)` : undefined} /></div>
                </div>
              );
            })()}
            {editingItem && (
              <div><label className={LABEL_CLS}>Estado</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={INPUT_CLS}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            )}
            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input type="checkbox" checked={formData.isMilestone} onChange={(e) => setFormData({ ...formData, isMilestone: e.target.checked })} className="rounded border-zinc-300 text-primary focus:ring-primary" />
                <Diamond className="w-3.5 h-3.5 text-amber-500" /> Hito
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input type="checkbox" checked={formData.isCriticalPath} onChange={(e) => setFormData({ ...formData, isCriticalPath: e.target.checked })} className="rounded border-zinc-300 text-primary focus:ring-primary" />
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Ruta Crítica
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input type="checkbox" checked={formData.isDeliverable} onChange={(e) => setFormData({ ...formData, isDeliverable: e.target.checked, deliverableEntryId: e.target.checked ? formData.deliverableEntryId : null })} className="rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500" />
                <Package className="w-3.5 h-3.5 text-emerald-500" /> Entregable
              </label>
            </div>
            {formData.isDeliverable && (
              <div>
                <label className={LABEL_CLS}>Proyecto entregable (relación)</label>
                <select value={formData.deliverableEntryId ?? ''} onChange={(e) => setFormData({ ...formData, deliverableEntryId: e.target.value ? +e.target.value : null })} className={INPUT_CLS}>
                  <option value="">Seleccionar proyecto entregable...</option>
                  {deliverableEntriesForProject.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                {deliverableEntriesForProject.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Crea primero un entregable en la página Proyectos Entregables para poder asociarlo.</p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border">
              <Button variant="secondary" onClick={() => { setShowCreateModal(false); setEditingItem(null); }}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!formData.code || !formData.title} leftIcon={<Save className="w-4 h-4" />}>
                {editingItem ? 'Guardar Cambios' : 'Crear Partida'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════════════ BASELINE MODAL ═══════════════ */}
      {showBaselineModal && (
        <Modal isOpen={showBaselineModal} onClose={() => setShowBaselineModal(false)} title="Crear Línea Base">
          <div className="space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Se capturará un snapshot de todas las fechas planificadas y pesos actuales de la matriz.</p>
            <div><label className={LABEL_CLS}>Nombre de la Baseline *</label><input type="text" value={baselineName} onChange={(e) => setBaselineName(e.target.value)} placeholder="Ej: Baseline v1.0 - Kick-off" className={INPUT_CLS} /></div>
            <div className="flex justify-end gap-2 pt-3 border-t border-light-border dark:border-dark-border">
              <Button variant="secondary" onClick={() => setShowBaselineModal(false)}>Cancelar</Button>
              <Button onClick={handleCreateBaseline} disabled={!baselineName.trim()} leftIcon={<BookMarked className="w-4 h-4" />}>Crear Baseline</Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={itemToDeleteId != null}
        onClose={() => setItemToDeleteId(null)}
        title="Eliminar ítem"
        message="¿Eliminar este ítem y todos sus sub-ítems? Los tickets vinculados se desenlazarán."
        helperText="Esta acción es irreversible."
        confirmText="Eliminar ítem"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isDeletingItem}
        loadingText="Eliminando..."
        confirmIcon={<Trash2 className="w-3.5 h-3.5" />}
        onConfirm={confirmDeleteItem}
      />
    </div>
  );
};

export default MatrixView;
