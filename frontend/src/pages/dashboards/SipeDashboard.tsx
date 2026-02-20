import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend as RLegend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Clock,
  FileCheck2,
  ArrowRight,
  RefreshCw,
  Zap,
  Target,
  BarChart3,
  Gauge,
} from 'lucide-react';
import { metricsAPI, projectsAPI } from '../../services/api';
import { useProject } from '../../context/ProjectContext';
import { Button, Spinner } from '../../components/ui';
import { ClientProjectFilters } from '../../components/layout/ClientProjectFilters';
import type {
  HealthSemaphore,
  ProgressMetrics,
  DeviationMetrics,
  ForecastMetrics,
  DocumentationCompliance,
  TicketDistribution,
  Project,
} from '../../types';

/* ═══════════════════ BITRIX24 PALETTE ═══════════════════ */
const SEMAPHORE = {
  green:  { color: '#59C74C', bg: 'rgba(89,199,76,0.08)', border: 'rgba(89,199,76,0.2)',  label: 'En Plan',     icon: '✓' },
  yellow: { color: '#FFA900', bg: 'rgba(255,169,0,0.08)',  border: 'rgba(255,169,0,0.2)',  label: 'Precaución',  icon: '!' },
  red:    { color: '#FF5752', bg: 'rgba(255,87,82,0.08)',  border: 'rgba(255,87,82,0.2)',  label: 'Crítico',     icon: '✕' },
};

const PIE_COLORS = ['#2FC6F6', '#6366f1', '#FF5752', '#A855F7', '#59C74C'];
const PIE_LABELS = ['Abiertos', 'En Progreso', 'Bloqueados', 'En Revisión', 'Completados'];

