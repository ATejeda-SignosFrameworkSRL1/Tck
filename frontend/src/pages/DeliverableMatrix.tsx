import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Plus, Trash2, Edit3, FileSpreadsheet, FileText,
  RefreshCw, Layers, Calendar, Upload, Eye, ChevronDown, Image as ImageIcon, X,
} from 'lucide-react';
import { deliverablesAPI, projectsAPI } from '../services/api';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { notify } from '../store/notificationStore';
import { Button, Spinner } from '../components/ui';
import type { Project, DeliverableEntry, DeliverablesSummary } from '../types';

/* ═══════════════════ STATUS CONFIG ═══════════════════ */
const STATUS_OPTIONS: { value: string; label: string; color: string; bg: string }[] = [
  { value: 'sin_iniciar', label: 'Sin Iniciar', color: '#94a3b8', bg: 'bg-slate-100 dark:bg-slate-800/40' },
  { value: 'avanzado',    label: 'Avanzado',    color: '#FFA900', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { value: 'terminado',   label: 'Terminado',   color: '#59C74C', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
];

const getStatusConfig = (s: string) => STATUS_OPTIONS.find((o) => o.value === s) || STATUS_OPTIONS[0];

/* ═══════════════════ LIGHTBOX MODAL ═══════════════════ */
const ImageLightbox: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
      <button onClick={onClose} className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors">
        <X className="w-4 h-4" />
      </button>
      <img src={url} alt="" className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain" />
    </div>
  </div>
);

/* ═══════════════════ BASELINE THUMB ═══════════════════ */
const BaselineThumb: React.FC<{
  entryId: number; path: string | null; kind: 'before' | 'after'; hasPhoto?: boolean;
  onPreview: (url: string) => void;
}> = ({ entryId, path, kind, hasPhoto, onPreview }) => {
  const [url, setUrl] = useState<string | null>(null);
  const ref = useRef<string | null>(null);
  const hasSource = hasPhoto || !!path;

  useEffect(() => {
    if (!hasSource) { setUrl(null); return; }
    let cancelled = false;
    const load = hasPhoto && entryId
      ? deliverablesAPI.getEntryPhotoBlobUrl(entryId, kind)
      : path ? deliverablesAPI.getImageBlobUrl(path) : Promise.reject(new Error('No image'));
    load.then((u) => {
      if (cancelled) { URL.revokeObjectURL(u); return; }
      if (ref.current) URL.revokeObjectURL(ref.current);
      ref.current = u;
      setUrl(u);
    }).catch(() => setUrl(null));
    return () => {
      cancelled = true;
      if (ref.current) { URL.revokeObjectURL(ref.current); ref.current = null; }
      setUrl(null);
    };
  }, [entryId, path, kind, hasPhoto, hasSource]);

  if (!hasSource) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="w-14 h-14 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-dashed border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
          <ImageIcon className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
        </div>
        <span className="text-[9px] text-zinc-300 dark:text-zinc-600">Sin imagen</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="w-14 h-14 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center animate-pulse">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className="relative">
        <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm group-hover:shadow-md transition-shadow" />
        <button
          type="button"
          onClick={() => onPreview(url)}
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/0 group-hover:bg-black/40 transition-all"
          title="Ver imagen"
        >
          <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
        </button>
      </div>
    </div>
  );
};

