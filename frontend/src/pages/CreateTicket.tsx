import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check, X, FileText, Plus, Trash2, Upload, Eye, Search, Users,
  Paperclip, Tag, Lock, Minus, GripVertical,
  ClipboardList, ArrowRight, ArrowLeft, Shield, CheckSquare,
} from 'lucide-react';
import { ticketsAPI, projectsAPI, usersAPI, departmentsAPI, tagsAPI, matrixAPI } from '../services/api';
import { notify } from '../store/notificationStore';
import { Button, Avatar } from '../components/ui';

interface Project { id: number; name: string; isActive: boolean; }
interface Department { id: number; name: string; description?: string; }
interface User { id: number; name: string; email: string; role: string; }
interface TagData { id: number; name: string; color: string; icon?: string | null; }

const TAG_COLOR_PRESETS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6',
  '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6', '#84CC16', '#64748B',
];

const STEPS = [
  { key: 'datos', label: 'Datos', icon: ClipboardList },
  { key: 'participantes', label: 'Participantes', icon: Users },
  { key: 'tags', label: 'Tags & Adjuntos', icon: Tag },
  { key: 'checklist', label: 'Checklist', icon: CheckSquare },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'Alta', dot: '#EF4444' },
  { value: 'medium', label: 'Media', dot: '#F97316' },
  { value: 'low', label: 'Baja', dot: '#10B981' },
];

const inputCls =
  'w-full px-3 py-2.5 bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors';
const labelCls =
  'block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5';

