import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Diamond, Calendar, GanttChart,
  ChevronsUpDown,
} from 'lucide-react';
import { ganttAPI, projectsAPI } from '../services/api';
import { useProject } from '../context/ProjectContext';
import { Spinner } from '../components/ui';
import { ClientProjectFilters } from '../components/layout/ClientProjectFilters';
import type { GanttData, GanttTask, Project } from '../types';

/* ═══════════════════ LAYOUT ═══════════════════ */
const DAY_W = 36;
const ROW_H = 44;
const BAR_H = 20;
const BAR_TOP = Math.floor((ROW_H - BAR_H) / 2);
const MONTH_H = 32;
const DAY_H = 26;
const HEADER_H = MONTH_H + DAY_H;
const LEFT_W = 340;

const DOW = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

const SC: Record<string, { color: string; label: string }> = {
  not_started: { color: '#cbd5e1', label: 'Sin Iniciar' },
  in_progress: { color: '#FFA900', label: 'En Progreso' },
  delayed:     { color: '#FF5752', label: 'Retrasado' },
  completed:   { color: '#59C74C', label: 'Completado' },
};

/* ═══════════════════ COMPONENT ═══════════════════ */
interface GanttViewProps {
  /** When provided, hides the header/project selector and uses this projectId */
  embeddedProjectId?: number | null;
}