/* ═══════════════════ CIRCULAR PROGRESS ═══════════════════ */
const CircularProgress: React.FC<{ percentage: number; size?: number }> = ({ percentage, size = 80 }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 75 ? '#10b981' : percentage >= 50 ? '#f59e0b' : percentage >= 25 ? '#f97316' : '#ef4444';
  const bgGlow = percentage >= 75 ? 'shadow-emerald-500/20' : percentage >= 50 ? 'shadow-amber-500/20' : percentage >= 25 ? 'shadow-orange-500/20' : 'shadow-red-500/20';

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full shadow-lg ${bgGlow} bg-white dark:bg-zinc-900 p-1`}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.85" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-zinc-100 dark:text-zinc-800" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="url(#progressGrad)" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-base font-extrabold text-zinc-900 dark:text-white leading-none">{percentage.toFixed(1)}%</span>
        <span className="text-[7px] uppercase tracking-widest font-bold mt-0.5" style={{ color }}>Avance</span>
      </div>
    </div>
  );
};

/* ═══════════════════ STAT PILL ═══════════════════ */
const StatPill: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-dark-card">
    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{value}</span>
    <span className="text-[10px] text-zinc-400">{label}</span>
  </div>
);

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
const DeliverableMatrix: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject } = useProject();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'supervisor';

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(selectedProject?.id || null);
  const [entries, setEntries] = useState<DeliverableEntry[]>([]);
  const [summary, setSummary] = useState<DeliverablesSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [clientLogo, setClientLogo] = useState<string | null>(null);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const clientLogoRef = useRef<HTMLInputElement>(null);
  const companyLogoRef = useRef<HTMLInputElement>(null);

  const loadProjects = useCallback(async () => {
    try { setProjects((await projectsAPI.getAll()).data || []); } catch { /* */ }
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        deliverablesAPI.getByProject(selectedProjectId),
        deliverablesAPI.getSummary(selectedProjectId),
      ]);
      setEntries(entriesRes.data || []);
      const s = summaryRes.data;
      setSummary(s);
      setClientLogo(s?.clientLogoUrl || null);
      setCompanyLogo(s?.companyLogoUrl || null);
    } catch { /* */ } finally { setIsLoading(false); }
  }, [selectedProjectId]);

  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => {
    if (selectedProject?.id && !selectedProjectId) setSelectedProjectId(selectedProject.id);
  }, [selectedProject, selectedProjectId]);
  useEffect(() => { loadData(); }, [loadData]);

  /* ═══ CRUD ═══ */
  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este entregable?')) return;
    try {
      await deliverablesAPI.remove(id);
      await loadData();
    } catch (err: any) { notify({ type: 'error', title: 'Error al eliminar', body: err?.response?.data?.message }); }
  };

  /* ═══ LOGOS ═══ */
  const handleLogoUpload = async (file: File, type: 'client' | 'company') => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      if (type === 'client') setClientLogo(base64);
      else setCompanyLogo(base64);
      if (selectedProjectId) {
        try {
          await deliverablesAPI.updateLogos(selectedProjectId, {
            ...(type === 'client' ? { clientLogoUrl: base64 } : { companyLogoUrl: base64 }),
          });
        } catch { /* */ }
      }
    };
    reader.readAsDataURL(file);
  };

  /* ═══ EXPORT EXCEL ═══ */
  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const data = entries.map((e, i) => ({
      'No.': i + 1,
      'Nombre Entregable': e.name,
      'Descripción': e.description,
      'Fase': e.phase,
      'Frente Responsable': e.responsibleFront,
      'Fecha Programada Entrega': e.plannedDeliveryDate ? new Date(e.plannedDeliveryDate).toLocaleDateString('es') : '',
      'Fecha Real de Entrega': e.actualDeliveryDate ? new Date(e.actualDeliveryDate).toLocaleDateString('es') : '',
      'Estado': getStatusConfig(e.status).label,
      '% Avance': `${Number(e.progressPercentage).toFixed(0)}%`,
      'Resp. Elaboración - Nombre': e.elaborationResponsibleName,
      'Resp. Elaboración - Organización': e.elaborationResponsibleOrg,
      'Criterios de Aceptación': e.acceptanceCriteria,
      'Instancia de Revisión': e.reviewInstanceName,
      'Instancia de Aprobación': e.approvalInstanceName,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Matriz de Entregables');
    XLSX.writeFile(wb, `Matriz_Entregables_${summary?.projectName || 'Proyecto'}.xlsx`);
  };

  /* ═══ EXPORT PDF ═══ */
  const exportPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const pageWidth = doc.internal.pageSize.getWidth();
    if (clientLogo) { try { doc.addImage(clientLogo, 'PNG', 10, 5, 30, 15); } catch { /* */ } }
    if (companyLogo) { try { doc.addImage(companyLogo, 'PNG', pageWidth - 45, 5, 35, 15); } catch { /* */ } }
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('MATRIZ DE ENTREGABLES', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(`Proyecto: ${summary?.projectName || ''}`, 10, 26);
    doc.text(`Actualización: ${new Date().toLocaleDateString('es')}`, 10, 31);
    const tableData = entries.map((e, i) => [
      i + 1, e.name, e.description?.substring(0, 80) || '', e.phase, e.responsibleFront,
      e.plannedDeliveryDate ? new Date(e.plannedDeliveryDate).toLocaleDateString('es') : '',
      e.actualDeliveryDate ? new Date(e.actualDeliveryDate).toLocaleDateString('es') : '',
      getStatusConfig(e.status).label, `${Number(e.progressPercentage).toFixed(0)}%`,
      e.elaborationResponsibleName, e.elaborationResponsibleOrg,
      e.acceptanceCriteria?.substring(0, 100) || '', e.reviewInstanceName, e.approvalInstanceName,
    ]);
    autoTable(doc, {
      startY: 35,
      head: [['No.', 'Nombre', 'Descripción', 'Fase', 'Frente Resp.', 'F. Prog.', 'F. Real', 'Estado', 'Avance', 'Resp. Nombre', 'Resp. Org.', 'Criterios', 'Revisión', 'Aprobación']],
      body: tableData,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [16, 120, 80], textColor: 255, fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 250, 248] },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 30 }, 2: { cellWidth: 35 }, 11: { cellWidth: 40 } },
    });
    doc.save(`Matriz_Entregables_${summary?.projectName || 'Proyecto'}.pdf`);
  };

  const today = new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg p-4 md:p-6 space-y-4">
      {/* ═══════════════ LIGHTBOX ═══════════════ */}
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}

      {/* ═══════════════ HEADER ═══════════════ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Proyectos Entregables</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Gestión y control de entregables del proyecto</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value ? +e.target.value : null)}
              className="appearance-none text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg pl-3 pr-8 py-2 bg-white dark:bg-dark-surface text-zinc-900 dark:text-white min-w-[220px] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm"
            >
              <option value="">Seleccionar proyecto...</option>
              {projects.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <Button onClick={loadData} variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />}>Actualizar</Button>
          {entries.length > 0 && (
            <>
              <Button onClick={exportExcel} variant="secondary" leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}>Excel</Button>
              <Button onClick={exportPDF} variant="secondary" leftIcon={<FileText className="w-4 h-4 text-red-500" />}>PDF</Button>
            </>
          )}
          {canManage && selectedProjectId && (
            <Button onClick={() => navigate(`/deliverables/new?projectId=${selectedProjectId}`)} leftIcon={<Plus className="w-4 h-4" />}>Nuevo Entregable</Button>
          )}
        </div>
      </div>

      {!selectedProjectId && (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-400 dark:text-zinc-500">
          <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 mb-4"><Layers className="w-10 h-10 opacity-60" /></div>
          <p className="text-sm font-medium">Selecciona un proyecto para ver su Proyectos Entregables</p>
          <p className="text-xs mt-1 text-zinc-400">Usa el selector de la barra superior</p>
        </div>
      )}

      {selectedProjectId && isLoading && <div className="flex justify-center py-24"><Spinner /></div>}

      {selectedProjectId && !isLoading && summary && (
        <>
          {/* ═══════════════ PROJECT INFO BAR ═══════════════ */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-5 flex items-center justify-between flex-wrap gap-4">
              {/* Left: Client logo + Project info */}
              <div className="flex items-center gap-5">
                <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
                  {clientLogo ? (
                    <img src={clientLogo} alt="Logo Cliente" className="h-11 max-w-[84px] object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={() => clientLogoRef.current?.click()} />
                  ) : canManage ? (
                    <button onClick={() => clientLogoRef.current?.click()} className="h-11 w-[68px] rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all">
                      <Upload className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                    </button>
                  ) : <div className="h-11 w-[68px]" />}
                  <span className="text-[8px] text-zinc-400 uppercase tracking-widest font-semibold">Cliente</span>
                  <input ref={clientLogoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0], 'client'); }} />
                </div>
                <div className="w-px h-14 bg-zinc-100 dark:bg-zinc-800" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-semibold text-zinc-400 mb-1">Proyecto</div>
                  <div className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">{summary.projectName}</div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <Calendar className="w-3.5 h-3.5" />{today}
                  </div>
                </div>
              </div>

              {/* Center: Status pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatPill label="Total" value={summary.totalEntries} color="#6366f1" />
                <StatPill label="Terminados" value={summary.completedEntries} color="#59C74C" />
                <StatPill label="En progreso" value={summary.byStatus?.avanzado || 0} color="#FFA900" />
                <StatPill label="Sin iniciar" value={summary.byStatus?.sin_iniciar || 0} color="#94a3b8" />
              </div>

              {/* Right: Progress + Company logo */}
              <div className="flex items-center gap-5">
                <CircularProgress percentage={summary.overallProgress} size={72} />
                <div className="w-px h-14 bg-zinc-100 dark:bg-zinc-800" />
                <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
                  {companyLogo ? (
                    <img src={companyLogo} alt="Logo Empresa" className="h-11 max-w-[84px] object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={() => companyLogoRef.current?.click()} />
                  ) : canManage ? (
                    <button onClick={() => companyLogoRef.current?.click()} className="h-11 w-[68px] rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex items-center justify-center hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all">
                      <Upload className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                    </button>
                  ) : <div className="h-11 w-[68px]" />}
                  <span className="text-[8px] text-zinc-400 uppercase tracking-widest font-semibold">Empresa</span>
                  <input ref={companyLogoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0], 'company'); }} />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════ TABLE ═══════════════ */}
          <div className="bg-white dark:bg-dark-card rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
            {/* Table header bar */}
            <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center">
              <div className="flex-1" />
              <div className="flex items-center gap-2.5 justify-center">
                <Package className="w-4.5 h-4.5 opacity-80" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Proyectos Entregables</h2>
              </div>
              <div className="flex-1 flex justify-end">
                <span className="text-xs font-medium opacity-75 bg-white/15 px-2.5 py-0.5 rounded-full">{entries.length} registros</span>
              </div>
            </div>

            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400 dark:text-zinc-500">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 mb-4"><Package className="w-10 h-10 opacity-40" /></div>
                <p className="text-sm font-medium">No hay entregables definidos</p>
                <p className="text-xs mt-1 text-zinc-400">Haz clic en "Nuevo Entregable" para agregar uno</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                      <th className="py-3 px-3 text-left font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">No.</th>
                      <th className="py-3 px-3 text-left font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap min-w-[180px]">Nombre</th>
                      <th className="py-3 px-3 text-left font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap min-w-[200px]">Descripción</th>
                      <th className="py-3 px-3 text-center font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">Fase</th>
                      <th className="py-3 px-3 text-left font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap min-w-[130px]">Frente Resp.</th>
                      <th className="py-3 px-3 text-center font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap min-w-[100px]">F. Programada</th>
                      <th className="py-3 px-3 text-center font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap min-w-[100px]">F. Real</th>
                      <th className="py-3 px-3 text-center font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">Estado</th>
                      <th className="py-3 px-3 text-center font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap" colSpan={2}>
                        <div>Resp. Elaboración</div>
                        <div className="flex text-[8px] font-normal mt-0.5 opacity-70">
                          <span className="flex-1 text-center">Nombre</span>
                          <span className="flex-1 text-center">Organización</span>
                        </div>
                      </th>
                      <th className="py-3 px-3 text-left font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap min-w-[200px]">Criterios Aceptación</th>
                      <th className="py-3 px-3 text-center font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap min-w-[110px]">Revisión</th>
                      <th className="py-3 px-3 text-center font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap min-w-[110px]">Aprobación</th>
                      <th className="py-3 px-3 text-center font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap" colSpan={2}>
                        <div>Línea Base</div>
                        <div className="flex text-[8px] font-normal mt-0.5 opacity-70">
                          <span className="flex-1 text-center">Antes</span>
                          <span className="flex-1 text-center">Después</span>
                        </div>
                      </th>
                      {canManage && <th className="py-3 px-3 text-center font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                    {entries.map((entry, idx) => {
                      const sCfg = getStatusConfig(entry.status);
                      const pct = Number(entry.progressPercentage).toFixed(0);
                      return (
                        <tr key={entry.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors group">
                          <td className="py-3 px-3 text-center font-mono text-zinc-400 text-[11px]">{idx + 1}</td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-zinc-900 dark:text-white text-[12px] leading-tight">{entry.name}</span>
                          </td>
                          <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400 max-w-[250px]">
                            <p className="line-clamp-2 whitespace-pre-wrap leading-relaxed">{entry.description || '—'}</p>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">{entry.phase}</span>
                          </td>
                          <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">{entry.responsibleFront || '—'}</td>
                          <td className="py-3 px-3 text-center text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {entry.plannedDeliveryDate ? new Date(entry.plannedDeliveryDate).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="py-3 px-3 text-center text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                            {entry.actualDeliveryDate ? new Date(entry.actualDeliveryDate).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <div className="relative w-9 h-9">
                                <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                                  <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" className="text-zinc-100 dark:text-zinc-800" stroke="currentColor" />
                                  <circle cx="18" cy="18" r="15" fill="none" strokeWidth="3" stroke={sCfg.color} strokeDasharray={`${Number(pct) * 0.9425} 94.25`} strokeLinecap="round" className="transition-all duration-700" />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold" style={{ color: sCfg.color }}>{pct}%</span>
                              </div>
                              <span className={`inline-block text-[9px] font-semibold px-2 py-0.5 rounded-full ${sCfg.bg}`} style={{ color: sCfg.color }}>{sCfg.label}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">{entry.elaborationResponsibleName || '—'}</td>
                          <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">{entry.elaborationResponsibleOrg || '—'}</td>
                          <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400 max-w-[250px]">
                            <p className="line-clamp-3 whitespace-pre-wrap text-[10px] leading-relaxed">{entry.acceptanceCriteria || '—'}</p>
                          </td>
                          <td className="py-3 px-3 text-center text-zinc-600 dark:text-zinc-400">{entry.reviewInstanceName || '—'}</td>
                          <td className="py-3 px-3 text-center text-zinc-600 dark:text-zinc-400">{entry.approvalInstanceName || '—'}</td>
                          <td className="py-3 px-3 text-center">
                            <BaselineThumb entryId={Number(entry.id)} path={entry.baselinePhotoBefore} kind="before" hasPhoto={entry.hasPhotoBefore} onPreview={setLightboxUrl} />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <BaselineThumb entryId={Number(entry.id)} path={entry.baselinePhotoAfter} kind="after" hasPhoto={entry.hasPhotoAfter} onPreview={setLightboxUrl} />
                          </td>
                          {canManage && (
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center gap-1 justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => navigate(`/deliverables/edit/${entry.id}`)} className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors" title="Editar">
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(Number(entry.id))} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors" title="Eliminar">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DeliverableMatrix;