const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);

  const qsProjectId = searchParams.get('projectId') || '';
  const qsMatrixItemId = searchParams.get('matrixItemId') || '';
  const isFromProjectCenter = !!qsProjectId;

  const [projects, setProjects] = useState<Project[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    ticketType: 'task',
    projectId: qsProjectId,
    matrixItemId: qsMatrixItemId as string,
    estimatedHours: '',
    originDepartmentId: '',
    targetDepartmentId: '',
    dueDate: '',
    assignedUserIds: [] as number[],
    observerIds: [] as number[],
    responsibleId: null as number | null,
  });

  const [matrixItems, setMatrixItems] = useState<{ id: number; code: string; title: string }[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string }[]>([]);
  const [startDate, setStartDate] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [dropzoneActive, setDropzoneActive] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const [allTags, setAllTags] = useState<TagData[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [showInlineNewTag, setShowInlineNewTag] = useState(false);
  const [inlineTagName, setInlineTagName] = useState('');
  const [inlineTagColor, setInlineTagColor] = useState(TAG_COLOR_PRESETS[0]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, userSearch]);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (formData.projectId) {
      matrixAPI.getProjectTreeFlat(parseInt(formData.projectId))
        .then((res) => setMatrixItems((res.data || []).map((i: any) => ({ id: i.id, code: i.code, title: i.title }))))
        .catch(() => setMatrixItems([]));
    } else {
      setMatrixItems([]);
    }
  }, [formData.projectId]);

  const loadData = async () => {
    try {
      const [projectsRes, departmentsRes, usersRes, tagsRes] = await Promise.all([
        projectsAPI.getAll(), departmentsAPI.getAll(), usersAPI.getAll(), tagsAPI.getAll(),
      ]);
      setProjects(projectsRes.data.filter((p: Project) => p.isActive));
      setDepartments(departmentsRes.data);
      setUsers(usersRes.data);
      setAllTags(tagsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  /* ── Navigation ── */
  const goNext = () => {
    if (currentStep === 0 && (!formData.title || !formData.projectId || !formData.originDepartmentId)) {
      notify({ type: 'error', title: 'Campos requeridos', body: 'Completa título, proyecto y departamento' });
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 0));

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!formData.title || !formData.projectId || !formData.originDepartmentId) {
      notify({ type: 'error', title: 'Campos requeridos', body: 'Por favor completa los campos requeridos' });
      setCurrentStep(0);
      return;
    }
    try {
      setIsLoading(true);
      const res = await ticketsAPI.create({
        title: formData.title,
        description: formData.description || '',
        priority: formData.priority as 'low' | 'medium' | 'high',
        projectId: parseInt(formData.projectId),
        originDepartmentId: parseInt(formData.originDepartmentId),
        targetDepartmentId: formData.targetDepartmentId ? parseInt(formData.targetDepartmentId) : undefined,
        startDate: startDate || undefined,
        dueDate: formData.dueDate || undefined,
        assignedUserIds: formData.assignedUserIds.length > 0 ? formData.assignedUserIds.map(Number) : undefined,
        observerIds: formData.observerIds.length > 0 ? formData.observerIds.map(Number) : undefined,
        responsibleId: formData.responsibleId ? Number(formData.responsibleId) : undefined,
        checklistItems: checklistItems.length > 0 ? checklistItems.map((item) => ({ text: item.text })) : undefined,
        ticketType: formData.ticketType as any,
        matrixItemId: formData.matrixItemId ? parseInt(formData.matrixItemId) : undefined,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      });
      const ticketId = res.data?.id;
      if (ticketId && files.length > 0) await ticketsAPI.uploadAttachments(ticketId, files);
      if (ticketId && selectedTagIds.length > 0) await Promise.all(selectedTagIds.map((tagId) => tagsAPI.addToTicket(ticketId, tagId)));
      if (ticketId) notify({ type: 'success', title: 'Ticket creado', body: `#${ticketId}`, link: `/tickets/${ticketId}`, entityType: 'ticket', entityId: ticketId });
      navigate(ticketId ? `/tickets/${ticketId}` : '/tickets');
    } catch (error: any) {
      notify({ type: 'error', title: 'Error al crear ticket', body: error.response?.data?.message });
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Handlers ── */
  const toggleUserAssignment = (userId: number) => {
    setFormData((prev) => ({
      ...prev,
      assignedUserIds: prev.assignedUserIds.includes(userId) ? prev.assignedUserIds.filter((id) => id !== userId) : [...prev.assignedUserIds, userId],
      observerIds: prev.observerIds.filter((id) => id !== userId),
      responsibleId: prev.responsibleId === userId ? null : prev.responsibleId,
    }));
  };
  const toggleObserver = (userId: number) => {
    setFormData((prev) => ({
      ...prev,
      observerIds: prev.observerIds.includes(userId) ? prev.observerIds.filter((id) => id !== userId) : [...prev.observerIds, userId],
      assignedUserIds: prev.assignedUserIds.filter((id) => id !== userId),
      responsibleId: prev.responsibleId === userId ? null : prev.responsibleId,
    }));
  };
  const toggleResponsible = (userId: number) => {
    setFormData((prev) => ({
      ...prev,
      responsibleId: prev.responsibleId === userId ? null : userId,
      assignedUserIds: prev.assignedUserIds.filter((id) => id !== userId),
      observerIds: prev.observerIds.filter((id) => id !== userId),
    }));
  };

  const addChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklistItems((prev) => [...prev, { id: crypto.randomUUID(), text: newChecklistText.trim() }]);
    setNewChecklistText('');
  };
  const removeChecklistItem = (id: string) => setChecklistItems((prev) => prev.filter((item) => item.id !== id));

  const handleFiles = (newFiles: FileList | null) => { if (newFiles) setFiles((prev) => [...prev, ...Array.from(newFiles)]); };
  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));
  const viewFile = (file: File) => { window.open(URL.createObjectURL(file), '_blank', 'noopener,noreferrer'); };

  const toggleTagSelection = (tagId: number) => setSelectedTagIds((prev) => prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]);

  const handleCreateInlineTag = async () => {
    const name = inlineTagName.trim();
    if (!name) return;
    try {
      setIsCreatingTag(true);
      const res = await tagsAPI.create({ name, color: inlineTagColor });
      const newTag: TagData = res.data;
      setAllTags((prev) => [...prev, newTag]);
      setSelectedTagIds((prev) => [...prev, newTag.id]);
      setInlineTagName('');
      setInlineTagColor(TAG_COLOR_PRESETS[0]);
      setShowInlineNewTag(false);
    } catch (error: any) {
      notify({ type: 'error', title: 'Error al crear tag', body: error.response?.data?.message || 'Error al crear tag' });
    } finally {
      setIsCreatingTag(false);
    }
  };

  const incrementHours = () => {
    const c = parseFloat(formData.estimatedHours || '0');
    setFormData((p) => ({ ...p, estimatedHours: String(c + 1) }));
  };
  const decrementHours = () => {
    const c = parseFloat(formData.estimatedHours || '0');
    if (c > 0) setFormData((p) => ({ ...p, estimatedHours: String(Math.max(0, c - 1)) }));
  };

  const completedChecklist = 0;

  /* ════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col max-w-3xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between py-2 mb-2">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Nuevo ticket</h1>
        <span className="text-sm text-zinc-400 dark:text-zinc-500">
          Paso {currentStep + 1} de {STEPS.length}
        </span>
      </div>

      {/* ── Stepper ── */}
      <div className="flex items-start justify-center mb-8 px-4">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentStep;
          const isActive = i === currentStep;
          const Icon = step.icon;
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center min-w-[80px]">
                <button
                  type="button"
                  onClick={() => { if (i <= currentStep) setCurrentStep(i); }}
                  disabled={i > currentStep}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isCompleted || isActive
                      ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg shadow-zinc-800/20 dark:shadow-white/10'
                      : 'bg-white dark:bg-dark-card border-2 border-zinc-200 dark:border-zinc-700 text-zinc-400'
                  } ${i <= currentStep ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                >
                  {isCompleted ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <Icon className="w-5 h-5" />}
                </button>
                <span
                  className={`mt-2 text-xs font-medium whitespace-nowrap transition-colors ${
                    isCompleted || isActive ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mt-5 min-w-[40px] max-w-[140px] rounded-full transition-colors duration-300 ${
                    i < currentStep ? 'bg-zinc-800 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step Content ── */}
      <div className="flex-1">
        {/* ─────── STEP 1: DATOS ─────── */}
        {currentStep === 0 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {isFromProjectCenter && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-transparent">
                <Lock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className="text-sm text-zinc-600 dark:text-zinc-300">
                  Creando ticket para{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {projects.find((p) => String(p.id) === formData.projectId)?.name || `#${formData.projectId}`}
                  </strong>
                  {qsMatrixItemId && matrixItems.length > 0 && (
                    <>
                      {' · Ítem '}
                      <strong className="text-cyan-600 dark:text-cyan-400">
                        {matrixItems.find((m) => String(m.id) === qsMatrixItemId)?.code || qsMatrixItemId}
                      </strong>
                    </>
                  )}
                </span>
              </div>
            )}

            {/* Card: Datos principales */}
            <div className="rounded-2xl border border-zinc-200 dark:border-dark-border bg-zinc-50/80 dark:bg-dark-surface p-5">
              <div className="flex items-center gap-2 mb-5">
                <ClipboardList className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                <h3 className="font-semibold text-zinc-900 dark:text-white">Datos principales</h3>
              </div>

              {/* Título */}
              <div className="mb-4">
                <label className={labelCls}>
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Describe el problema o solicitud"
                  className={inputCls}
                />
              </div>

              {/* Proyecto + Tipo */}
              <div className={`grid gap-4 mb-4 ${isFromProjectCenter ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {!isFromProjectCenter && (
                  <div>
                    <label className={labelCls}>
                      Proyecto <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">Selecciona proyecto</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className={labelCls}>
                    Tipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.ticketType}
                    onChange={(e) => setFormData({ ...formData, ticketType: e.target.value })}
                    className={inputCls}
                  >
                    <option value="task">Tarea</option>
                    <option value="milestone">Hito</option>
                    <option value="correction">Corrección</option>
                    <option value="incident">Incidencia</option>
                  </select>
                </div>
              </div>

              {/* Prioridad */}
              <div className="mb-4">
                <label className={labelCls}>Prioridad</label>
                <div className="flex items-center gap-2">
                  {PRIORITY_OPTIONS.map((opt) => {
                    const active = formData.priority === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, priority: opt.value }))}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium border transition-all ${
                          active
                            ? 'border-current shadow-sm'
                            : 'border-zinc-200 dark:border-dark-border text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                        }`}
                        style={
                          active
                            ? { color: opt.dot, borderColor: opt.dot, backgroundColor: opt.dot + '12' }
                            : {}
                        }
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: opt.dot }} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Fecha inicio</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Fecha entrega</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* Horas est. | WBS | Departamento */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Horas est.</label>
                  <div className="flex items-center border border-zinc-200 dark:border-dark-border rounded-xl overflow-hidden bg-white dark:bg-dark-card">
                    <button
                      type="button"
                      onClick={decrementHours}
                      className="px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center text-sm font-semibold text-zinc-900 dark:text-white py-2.5 border-x border-zinc-200 dark:border-dark-border">
                      {formData.estimatedHours || '0'}h
                    </div>
                    <button
                      type="button"
                      onClick={incrementHours}
                      className="px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>WBS</label>
                  <select
                    value={formData.matrixItemId}
                    onChange={(e) => setFormData({ ...formData, matrixItemId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Sin vínculo</option>
                    {matrixItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} {item.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>
                    Departamento <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.originDepartmentId}
                    onChange={(e) => setFormData({ ...formData, originDepartmentId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Seleccionar...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name.charAt(0).toUpperCase() + d.name.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Departamento destino (opcional) */}
              <div>
                <label className={labelCls}>Departamento destino (opcional)</label>
                <select
                  value={formData.targetDepartmentId}
                  onChange={(e) => setFormData({ ...formData, targetDepartmentId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Sin destino</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name.charAt(0).toUpperCase() + d.name.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Card: Descripción */}
            <div className="rounded-2xl border border-zinc-200 dark:border-dark-border bg-zinc-50/80 dark:bg-dark-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                <h3 className="font-semibold text-zinc-900 dark:text-white">Descripción</h3>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el problema, contexto o requerimiento en detalle..."
                rows={4}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        )}

        {/* ─────── STEP 2: PARTICIPANTES ─────── */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Buscador global */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar usuario por nombre o email..."
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Card: Ejecutores */}
            <div className="rounded-2xl border border-zinc-200 dark:border-dark-border bg-zinc-50/80 dark:bg-dark-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-violet-500/10">
                    <Users className="w-4 h-4 text-violet-500" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Asignar ejecutores</h3>
                </div>
                {formData.assignedUserIds.length > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                    {formData.assignedUserIds.length} seleccionado{formData.assignedUserIds.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                {filteredUsers.map((user) => {
                  const isAssignee = formData.assignedUserIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUserAssignment(user.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-150 ${
                        isAssignee
                          ? 'bg-violet-500/10 border-violet-500/40 text-zinc-900 dark:text-white ring-1 ring-violet-500/30'
                          : 'border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-400 hover:border-violet-500/40 hover:bg-violet-500/5'
                      }`}
                    >
                      <Avatar name={user.name} size="xs" />
                      <span className="text-sm truncate">{user.name}</span>
                      {isAssignee && <Check className="w-4 h-4 text-violet-500 ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="col-span-2 text-sm text-zinc-500 py-3 text-center">Sin resultados</p>
                )}
              </div>
            </div>

            {/* Card: Responsable seguimiento */}
            <div className="rounded-2xl border border-zinc-200 dark:border-dark-border bg-zinc-50/80 dark:bg-dark-surface p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10">
                    <Shield className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Responsable de seguimiento</h3>
                </div>
                {formData.responsibleId && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    1 seleccionado
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mb-3">
                Persona que dará seguimiento, marcará avances en checklist, subirá evidencia y comentará.
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {filteredUsers.map((user) => {
                  const isSelected = formData.responsibleId === user.id;
                  const isAssignee = formData.assignedUserIds.includes(user.id);
                  const isObserver = formData.observerIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleResponsible(user.id)}
                      disabled={isAssignee || isObserver}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-150 ${
                        isSelected
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-zinc-900 dark:text-white ring-1 ring-emerald-500/30'
                          : isAssignee || isObserver
                            ? 'border-zinc-200 dark:border-dark-border text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-60'
                            : 'border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-400 hover:border-emerald-500/40 hover:bg-emerald-500/5'
                      }`}
                    >
                      <Avatar name={user.name} size="xs" />
                      <span className="text-sm truncate">{user.name}</span>
                      {isSelected && <Shield className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="col-span-2 text-sm text-zinc-500 py-3 text-center">Sin resultados</p>
                )}
              </div>
            </div>

            {/* Card: Observadores */}
            <div className="rounded-2xl border border-zinc-200 dark:border-dark-border bg-zinc-50/80 dark:bg-dark-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <Eye className="w-4 h-4 text-amber-500" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">En observación</h3>
                </div>
                {formData.observerIds.length > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {formData.observerIds.length} en observación
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {filteredUsers.map((user) => {
                  const isObserver = formData.observerIds.includes(user.id);
                  const isAssignee = formData.assignedUserIds.includes(user.id);
                  const isResp = formData.responsibleId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleObserver(user.id)}
                      disabled={isAssignee || isResp}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-150 ${
                        isObserver
                          ? 'bg-amber-500/10 border-amber-500/40 text-zinc-900 dark:text-white ring-1 ring-amber-500/30'
                          : isAssignee || isResp
                            ? 'border-zinc-200 dark:border-dark-border text-zinc-400 dark:text-zinc-500 cursor-not-allowed opacity-60'
                            : 'border-zinc-200 dark:border-dark-border text-zinc-600 dark:text-zinc-400 hover:border-amber-500/40 hover:bg-amber-500/5'
                      }`}
                    >
                      <Avatar name={user.name} size="xs" />
                      <span className="text-sm truncate">{user.name}</span>
                      {isObserver && <Eye className="w-4 h-4 text-amber-500 ml-auto flex-shrink-0" />}
                    </button>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <p className="col-span-2 text-sm text-zinc-500 py-3 text-center">Sin resultados</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─────── STEP 3: TAGS & ADJUNTOS ─────── */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Card: Tags */}
            <div className="rounded-2xl border border-zinc-200 dark:border-dark-border bg-zinc-50/80 dark:bg-dark-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-pink-500/10">
                    <Tag className="w-4 h-4 text-pink-500" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Tags</h3>
                </div>
                {selectedTagIds.length > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400">
                    {selectedTagIds.length} seleccionado{selectedTagIds.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                {allTags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTagSelection(tag.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 border ${
                        isSelected
                          ? 'text-white border-transparent shadow-sm scale-105'
                          : 'text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-dark-card hover:shadow-sm'
                      }`}
                      style={isSelected ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                    >
                      {tag.name}
                      {isSelected && <X className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
                {allTags.length === 0 && !showInlineNewTag && (
                  <span className="text-xs text-zinc-500">No hay tags. Crea uno nuevo.</span>
                )}
              </div>

              {showInlineNewTag ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200 dark:border-dark-border bg-white dark:bg-dark-card">
                  <input
                    type="text"
                    value={inlineTagName}
                    onChange={(e) => setInlineTagName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateInlineTag())}
                    placeholder="Nombre del tag..."
                    className="flex-1 px-2 py-1.5 text-sm bg-transparent border-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none min-w-[100px]"
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    {TAG_COLOR_PRESETS.slice(0, 8).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setInlineTagColor(c)}
                        className={`w-4 h-4 rounded-full border-2 transition-transform ${
                          inlineTagColor === c
                            ? 'border-zinc-900 dark:border-white scale-125'
                            : 'border-transparent hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateInlineTag}
                    disabled={!inlineTagName.trim() || isCreatingTag}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    {isCreatingTag ? '...' : 'Crear'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setShowInlineNewTag(false); setInlineTagName(''); }}
                    className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowInlineNewTag(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-pink-400/50 text-pink-500 dark:text-pink-400 hover:border-pink-500 hover:bg-pink-500/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Crear nuevo tag
                </button>
              )}
            </div>

            {/* Card: Adjuntos */}
            <div className="rounded-2xl border border-zinc-200 dark:border-dark-border bg-zinc-50/80 dark:bg-dark-surface p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-sky-500/10">
                  <Paperclip className="w-4 h-4 text-sky-500" />
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-white">Documentos</h3>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDropzoneActive(true); }}
                onDragLeave={() => setDropzoneActive(false)}
                onDrop={(e) => { e.preventDefault(); setDropzoneActive(false); handleFiles(e.dataTransfer.files); }}
                className={`relative p-8 border-2 border-dashed rounded-xl transition-all duration-200 group ${
                  dropzoneActive
                    ? 'border-sky-500 bg-sky-500/10 scale-[1.01]'
                    : 'border-zinc-300 dark:border-zinc-600 bg-white/50 dark:bg-dark-card/50 hover:border-sky-400 hover:bg-sky-500/5'
                }`}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  className="hidden"
                  id="file-upload"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <label htmlFor="file-upload" className="flex flex-col items-center justify-center gap-3 cursor-pointer">
                  <div className={`p-3 rounded-full transition-colors ${dropzoneActive ? 'bg-sky-500/20' : 'bg-zinc-100 dark:bg-zinc-800 group-hover:bg-sky-500/10'}`}>
                    <Upload className={`w-6 h-6 transition-colors ${dropzoneActive ? 'text-sky-500' : 'text-zinc-400 group-hover:text-sky-500'}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Arrastra archivos aquí</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      o <span className="text-sky-500 underline underline-offset-2">busca en tu equipo</span> &middot; PDF, PNG, JPG, DOC
                    </p>
                  </div>
                </label>
              </div>
              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-sky-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">{f.name}</p>
                        <p className="text-xs text-zinc-400">{(f.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => viewFile(f)}
                          className="p-1.5 text-zinc-400 hover:text-sky-500 hover:bg-sky-500/10 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ─────── STEP 4: CHECKLIST ─────── */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="rounded-2xl border border-zinc-200 dark:border-dark-border bg-zinc-50/80 dark:bg-dark-surface p-5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                  <h3 className="font-semibold text-zinc-900 dark:text-white">Checklist</h3>
                </div>
                {checklistItems.length > 0 && (
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {completedChecklist}/{checklistItems.length} completadas
                    </span>
                    <div className="w-24 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: checklistItems.length > 0 ? `${(completedChecklist / checklistItems.length) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-3">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white dark:bg-dark-card border border-zinc-200 dark:border-dark-border group"
                  >
                    <GripVertical className="w-4 h-4 text-zinc-300 dark:text-zinc-600 flex-shrink-0 cursor-grab" />
                    <div className="w-4.5 h-4.5 rounded border-2 border-zinc-300 dark:border-zinc-600 flex-shrink-0" />
                    <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-200">{item.text}</span>
                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item.id)}
                      className="p-1 text-zinc-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Agregar tarea */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-100/80 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
                <Plus className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); }
                  }}
                  placeholder="Agregar tarea"
                  className="flex-1 bg-transparent text-sm text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 focus:outline-none"
                />
                {newChecklistText.trim() && (
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Añadir
                  </button>
                )}
              </div>

              {checklistItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
                  <CheckSquare className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-sm">Sin tareas aún</p>
                  <p className="text-xs mt-1">Agrega tareas de verificación para este ticket</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between py-6 mt-6 border-t border-zinc-200 dark:border-dark-border">
        {currentStep === 0 ? (
          <button
            type="button"
            onClick={() => navigate('/kanban')}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors font-medium"
          >
            Cancelar
          </button>
        ) : (
          <button
            type="button"
            onClick={goPrev}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </button>
        )}

        {currentStep < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext}>
            <span className="flex items-center gap-1.5">
              Siguiente
              <ArrowRight className="w-4 h-4" />
            </span>
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} isLoading={isLoading}>
            Crear ticket
          </Button>
        )}
      </div>
    </div>
  );
};

export default CreateTicket;