const GanttView: React.FC<GanttViewProps> = ({ embeddedProjectId }) => {
  const { projectId: urlProjectId } = useParams();
  const { selectedProject, selectedProjectId: globalProjectId, setSelectedProjectId: setGlobalProjectId } = useProject();
  const isEmbedded = embeddedProjectId !== undefined;
  const projectId = isEmbedded ? embeddedProjectId : (urlProjectId ? +urlProjectId : globalProjectId ?? selectedProject?.id);

  const [ganttData, setGanttData] = useState<GanttData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectIdLocal] = useState<number | null>(projectId || null);

  const setSelectedProjectId = (id: number | null) => {
    setSelectedProjectIdLocal(id);
    if (!isEmbedded) setGlobalProjectId(id);
  };
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const tlRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [tip, setTip] = useState<{ task: GanttTask & { level: number }; x: number; y: number } | null>(null);

  // Sync when embeddedProjectId changes
  useEffect(() => { if (isEmbedded) setSelectedProjectId(embeddedProjectId ?? null); }, [isEmbedded, embeddedProjectId]);

  const loadProjects = useCallback(async () => { if (isEmbedded) return; try { setProjects((await projectsAPI.getAll()).data || []); } catch { /**/ } }, [isEmbedded]);
  const loadGantt = useCallback(async () => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    try { const r = await ganttAPI.getGanttData(selectedProjectId); setGanttData(r.data); setExpandedIds(new Set((r.data?.tasks || []).map((t: GanttTask) => t.id))); }
    catch { /**/ } finally { setIsLoading(false); }
  }, [selectedProjectId]);
  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadGantt(); }, [loadGantt]);

  useEffect(() => {
    if (!isEmbedded && globalProjectId != null && globalProjectId !== selectedProjectId) {
      setSelectedProjectIdLocal(globalProjectId);
    }
  }, [globalProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: number) => setExpandedIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ─ Visible tasks / range ─ */
  const { vis, range, days, todayOff } = useMemo(() => {
    const empty = { vis: [] as (GanttTask & { level: number })[], range: { s: new Date(), e: new Date() }, days: 0, todayOff: -1 };
    if (!ganttData?.tasks?.length) return empty;
    const tasks = ganttData.tasks;
    const ts = tasks.flatMap((t) => [t.plannedStart, t.plannedEnd, t.actualStart, t.actualEnd].filter(Boolean)).map((d) => new Date(d!).getTime());
    if (!ts.length) return empty;
    const pad = 14 * 864e5;
    const s = new Date(Math.min(...ts) - pad); s.setHours(0, 0, 0, 0);
    const e = new Date(Math.max(...ts) + pad); e.setHours(0, 0, 0, 0);
    const d = Math.ceil((e.getTime() - s.getTime()) / 864e5);
    const to = Math.floor((Date.now() - s.getTime()) / 864e5);
    const m = new Map<number, GanttTask & { ch: number[]; level: number }>();
    tasks.forEach((t) => m.set(t.id, { ...t, ch: [], level: 0 }));
    tasks.forEach((t) => { if (t.parentId && m.has(t.parentId)) m.get(t.parentId)!.ch.push(t.id); });
    const v: (GanttTask & { level: number })[] = [];
    const walk = (id: number, lv: number) => { const t = m.get(id); if (!t) return; t.level = lv; v.push(t); if (expandedIds.has(id)) t.ch.forEach((c) => walk(c, lv + 1)); };
    tasks.filter((t) => !t.parentId || !m.has(t.parentId)).forEach((r) => walk(r.id, 0));
    return { vis: v, range: { s, e }, days: d, todayOff: to };
  }, [ganttData, expandedIds]);

  /* ─ Month headers ─ */
  const months = useMemo(() => {
    if (!days) return [];
    const h: { label: string; off: number; w: number }[] = [];
    let c = new Date(range.s.getFullYear(), range.s.getMonth(), 1);
    while (c <= range.e) {
      const a = Math.max(0, Math.ceil((c.getTime() - range.s.getTime()) / 864e5));
      const nx = new Date(c.getFullYear(), c.getMonth() + 1, 1);
      const b = Math.min(days, Math.ceil((nx.getTime() - range.s.getTime()) / 864e5));
      const w = (b - a) * DAY_W;
      // Use short or long name depending on available space
      const longName = c.toLocaleDateString('es', { month: 'long', year: 'numeric' });
      const shortName = c.toLocaleDateString('es', { month: 'short', year: 'numeric' });
      const label = w > 180 ? longName.charAt(0).toUpperCase() + longName.slice(1) : shortName.charAt(0).toUpperCase() + shortName.slice(1);
      h.push({ label, off: a * DAY_W, w });
      c = nx;
    }
    return h;
  }, [range, days]);

  /* ─ Day cells ─ */
  const dayCells = useMemo(() => {
    if (!days) return [];
    const c: { day: number; dow: number; isWe: boolean; off: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(range.s.getTime() + i * 864e5);
      const w = d.getDay();
      c.push({ day: d.getDate(), dow: w, isWe: w === 0 || w === 6, off: i * DAY_W });
    }
    return c;
  }, [range, days]);

  const bPos = (s: string | null, e: string | null) => {
    if (!s || !e) return { left: 0, width: 0 };
    const sd = Math.ceil((new Date(s).getTime() - range.s.getTime()) / 864e5);
    const dur = Math.max(1, Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 864e5));
    return { left: sd * DAY_W, width: dur * DAY_W };
  };
  const isCrit = (id: number) => ganttData?.criticalPath?.includes(id) ?? false;
  const fDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  void ((d: string | null) => d ? new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short' }) : '—');

  const onMove = (e: React.MouseEvent) => { if (!tlRef.current) return; const x = e.clientX - tlRef.current.getBoundingClientRect().left + tlRef.current.scrollLeft; const i = Math.floor(x / DAY_W); setHoverIdx(i >= 0 && i < days ? i : null); };
  const onLeave = () => { setHoverIdx(null); setTip(null); };

  const expandAll = () => { if (ganttData) setExpandedIds(new Set(ganttData.tasks.map((t) => t.id))); };
  const collapseAll = () => setExpandedIds(new Set());
  const allExp = ganttData ? expandedIds.size >= ganttData.tasks.length : false;

  const totalW = days * DAY_W;
  const bodyH = vis.length * ROW_H;

  return (
    <div className="space-y-4">

      {/* ── Header (hidden when embedded) ── */}
      {!isEmbedded && (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFA90014' }}><GanttChart className="w-5 h-5 text-amber-500" /></div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Diagrama de Gantt</h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Planificación temporal — CUÁNDO</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ClientProjectFilters
                selectClassName="text-sm border border-light-border dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-card text-zinc-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-w-[180px]"
              />
              {vis.length > 0 && (
                <button onClick={allExp ? collapseAll : expandAll} className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
                  <ChevronsUpDown className="w-3.5 h-3.5" /> {allExp ? 'Colapsar' : 'Expandir'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Expand/collapse for embedded mode */}
      {isEmbedded && vis.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-500 dark:text-zinc-400">
            {[
              { label: 'Progreso', el: <span className="w-4 h-2 rounded-sm bg-gradient-to-r from-green-400 to-green-500" /> },
              { label: 'Ruta Crítica', el: <span className="w-4 h-2 rounded-sm bg-red-500" /> },
              { label: 'Hito', el: <Diamond className="w-3 h-3 text-amber-500 fill-amber-200" /> },
              { label: 'Hoy', el: <span className="w-3 h-0.5 border-t-2 border-dashed border-orange-500" /> },
              { label: 'Baseline', el: <span className="w-4 h-[3px] rounded-full bg-indigo-400/40" /> },
              { label: 'Real', el: <span className="w-4 h-[3px] rounded-full bg-emerald-500" /> },
            ].map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5 bg-white dark:bg-dark-card rounded-md border border-light-border dark:border-dark-border px-2.5 py-1">{l.el} {l.label}</span>
            ))}
          </div>
          <button onClick={allExp ? collapseAll : expandAll} className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
            <ChevronsUpDown className="w-3.5 h-3.5" /> {allExp ? 'Colapsar' : 'Expandir'}
          </button>
        </div>
      )}

      {/* ── Legend (standalone mode) ── */}
      {!isEmbedded && (
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-500 dark:text-zinc-400">
          {[
            { label: 'Progreso', el: <span className="w-4 h-2 rounded-sm bg-gradient-to-r from-green-400 to-green-500" /> },
            { label: 'Ruta Crítica', el: <span className="w-4 h-2 rounded-sm bg-red-500" /> },
            { label: 'Hito', el: <Diamond className="w-3 h-3 text-amber-500 fill-amber-200" /> },
            { label: 'Hoy', el: <span className="w-3 h-0.5 border-t-2 border-dashed border-orange-500" /> },
            { label: 'Baseline', el: <span className="w-4 h-[3px] rounded-full bg-indigo-400/40" /> },
            { label: 'Real', el: <span className="w-4 h-[3px] rounded-full bg-emerald-500" /> },
          ].map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 bg-white dark:bg-dark-card rounded-md border border-light-border dark:border-dark-border px-2.5 py-1">{l.el} {l.label}</span>
          ))}
        </div>
      )}

      {isLoading && <div className="flex flex-col items-center justify-center py-20 text-zinc-300 dark:text-zinc-600"><Spinner size="lg" /><span className="text-sm mt-3">Cargando Gantt...</span></div>}

      {/* ═══════════ GANTT ═══════════ */}
      {selectedProjectId && vis.length > 0 && !isLoading && (
        <div className="bg-white dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-[3px] rounded-t-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />

          <div className="flex">

            {/* ═══ LEFT PANEL ═══ */}
            <div className="border-r border-light-border dark:border-dark-border flex-shrink-0 select-none" style={{ width: `${LEFT_W}px` }}>
              {/* Left header */}
              <div className="border-b border-light-border dark:border-dark-border bg-zinc-50 dark:bg-dark-surface flex items-center px-4" style={{ height: `${HEADER_H}px` }}>
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Tarea</span>
              </div>
              {/* Rows */}
              {vis.map((task) => {
                const hasKids = ganttData?.tasks.some((t) => t.parentId === task.id) ?? false;
                const crit = isCrit(task.id);
                const s = SC[task.status] || SC.not_started;
                return (
                  <div key={task.id} className="border-b border-light-border/40 dark:border-dark-border/40 flex items-center hover:bg-amber-50/30 dark:hover:bg-amber-900/5 transition-colors group" style={{ height: `${ROW_H}px`, paddingLeft: `${task.level * 18 + 12}px` }}>
                    {hasKids ? (
                      <button onClick={() => toggle(task.id)} className="p-0.5 mr-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700">
                        {expandedIds.has(task.id) ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                      </button>
                    ) : <span className="w-5 mr-1" />}
                    <span className="w-2 h-2 rounded-full flex-shrink-0 mr-2" style={{ backgroundColor: s.color }} />
                    {task.isMilestone && <Diamond className="w-3.5 h-3.5 text-amber-500 mr-1 flex-shrink-0" />}
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-zinc-400 flex-shrink-0">{task.code}</span>
                        {crit && <span className="text-[7px] px-1 py-px rounded bg-red-500/10 text-red-500 font-bold leading-none">RC</span>}
                      </div>
                      <p className="text-[12px] text-zinc-800 dark:text-white font-medium truncate leading-tight" title={task.title}>{task.title}</p>
                    </div>
                    {task.progress > 0 && <span className="text-[10px] font-bold tabular-nums mr-2 flex-shrink-0" style={{ color: s.color }}>{task.progress.toFixed(0)}%</span>}
                  </div>
                );
              })}
            </div>

            {/* ═══ RIGHT PANEL: TIMELINE ═══ */}
            <div ref={tlRef} className="flex-1 overflow-x-auto" onMouseMove={onMove} onMouseLeave={onLeave}>
              <div style={{ width: `${totalW}px`, minWidth: '100%' }}>

                {/* Month row */}
                <div className="relative bg-zinc-50 dark:bg-dark-surface border-b border-light-border/60 dark:border-dark-border/60" style={{ height: `${MONTH_H}px` }}>
                  {months.map((m, i) => (
                    <div key={i} className="absolute top-0 h-full flex items-center border-r border-light-border/50 dark:border-dark-border/50 overflow-hidden" style={{ left: `${m.off}px`, width: `${m.w}px` }}>
                      <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 px-3 truncate">{m.label}</span>
                    </div>
                  ))}
                </div>

                {/* Day row */}
                <div className="relative flex border-b border-light-border dark:border-dark-border" style={{ height: `${DAY_H}px` }}>
                  {dayCells.map((c, i) => {
                    const hov = hoverIdx === i;
                    const today = i === todayOff;
                    return (
                      <div key={i} className={`flex items-center justify-center flex-shrink-0 border-r ${c.isWe ? 'bg-red-50/60 dark:bg-red-900/5 border-red-100/40 dark:border-red-900/10' : 'bg-white dark:bg-dark-card border-light-border/20 dark:border-dark-border/20'} ${hov ? '!bg-amber-100 dark:!bg-amber-900/15' : ''} ${today ? '!bg-orange-50 dark:!bg-orange-900/10' : ''}`} style={{ width: `${DAY_W}px` }}>
                        <div className="text-center leading-none">
                          <div className={`text-[9px] ${c.isWe ? 'text-red-400 font-semibold' : 'text-zinc-400'} ${hov ? '!text-amber-600 !font-bold' : ''} ${today ? '!text-orange-600 !font-bold' : ''}`}>{DOW[c.dow]}</div>
                          <div className={`text-[11px] font-semibold ${c.isWe ? 'text-red-400' : 'text-zinc-600 dark:text-zinc-300'} ${hov ? '!text-amber-600' : ''} ${today ? '!text-orange-600' : ''}`}>{c.day}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bars area */}
                <div className="relative" style={{ height: `${bodyH}px` }}>

                  {/* Weekend columns */}
                  {dayCells.filter((c) => c.isWe).map((c, i) => <div key={`w${i}`} className="absolute top-0 bg-red-50/30 dark:bg-red-900/3 pointer-events-none" style={{ left: `${c.off}px`, width: `${DAY_W}px`, height: `${bodyH}px` }} />)}

                  {/* Grid row lines */}
                  {vis.map((_, i) => <div key={`g${i}`} className="absolute w-full border-b border-light-border/25 dark:border-dark-border/15 pointer-events-none" style={{ top: `${(i + 1) * ROW_H}px` }} />)}

                  {/* Today line */}
                  {todayOff >= 0 && todayOff < days && (
                    <div className="absolute top-0 z-20 pointer-events-none" style={{ left: `${todayOff * DAY_W + DAY_W / 2}px`, height: `${bodyH}px` }}>
                      <div className="w-[2px] h-full" style={{ background: 'linear-gradient(180deg, #f97316, rgba(249,115,22,0.05))' }} />
                      <div className="absolute -top-[2px] -left-[5px] w-3 h-3 rounded-full bg-orange-500 border-2 border-white dark:border-dark-card shadow" />
                    </div>
                  )}

                  {/* Hover line */}
                  {hoverIdx !== null && <div className="absolute top-0 w-px bg-amber-400/40 pointer-events-none z-10" style={{ left: `${hoverIdx * DAY_W + DAY_W / 2}px`, height: `${bodyH}px` }} />}

                  {/* ── BARS ── */}
                  {vis.map((task, ri) => {
                    const pl = bPos(task.plannedStart, task.plannedEnd);
                    const crit = isCrit(task.id);
                    const color = crit ? '#FF5752' : (SC[task.status] || SC.not_started).color;
                    const top = ri * ROW_H;

                    if (task.isMilestone) {
                      return (
                        <div key={task.id} className="absolute" style={{ top: `${top}px`, height: `${ROW_H}px`, left: 0, right: 0 }}
                          onMouseEnter={(e) => setTip({ task, x: e.clientX, y: e.clientY })} onMouseLeave={() => setTip(null)}>
                          {pl.width > 0 && (
                            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer" style={{ left: `${pl.left + pl.width / 2}px` }}>
                              <Diamond className={`w-6 h-6 drop-shadow ${crit ? 'text-red-500 fill-red-100' : 'text-amber-500 fill-amber-100'}`} />
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div key={task.id} className="absolute" style={{ top: `${top}px`, height: `${ROW_H}px`, left: 0, right: 0 }}>
                        {pl.width > 0 && (
                          <div className="absolute cursor-pointer group/b" style={{ left: `${pl.left}px`, width: `${pl.width}px`, top: `${BAR_TOP}px`, height: `${BAR_H}px` }}
                            onMouseEnter={(e) => setTip({ task, x: e.clientX, y: e.clientY })}
                            onMouseMove={(e) => setTip((p) => p ? { ...p, x: e.clientX, y: e.clientY } : null)}
                            onMouseLeave={() => setTip(null)}>
                            {/* Bar shell */}
                            <div className="absolute inset-0 rounded-md transition-shadow group-hover/b:shadow-lg group-hover/b:ring-2 group-hover/b:ring-amber-400/30 group-hover/b:ring-offset-1" style={{ backgroundColor: `${color}15`, border: `1.5px solid ${color}40` }}>
                              <div className="h-full rounded-[5px]" style={{ width: `${Math.min(task.progress, 100)}%`, background: `linear-gradient(180deg, ${color}cc, ${color})` }} />
                            </div>
                            {/* Label — only if progress > 0 and bar wide enough */}
                            {task.progress > 0 && pl.width > 50 && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{task.progress.toFixed(0)}%</span>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Actual */}
                        {task.actualStart && (() => { const a = bPos(task.actualStart, task.actualEnd || new Date().toISOString()); return a.width > 0 ? <div className="absolute h-[3px] rounded-full pointer-events-none" style={{ left: `${a.left}px`, width: `${a.width}px`, top: `${BAR_TOP + BAR_H + 2}px`, background: 'linear-gradient(90deg,#34d399,#10b981)' }} /> : null; })()}
                        {/* Baseline */}
                        {task.baselineStart && task.baselineEnd && (() => { const b = bPos(task.baselineStart, task.baselineEnd); return b.width > 0 ? <div className="absolute h-[2px] rounded-full opacity-25 pointer-events-none" style={{ left: `${b.left}px`, width: `${b.width}px`, top: `${BAR_TOP - 3}px`, backgroundColor: '#6366f1' }} /> : null; })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Tooltip ═══ */}
      {tip && (
        <div className="fixed z-[9999] pointer-events-none" style={{ left: `${tip.x + 14}px`, top: `${tip.y - 8}px`, transform: 'translateY(-100%)' }}>
          <div className="bg-zinc-900 text-white rounded-xl shadow-2xl px-4 py-3 min-w-[250px] border border-zinc-700/80">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: (SC[tip.task.status] || SC.not_started).color }} />
              <p className="text-[13px] font-semibold truncate flex-1">{tip.task.code} — {tip.task.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <div><span className="text-zinc-400">Inicio Plan.</span><p className="text-white font-medium">{fDate(tip.task.plannedStart)}</p></div>
              <div><span className="text-zinc-400">Fin Plan.</span><p className="text-white font-medium">{fDate(tip.task.plannedEnd)}</p></div>
              {tip.task.actualStart && <div><span className="text-zinc-400">Inicio Real</span><p className="text-emerald-400 font-medium">{fDate(tip.task.actualStart)}</p></div>}
              {tip.task.actualEnd && <div><span className="text-zinc-400">Fin Real</span><p className="text-emerald-400 font-medium">{fDate(tip.task.actualEnd)}</p></div>}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${tip.task.progress}%`, backgroundColor: (SC[tip.task.status] || SC.not_started).color }} /></div>
              <span className="text-[11px] font-bold tabular-nums" style={{ color: (SC[tip.task.status] || SC.not_started).color }}>{tip.task.progress.toFixed(0)}%</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
              <span>{(SC[tip.task.status] || SC.not_started).label}</span>
              {tip.task.ticketCount > 0 && <span>{tip.task.ticketsClosed}/{tip.task.ticketCount} tickets</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Empty ── */}
      {selectedProjectId && vis.length === 0 && !isLoading && (
        <div className="bg-white dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="h-[3px] rounded-t-xl bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="flex flex-col items-center justify-center py-20 text-zinc-300 dark:text-zinc-600">
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-4"><Calendar className="w-6 h-6" /></div>
            <span className="text-sm font-semibold">Sin datos para el Gantt</span>
            <span className="text-xs mt-1 text-zinc-400">Crea ítems con fechas en la Matriz de Entregables</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttView;