/* ═══════════════════ WIDGET CARD ═══════════════════ */
const WidgetCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  action?: { label: string; onClick: () => void };
  badge?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, accentColor, action, badge, children }) => (
  <div className="bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">
    {/* Top colored border */}
    <div className="h-[3px]" style={{ backgroundColor: accentColor }} />
    {/* Header */}
    <div className="px-5 py-3.5 border-b border-light-border dark:border-dark-border flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${accentColor}14` }}>
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h2>
        {badge}
      </div>
      {action && (
        <button onClick={action.onClick} className="text-[11px] font-medium text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
          {action.label} <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
    {/* Body */}
    <div className="flex-1 p-5">{children}</div>
  </div>
);

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */
interface SipeDashboardProps {
  /** When provided, hides header/project selector and uses this projectId */
  embeddedProjectId?: number | null;
}

const SipeDashboard: React.FC<SipeDashboardProps> = ({ embeddedProjectId }) => {
  const navigate = useNavigate();
  const { selectedProject, selectedProjectId: globalProjectId, setSelectedProjectId: setGlobalProjectId } = useProject();
  const isEmbedded = embeddedProjectId !== undefined;

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectIdLocal] = useState<number | null>(isEmbedded ? (embeddedProjectId ?? null) : (globalProjectId ?? (selectedProject?.id || null)));

  const setSelectedProjectId = (id: number | null) => {
    setSelectedProjectIdLocal(id);
    if (!isEmbedded) setGlobalProjectId(id);
  };
  const [isLoading, setIsLoading] = useState(false);

  const [health, setHealth] = useState<HealthSemaphore | null>(null);
  const [progress, setProgress] = useState<ProgressMetrics | null>(null);
  const [deviation, setDeviation] = useState<DeviationMetrics | null>(null);
  const [forecast, setForecast] = useState<ForecastMetrics | null>(null);
  const [compliance, setCompliance] = useState<DocumentationCompliance | null>(null);
  const [distribution, setDistribution] = useState<TicketDistribution | null>(null);

  // Sync when embeddedProjectId changes
  useEffect(() => { if (isEmbedded) setSelectedProjectId(embeddedProjectId ?? null); }, [isEmbedded, embeddedProjectId]);

  const loadProjects = useCallback(async () => {
    if (isEmbedded) return;
    try {
      const res = await projectsAPI.getAll();
      setProjects(res.data || []);
      if (!selectedProjectId && res.data?.length > 0) setSelectedProjectId(res.data[0].id);
    } catch { /* */ }
  }, [isEmbedded]);

  const loadMetrics = useCallback(async () => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    try {
      const r = await Promise.allSettled([
        metricsAPI.getProjectHealth(selectedProjectId),
        metricsAPI.getProgressMetrics(selectedProjectId),
        metricsAPI.getDeviationMetrics(selectedProjectId),
        metricsAPI.getForecast(selectedProjectId),
        metricsAPI.getDocumentationCompliance(selectedProjectId),
        metricsAPI.getTicketDistribution(selectedProjectId),
      ]);
      if (r[0].status === 'fulfilled') setHealth(r[0].value.data);
      if (r[1].status === 'fulfilled') setProgress(r[1].value.data);
      if (r[2].status === 'fulfilled') setDeviation(r[2].value.data);
      if (r[3].status === 'fulfilled') setForecast(r[3].value.data);
      if (r[4].status === 'fulfilled') setCompliance(r[4].value.data);
      if (r[5].status === 'fulfilled') setDistribution(r[5].value.data);
    } catch { /* */ } finally { setIsLoading(false); }
  }, [selectedProjectId]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    if (!isEmbedded && globalProjectId != null && globalProjectId !== selectedProjectId) {
      setSelectedProjectIdLocal(globalProjectId);
    }
  }, [globalProjectId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const sem = health ? SEMAPHORE[health.status] : null;

  const pieData = distribution ? [
    { name: PIE_LABELS[0], value: distribution.open },
    { name: PIE_LABELS[1], value: distribution.inProgress },
    { name: PIE_LABELS[2], value: distribution.blocked },
    { name: PIE_LABELS[3], value: distribution.inReview },
    { name: PIE_LABELS[4], value: distribution.done },
  ].filter((d) => d.value > 0) : [];

  if (isLoading && !health) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-300 dark:text-zinc-600">
        <Spinner size="lg" /><span className="text-sm mt-3">Cargando Dashboard SIPE...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Header (hidden when embedded) ── */}
      {!isEmbedded ? (
        <div className="flex items-center justify-between gap-4 flex-wrap py-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: '#6366f114' }}>
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Dashboard SIPE</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Sistema Integrado de Planificación y Ejecución — ESTATUS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ClientProjectFilters />
            <Button onClick={loadMetrics} variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />}>
            Actualizar
          </Button>
        </div>
      </div>
      ) : (
        <div className="flex items-center justify-end">
          <Button size="sm" onClick={loadMetrics} variant="secondary" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>Actualizar</Button>
        </div>
      )}

      {/* ── Semáforo de Salud (Bitrix-style banner) ── */}
      {health && sem && (
        <div
          className="rounded-lg border px-5 py-4 flex items-center gap-5 transition-all duration-300"
          style={{ backgroundColor: sem.bg, borderColor: sem.border }}
        >
          {/* Indicator circle */}
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            style={{ backgroundColor: sem.color }}
          >
            <Activity className="w-7 h-7 text-white" />
          </div>
          {/* Main text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg font-bold" style={{ color: sem.color }}>{sem.label}</span>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20">
                Desvío: {health.deviationPercentage.toFixed(1)}%
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{health.message}</p>
          </div>
          {/* KPI pills */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {forecast && (
              <>
                <div className="text-center px-3 py-1.5 rounded-lg bg-white/70 dark:bg-black/20">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">Velocidad</p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white tabular-nums">{forecast.velocity}</p>
                  <p className="text-[9px] text-zinc-400">tickets/sem</p>
                </div>
                {forecast.gapDays !== 0 && (
                  <div className="text-center px-3 py-1.5 rounded-lg bg-white/70 dark:bg-black/20">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-0.5">GAP</p>
                    <p className={`text-lg font-bold tabular-nums ${forecast.gapDays > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {forecast.gapDays > 0 ? '+' : ''}{forecast.gapDays}
                    </p>
                    <p className="text-[9px] text-zinc-400">días</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── 4 Cuadrantes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Q1: Avance de la Matriz */}
        <WidgetCard
          title="Avance de la Matriz"
          icon={<TrendingUp className="w-4 h-4" style={{ color: '#6366f1' }} />}
          accentColor="#6366f1"
          action={{ label: 'Ver Matriz', onClick: () => navigate('/matrix') }}
          badge={progress ? (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${progress.gap >= 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
              GAP: {progress.gap > 0 ? '+' : ''}{progress.gap.toFixed(1)}%
            </span>
          ) : undefined}
        >
          {progress && progress.byPartida.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200} minWidth={0}>
                <BarChart data={progress.byPartida.slice(0, 10)} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.5} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} tick={{ fill: '#94a3b8' }} />
                  <YAxis type="category" dataKey="code" width={45} fontSize={10} tick={{ fill: '#94a3b8', fontFamily: 'monospace' }} />
                  <Tooltip formatter={(v, n) => v != null ? [`${Number(v).toFixed(1)}%`, n === 'actual' ? 'Real' : 'Planificado'] : []} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="planned" fill="#c7d2fe" name="Planificado" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="actual" fill="#6366f1" name="Real" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-between mt-3 text-[11px] text-zinc-500">
                <span>Plan: <b className="text-zinc-700 dark:text-zinc-300">{progress.planned.toFixed(1)}%</b></span>
                <span>Real: <b className="text-zinc-700 dark:text-zinc-300">{progress.actual.toFixed(1)}%</b></span>
                <span>Ítems: <b className="text-zinc-700 dark:text-zinc-300">{progress.completedItems}/{progress.totalItems}</b></span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-300 dark:text-zinc-600">
              <Target className="w-8 h-8 mb-2" /><span className="text-xs">Sin datos de avance</span>
            </div>
          )}
        </WidgetCard>

        {/* Q2: Análisis de Desvío - Curva S */}
        <WidgetCard
          title="Análisis de Desvío — Curva S"
          icon={<AlertTriangle className="w-4 h-4" style={{ color: '#FFA900' }} />}
          accentColor="#FFA900"
          badge={deviation && deviation.gapDays !== 0 ? (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${deviation.gapDays > 0 ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'}`}>
              {deviation.gapDays > 0 ? '+' : ''}{deviation.gapDays} días
            </span>
          ) : undefined}
        >
          {deviation && deviation.sCurve.length > 0 ? (
            <ResponsiveContainer width="100%" height={220} minWidth={0}>
              <LineChart data={deviation.sCurve} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e2e8f0)" strokeOpacity={0.5} />
                <XAxis dataKey="date" fontSize={9} tick={{ fill: '#94a3b8' }} tickFormatter={(d) => d.slice(5)} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} tick={{ fill: '#94a3b8' }} />
                <Tooltip formatter={(v, n) => v != null ? [`${Number(v).toFixed(1)}%`, n === 'planned' ? 'Planificado' : 'Real'] : []} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <RLegend formatter={(v) => v === 'planned' ? 'Planificado' : 'Real'} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="planned" stroke="#c7d2fe" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-300 dark:text-zinc-600">
              <TrendingUp className="w-8 h-8 mb-2" /><span className="text-xs">Sin datos de desvío</span>
            </div>
          )}
        </WidgetCard>

        {/* Q3: Distribución de Tickets */}
        <WidgetCard
          title="Distribución de Tickets"
          icon={<Clock className="w-4 h-4" style={{ color: '#2FC6F6' }} />}
          accentColor="#2FC6F6"
          action={{ label: 'Ver Kanban', onClick: () => navigate('/kanban') }}
          badge={distribution && distribution.overdueCount > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {distribution.overdueCount} vencidos
            </span>
          ) : undefined}
        >
          {distribution && pieData.length > 0 ? (
            <div className="flex items-center gap-5">
              <div className="w-[150px] h-[150px] flex-shrink-0">
                <PieChart width={150} height={150}>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={68} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v ?? 0, n ?? '']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  </PieChart>
              </div>
              <div className="flex-1 space-y-2">
                {pieData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[12px] text-zinc-600 dark:text-zinc-400">{entry.name}</span>
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">{entry.value}</span>
                  </div>
                ))}
                <div className="pt-2 mt-1 border-t border-light-border dark:border-dark-border flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">Total</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">{distribution.total}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-300 dark:text-zinc-600">
              <Gauge className="w-8 h-8 mb-2" /><span className="text-xs">Sin tickets</span>
            </div>
          )}
        </WidgetCard>

        {/* Q4: Compliance Documental */}
        <WidgetCard
          title="Compliance Documental"
          icon={<FileCheck2 className="w-4 h-4" style={{ color: '#59C74C' }} />}
          accentColor="#59C74C"
        >
          {compliance ? (
            <>
              <div className="flex items-center gap-6 mb-4">
                {/* Circular ring */}
                <div className="relative w-24 h-24 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--color-border, #e2e8f0)" strokeWidth="2.5" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5" strokeLinecap="round"
                      stroke={compliance.percentage >= 80 ? '#59C74C' : compliance.percentage >= 50 ? '#FFA900' : '#FF5752'}
                      strokeDasharray={`${compliance.percentage} ${100 - compliance.percentage}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-zinc-900 dark:text-white tabular-nums">{compliance.percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="text-2xl font-bold text-zinc-900 dark:text-white">{compliance.documentedItems}</span>
                    <span className="text-zinc-400 mx-1">/</span>
                    <span>{compliance.totalItems}</span>
                    <span className="text-zinc-400 ml-1">ítems</span>
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">Archivos y criterios verificados</p>
                </div>
              </div>
              {/* Items list */}
              <div className="space-y-1 max-h-[120px] overflow-y-auto scrollbar-thin">
                {compliance.byItem.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-[11px] py-1 px-2 rounded hover:bg-light-hover dark:hover:bg-dark-hover transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.hasDocumentation ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                      <span className="text-zinc-400 font-mono tabular-nums flex-shrink-0">{item.code}</span>
                      <span className="text-zinc-700 dark:text-zinc-300 truncate">{item.title}</span>
                    </div>
                    <span className="text-zinc-400 flex-shrink-0 ml-2 tabular-nums">{item.attachmentCount} arch.</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-zinc-300 dark:text-zinc-600">
              <FileCheck2 className="w-8 h-8 mb-2" /><span className="text-xs">Sin datos de compliance</span>
            </div>
          )}
        </WidgetCard>
      </div>

      {/* ── Tabla resumen de indicadores (Bitrix24 data grid style) ── */}
      {progress && forecast && (
        <div className="bg-white dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-[3px] bg-primary" />
          <div className="px-5 py-3.5 border-b border-light-border dark:border-dark-border flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: '#6366f114' }}>
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Resumen de Indicadores</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-light-border dark:border-dark-border bg-zinc-50/50 dark:bg-dark-surface">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Métrica</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-28">Valor</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-28">Estado</th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: 'Cumplimiento de Matriz',
                  value: `${progress.actual.toFixed(1)}%`,
                  ok: progress.actual >= progress.planned,
                  statusLabel: progress.actual >= progress.planned ? 'En Plan' : 'Bajo Plan',
                  action: progress.actual >= progress.planned ? 'Continuar ejecución.' : 'Revisar ítems retrasados.',
                },
                {
                  label: 'Desvío de Cronograma',
                  value: `${forecast.gapDays > 0 ? '+' : ''}${forecast.gapDays} días`,
                  ok: Math.abs(forecast.gapDays) <= 5,
                  statusLabel: Math.abs(forecast.gapDays) <= 5 ? 'OK' : forecast.gapDays <= 15 ? 'Precaución' : 'Crítico',
                  action: forecast.gapDays > 5 ? 'Revisar tickets bloqueados en ruta crítica.' : 'Sin acción requerida.',
                },
                ...(distribution ? [{
                  label: 'Tickets en Validación',
                  value: `${distribution.inReview}`,
                  ok: distribution.inReview <= 10,
                  statusLabel: distribution.inReview > 10 ? 'Alerta' : 'Normal',
                  action: distribution.inReview > 10 ? 'Supervisor saturado; requiere apoyo.' : 'Flujo normal.',
                }] : []),
                ...(compliance ? [{
                  label: 'Documentación',
                  value: `${compliance.percentage.toFixed(0)}%`,
                  ok: compliance.percentage >= 80,
                  statusLabel: compliance.percentage >= 80 ? 'OK' : 'Incompleto',
                  action: compliance.percentage < 80 ? 'Cargar documentación pendiente.' : 'Dentro del margen.',
                }] : []),
              ].map((row, idx) => (
                <tr key={idx} className="border-b border-light-border/50 dark:border-dark-border/50 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors">
                  <td className="px-5 py-3 text-sm text-zinc-900 dark:text-white font-medium">{row.label}</td>
                  <td className="px-5 py-3 text-sm font-mono font-bold text-zinc-900 dark:text-white tabular-nums">{row.value}</td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: row.ok ? 'rgba(89,199,76,0.12)' : 'rgba(255,87,82,0.12)',
                        color: row.ok ? '#59C74C' : '#FF5752',
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: row.ok ? '#59C74C' : '#FF5752' }} />
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-zinc-500 dark:text-zinc-400">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SipeDashboard;
