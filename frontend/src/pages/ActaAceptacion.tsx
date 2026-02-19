import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { deliverablesAPI, matrixAPI } from '../services/api';
import type { DeliverableEntry, DeliverablesSummary, MatrixItem } from '../types';
import { Printer, FileCheck, ChevronDown, FolderKanban, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
};

const ActaAceptacion: React.FC = () => {
  const { projects, selectedProject } = useProject();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(selectedProject?.id || null);
  const [entries, setEntries] = useState<DeliverableEntry[]>([]);
  const [allMatrixItems, setAllMatrixItems] = useState<MatrixItem[]>([]);
  const [summary, setSummary] = useState<DeliverablesSummary | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedProject?.id && !selectedProjectId) setSelectedProjectId(selectedProject.id);
  }, [selectedProject, selectedProjectId]);

  const handleProjectChange = (id: number | null) => {
    setSelectedProjectId(id);
    setEntries([]);
    setAllMatrixItems([]);
    setSummary(null);
    setSelectedEntryId(null);
  };

  const loadData = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const [entriesRes, summaryRes, matrixRes] = await Promise.all([
        deliverablesAPI.getByProject(selectedProjectId),
        deliverablesAPI.getSummary(selectedProjectId),
        matrixAPI.getProjectTreeFlat(selectedProjectId),
      ]);
      setEntries(entriesRes.data);
      setSummary(summaryRes.data);
      const flat: MatrixItem[] = matrixRes.data;
      setAllMatrixItems(flat.filter((mi) => mi.isDeliverable && mi.deliverableEntryId != null));
      if (entriesRes.data.length > 0) {
        setSelectedEntryId(entriesRes.data[0].id);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedEntry = entries.find((e) => e.id === selectedEntryId) ?? null;
  const entryMatrixItems = allMatrixItems.filter(
    (mi) => mi.deliverableEntryId != null && Number(mi.deliverableEntryId) === selectedEntryId
  );

  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const projectName = summary?.projectName ?? currentProject?.name ?? '—';
  const companyLogoUrl = summary?.companyLogoUrl ? `${API_URL}${summary.companyLogoUrl}` : null;
  const clientLogoUrl = summary?.clientLogoUrl ? `${API_URL}${summary.clientLogoUrl}` : null;

  const emptyState = !selectedProjectId
    ? { icon: <FolderKanban className="w-14 h-14" />, title: 'Selecciona un proyecto', sub: 'Elige un proyecto del listado para generar el Acta de Aceptación de Entregables.' }
    : !loading && !selectedEntry
      ? { icon: <FileCheck className="w-14 h-14" />, title: 'Selecciona un entregable', sub: 'Elige un entregable del proyecto para previsualizar el documento.' }
      : null;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-zinc-50/50 dark:bg-zinc-950/40">
      {/* ═══ TOP BAR ═══ */}
      <div className="print:hidden bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 sticky top-0 z-20">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Left: title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/10">
                <FileCheck className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[15px] font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">
                  Documento de Aceptación
                </h1>
                {selectedProjectId && (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                    {projectName}
                  </p>
                )}
              </div>
            </div>

            {/* Right: controls */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {/* Project */}
              <div className="relative">
                <select
                  value={selectedProjectId ?? ''}
                  onChange={(e) => handleProjectChange(e.target.value ? +e.target.value : null)}
                  className="appearance-none h-9 pl-3 pr-8 text-[13px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-colors cursor-pointer min-w-[180px]"
                >
                  <option value="">Proyecto...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>

              {/* Entry */}
              <div className="relative">
                <select
                  value={selectedEntryId ?? ''}
                  onChange={(e) => setSelectedEntryId(e.target.value ? +e.target.value : null)}
                  disabled={!selectedProjectId || entries.length === 0}
                  className="appearance-none h-9 pl-3 pr-8 text-[13px] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-w-[200px]"
                >
                  <option value="">Entregable...</option>
                  {entries.map((e) => (
                    <option key={e.id} value={e.id}>
                      #{e.entryNumber} – {e.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>

              <div className="w-px h-7 bg-zinc-200 dark:bg-zinc-700" />

              <button
                onClick={() => window.print()}
                disabled={!selectedEntry}
                className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold rounded-lg bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white shadow-sm shadow-sky-500/20 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT AREA ═══ */}
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin mb-3" />
            <p className="text-sm text-zinc-400">Cargando datos del proyecto...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && emptyState && (
          <div className="flex flex-col items-center justify-center py-28">
            <div className="p-5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 text-zinc-300 dark:text-zinc-600 mb-5">
              {emptyState.icon}
            </div>
            <h3 className="text-lg font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              {emptyState.title}
            </h3>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-sm text-center">
              {emptyState.sub}
            </p>
          </div>
        )}

        {/* ═══ DOCUMENT PREVIEW ═══ */}
        {!loading && selectedEntry && (
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-b from-zinc-200/50 to-transparent dark:from-zinc-800/30 rounded-2xl blur-sm -z-10" />

            <div
              ref={printRef}
              data-printable
              className="bg-white text-black rounded-xl border border-zinc-200/80 dark:border-zinc-700/50 shadow-lg shadow-zinc-200/50 dark:shadow-zinc-900/50 overflow-hidden print:shadow-none print:border-0 print:rounded-none"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              <div className="px-14 py-12 print:px-8 print:py-8">

                {/* ══════════ ENCABEZADO ══════════ */}
                <table className="w-full border-collapse mb-10" style={{ tableLayout: 'fixed', border: '1.5px solid black' }}>
                  <tbody>
                    {/* Fila 1: logos + nombre proyecto + fecha */}
                    <tr>
                      <td style={{ border: '1.5px solid black', width: '16%' }} className="p-3 text-center align-middle" rowSpan={2}>
                        {companyLogoUrl ? (
                          <img src={companyLogoUrl} alt="Logo Proveedor" className="max-h-14 mx-auto object-contain" />
                        ) : (
                          <span className="text-[10px] text-gray-400 leading-tight block">[Logo del<br />Proveedor]</span>
                        )}
                      </td>
                      <td style={{ border: '1.5px solid black' }} className="p-2 text-center align-middle font-bold text-[14px]" colSpan={2}>
                        {projectName}
                      </td>
                      <td style={{ border: '1.5px solid black', width: '20%' }} className="p-2 text-center align-middle text-[12px]">
                        Fecha:<br />
                        <strong>{formatDate(selectedEntry.actualDeliveryDate ?? selectedEntry.plannedDeliveryDate)}</strong>
                      </td>
                      <td style={{ border: '1.5px solid black', width: '16%' }} className="p-3 text-center align-middle" rowSpan={2}>
                        {clientLogoUrl ? (
                          <img src={clientLogoUrl} alt="Logo Cliente" className="max-h-14 mx-auto object-contain" />
                        ) : (
                          <span className="text-[10px] text-gray-400 leading-tight block">[Logo del<br />Cliente]</span>
                        )}
                      </td>
                    </tr>
                    {/* Fila 2: titulo acta + pagina */}
                    <tr>
                      <td style={{ border: '1.5px solid black' }} className="p-2 text-center align-middle" colSpan={2}>
                        <strong className="text-[13px]">ACTA ACEPTACI&Oacute;N DE<br />ENTREGABLES</strong>
                        <br />
                        <span className="text-[12px]">No. {selectedEntry.entryNumber}</span>
                      </td>
                      <td style={{ border: '1.5px solid black' }} className="p-2 text-center align-middle text-[12px]">
                        P&aacute;gina <strong>1</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* ══════════ OBJETIVOS ══════════ */}
                <div className="mb-8">
                  <div className="border border-black inline-block mb-3" style={{ backgroundColor: '#4dd0e1' }}>
                    <span className="px-4 py-1.5 text-[12px] font-bold text-white tracking-wider block">OBJETIVOS</span>
                  </div>
                  <div className="border border-black p-4">
                    <ol className="list-decimal ml-6 text-[12.5px] leading-relaxed">
                      <li className="text-justify">
                        Aceptar formalmente los entregables de <strong>{selectedEntry.name}</strong> del Proyecto <strong>{projectName}</strong>{' '}
                        <strong>{selectedEntry.reviewInstanceName || ''}</strong>
                      </li>
                    </ol>
                  </div>
                </div>

                {/* ══════════ TEMAS TRATADOS ══════════ */}
                <div className="mb-8">
                  <div className="border border-black inline-block mb-3" style={{ backgroundColor: '#4dd0e1' }}>
                    <span className="px-4 py-1.5 text-[12px] font-bold text-white tracking-wider block">TEMAS TRATADOS</span>
                  </div>
                  <div className="border border-black p-4">
                    <ol className="list-decimal ml-6 text-[12.5px] leading-relaxed mb-5">
                      <li className="text-justify">
                        Este documento indica que los siguientes <u>entregables</u> han sido recibidos, aprobados y aceptados.
                      </li>
                    </ol>

                    {/* Tabla de items */}
                    <table className="w-full border-collapse text-[12px]" style={{ border: '1.5px solid black' }}>
                      <thead>
                        <tr>
                          <th style={{ border: '1.5px solid black', width: '15%' }} className="p-2 text-center font-bold">&Iacute;tem</th>
                          <th style={{ border: '1.5px solid black', width: '33%' }} className="p-2 text-center font-bold">Entregable</th>
                          <th style={{ border: '1.5px solid black', width: '26%' }} className="p-2 text-center font-bold">Responsable que recibe el documento</th>
                          <th style={{ border: '1.5px solid black', width: '26%' }} className="p-2 text-center font-bold">Fecha de entrega</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entryMatrixItems.length > 0 ? (
                          entryMatrixItems.map((mi) => (
                            <tr key={mi.id}>
                              <td style={{ border: '1.5px solid black' }} className="p-2 text-center">{mi.code}</td>
                              <td style={{ border: '1.5px solid black' }} className="p-2">{mi.title}</td>
                              <td style={{ border: '1.5px solid black' }} className="p-2 text-center">{selectedEntry.approvalInstanceName || '—'}</td>
                              <td style={{ border: '1.5px solid black' }} className="p-2 text-center">{formatDate(selectedEntry.actualDeliveryDate)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td style={{ border: '1.5px solid black' }} className="p-2 text-center">{selectedEntry.entryNumber}</td>
                            <td style={{ border: '1.5px solid black' }} className="p-2">{selectedEntry.name}</td>
                            <td style={{ border: '1.5px solid black' }} className="p-2 text-center">{selectedEntry.approvalInstanceName || '—'}</td>
                            <td style={{ border: '1.5px solid black' }} className="p-2 text-center">{formatDate(selectedEntry.actualDeliveryDate)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ══════════ CUERPO ══════════ */}
                <div className="text-[12.5px] leading-relaxed mb-8 text-justify">
                  <p className="mb-4">
                    En reuni&oacute;n Efectuada se realiz&oacute; presentaci&oacute;n del entregable <u><strong>{selectedEntry.name}</strong></u>, el cual
                    constituye el entregable n&uacute;mero <u><strong>{selectedEntry.entryNumber}</strong></u> de la matriz
                    de compromiso aprobada.
                  </p>
                  <p>
                    La firma y aceptaci&oacute;n de este documento constituye el medio de aprobaci&oacute;n para la
                    emisi&oacute;n y pago de la factura correspondiente seg&uacute;n cronograma de pago definida en el proyecto.
                  </p>
                </div>

                {/* ══════════ FIRMAS ══════════ */}
                <table className="w-full border-collapse text-[12px] mt-12 mb-10" style={{ border: '1.5px solid black' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1.5px solid black', backgroundColor: '#fce4ec', width: '35%' }} className="p-3 font-bold text-center">
                        {selectedEntry.elaborationResponsibleOrg || '[Nombre del Proveedor]'}
                      </td>
                      <td style={{ border: '1.5px solid black' }} className="p-3">
                        {selectedEntry.elaborationResponsibleName || '[Nombre de quien realiza el entregable]'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1.5px solid black', backgroundColor: '#fce4ec' }} className="p-3 font-bold text-center">
                        {selectedEntry.reviewInstanceName || '[Nombre del cliente]'}
                      </td>
                      <td style={{ border: '1.5px solid black' }} className="p-3">
                        {selectedEntry.approvalInstanceName || '[Nombre de quien aprueba el entregable]'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* ══════════ PIE ══════════ */}
                <div className="mt-16 pt-4 text-center text-[10.5px]" style={{ borderTop: '1.5px solid black', color: '#e91e63' }}>
                  {selectedEntry.elaborationResponsibleOrg
                    ? `[Datos de la empresa del Proveedor: ${selectedEntry.elaborationResponsibleOrg}, RNC, Dirección, Email]`
                    : '[Datos de la empresa del Proveedor: nombre, RNC, Dirección, Email]'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          [data-printable], [data-printable] * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          [data-printable] { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 15mm; size: letter; }
        }
      `}</style>
    </div>
  );
};

export default ActaAceptacion;
