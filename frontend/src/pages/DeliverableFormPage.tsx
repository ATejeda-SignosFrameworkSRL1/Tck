import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Package, Save, ArrowLeft, Upload, X,
} from 'lucide-react';
import { deliverablesAPI } from '../services/api';
import { Button, Spinner } from '../components/ui';
import type { DeliverableEntry } from '../types';

const STATUS_OPTIONS = [
  { value: 'sin_iniciar', label: 'Sin Iniciar' },
  { value: 'avanzado', label: 'Avanzado' },
  { value: 'terminado', label: 'Terminado' },
];

const INPUT_CLS = 'w-full text-sm border border-light-border dark:border-dark-border rounded-lg px-3 py-2.5 bg-light-bg dark:bg-dark-surface text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors';
const LABEL_CLS = 'block text-[11px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5';

const emptyForm = {
  projectId: 0 as number,
  name: '',
  description: '',
  phase: 1,
  responsibleFront: '',
  plannedDeliveryDate: '',
  actualDeliveryDate: '',
  status: 'sin_iniciar' as string,
  progressPercentage: 0,
  elaborationResponsibleName: '',
  elaborationResponsibleOrg: '',
  acceptanceCriteria: '',
  reviewInstanceName: '',
  approvalInstanceName: '',
  baselinePhotoBefore: '',
  baselinePhotoAfter: '',
  imageUploadIdBefore: null as number | null,
  imageUploadIdAfter: null as number | null,
  hasPhotoBefore: false,
  hasPhotoAfter: false,
};

/* Component to show image: uploadId (preview), path (legacy), or entryId+kind (DB) */
const DeliverableImage: React.FC<{
  path?: string | null;
  entryId?: number;
  uploadId?: number | null;
  kind: 'before' | 'after';
  alt: string;
  onClear?: () => void;
}> = ({ path, entryId, uploadId, kind, alt, onClear }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  const hasSource = path || entryId != null || uploadId != null;
  useEffect(() => {
    if (!hasSource) {
      setUrl(null);
      setLoadFailed(false);
      return;
    }
    setLoadFailed(false);
    let cancelled = false;
    const load = uploadId != null
      ? deliverablesAPI.getUploadImageBlobUrl(uploadId)
      : path
        ? deliverablesAPI.getImageBlobUrl(path)
        : entryId != null
          ? deliverablesAPI.getEntryPhotoBlobUrl(entryId, kind)
          : Promise.reject(new Error('No source'));
    load
      .then((u) => {
        if (cancelled) {
          URL.revokeObjectURL(u);
          return;
        }
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = u;
        setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
        setUrl(null);
      });
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setUrl(null);
    };
  }, [path, entryId, uploadId, kind, hasSource]);
  if (!hasSource) return null;
  if (loadFailed && !path && uploadId == null && entryId != null) return null;
  if (!url) return <div className="w-24 h-24 rounded border border-light-border dark:border-dark-border flex items-center justify-center text-zinc-400 text-xs">Cargando...</div>;
  return (
    <div className="relative inline-block">
      <img src={url} alt={alt} className="w-24 h-24 object-cover rounded border border-light-border dark:border-dark-border" />
      {onClear && (
        <button type="button" onClick={onClear} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600">
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default function DeliverableFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const projectId = projectIdParam ? +projectIdParam : 0;

  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [previewBefore, setPreviewBefore] = useState<string | null>(null);
  const [previewAfter, setPreviewAfter] = useState<string | null>(null);
  const fileBeforeRef = useRef<HTMLInputElement>(null);
  const fileAfterRef = useRef<HTMLInputElement>(null);
  const previewBeforeRef = useRef<string | null>(null);
  const previewAfterRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewBeforeRef.current) URL.revokeObjectURL(previewBeforeRef.current);
    if (previewAfterRef.current) URL.revokeObjectURL(previewAfterRef.current);
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    if (previewBeforeRef.current) {
      URL.revokeObjectURL(previewBeforeRef.current);
      previewBeforeRef.current = null;
    }
    if (previewAfterRef.current) {
      URL.revokeObjectURL(previewAfterRef.current);
      previewAfterRef.current = null;
    }
    setPreviewBefore(null);
    setPreviewAfter(null);
    deliverablesAPI.getOne(+id)
      .then((res) => {
        const e: DeliverableEntry = res.data;
        setFormData({
          ...emptyForm,
          projectId: e.projectId,
          name: e.name,
          description: e.description || '',
          phase: e.phase,
          responsibleFront: e.responsibleFront || '',
          plannedDeliveryDate: e.plannedDeliveryDate ? String(e.plannedDeliveryDate).slice(0, 10) : '',
          actualDeliveryDate: e.actualDeliveryDate ? String(e.actualDeliveryDate).slice(0, 10) : '',
          status: e.status,
          progressPercentage: Number(e.progressPercentage) || 0,
          elaborationResponsibleName: e.elaborationResponsibleName || '',
          elaborationResponsibleOrg: e.elaborationResponsibleOrg || '',
          acceptanceCriteria: e.acceptanceCriteria || '',
          reviewInstanceName: e.reviewInstanceName || '',
          approvalInstanceName: e.approvalInstanceName || '',
          baselinePhotoBefore: e.baselinePhotoBefore || '',
          baselinePhotoAfter: e.baselinePhotoAfter || '',
          imageUploadIdBefore: null,
          imageUploadIdAfter: null,
          hasPhotoBefore: !!e.hasPhotoBefore,
          hasPhotoAfter: !!e.hasPhotoAfter,
        });
      })
      .catch(() => navigate('/deliverables'))
      .finally(() => setLoading(false));
  }, [isEdit, id, navigate]);

  const clearBefore = () => {
    if (previewBeforeRef.current) {
      URL.revokeObjectURL(previewBeforeRef.current);
      previewBeforeRef.current = null;
    }
    setPreviewBefore(null);
    setFormData((p) => ({ ...p, baselinePhotoBefore: '', imageUploadIdBefore: null }));
  };

  const clearAfter = () => {
    if (previewAfterRef.current) {
      URL.revokeObjectURL(previewAfterRef.current);
      previewAfterRef.current = null;
    }
    setPreviewAfter(null);
    setFormData((p) => ({ ...p, baselinePhotoAfter: '', imageUploadIdAfter: null }));
  };

  const handleFileBefore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name) || file.type.startsWith('image/');
    if (!allowed) { alert('Solo se permiten imágenes (PNG, JPG, SVG, etc.)'); return; }
    setUploadingBefore(true);
    deliverablesAPI.uploadImage(file)
      .then((res) => {
        if (previewBeforeRef.current) URL.revokeObjectURL(previewBeforeRef.current);
        const url = URL.createObjectURL(file);
        previewBeforeRef.current = url;
        setPreviewBefore(url);
        setFormData((prev) => ({ ...prev, baselinePhotoBefore: '', imageUploadIdBefore: res.data.id }));
      })
      .catch((err) => alert(err?.response?.data?.message || 'Error al subir imagen'))
      .finally(() => { setUploadingBefore(false); e.target.value = ''; });
  };

  const handleFileAfter = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name) || file.type.startsWith('image/');
    if (!allowed) { alert('Solo se permiten imágenes (PNG, JPG, SVG, etc.)'); return; }
    setUploadingAfter(true);
    deliverablesAPI.uploadImage(file)
      .then((res) => {
        if (previewAfterRef.current) URL.revokeObjectURL(previewAfterRef.current);
        const url = URL.createObjectURL(file);
        previewAfterRef.current = url;
        setPreviewAfter(url);
        setFormData((prev) => ({ ...prev, baselinePhotoAfter: '', imageUploadIdAfter: res.data.id }));
      })
      .catch((err) => alert(err?.response?.data?.message || 'Error al subir imagen'))
      .finally(() => { setUploadingAfter(false); e.target.value = ''; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = isEdit ? formData.projectId : projectId;
    if (!pid || !formData.name) return;
    setSaving(true);
    try {
      const { projectId: _pid, hasPhotoBefore: _hpb, hasPhotoAfter: _hpa, ...rest } = formData;
      const payload = {
        ...rest,
        plannedDeliveryDate: formData.plannedDeliveryDate || undefined,
        actualDeliveryDate: formData.actualDeliveryDate || undefined,
        progressPercentage: Number(formData.progressPercentage) || 0,
        phase: Number(formData.phase) || 1,
        baselinePhotoBefore: formData.baselinePhotoBefore || undefined,
        baselinePhotoAfter: formData.baselinePhotoAfter || undefined,
        imageUploadIdBefore: formData.imageUploadIdBefore ?? undefined,
        imageUploadIdAfter: formData.imageUploadIdAfter ?? undefined,
      };
      if (isEdit && id) {
        await deliverablesAPI.update(+id, payload);
      } else {
        await deliverablesAPI.create({ ...payload, projectId: pid });
      }
      navigate('/deliverables');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isEdit && !projectId) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg p-6">
        <p className="text-zinc-500">Falta projectId. Vuelve a Proyectos Entregables y crea desde un proyecto.</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/deliverables')}>Volver</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="secondary" onClick={() => navigate('/deliverables')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Volver
          </Button>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              {isEdit ? 'Editar Entregable' : 'Nuevo Entregable'}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border p-6 space-y-5">
          <div>
            <label className={LABEL_CLS}>Nombre Entregable *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del entregable..."
              className={INPUT_CLS}
              required
            />
          </div>

          <div>
            <label className={LABEL_CLS}>Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Descripción detallada..."
              className={INPUT_CLS}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL_CLS}>Fase</label>
              <input type="number" value={formData.phase} onChange={(e) => setFormData({ ...formData, phase: +e.target.value })} min={1} className={INPUT_CLS} />
            </div>
            <div className="col-span-2">
              <label className={LABEL_CLS}>Frente Responsable</label>
              <input type="text" value={formData.responsibleFront} onChange={(e) => setFormData({ ...formData, responsibleFront: e.target.value })} placeholder="Nombre del responsable..." className={INPUT_CLS} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL_CLS}>Fecha Programada</label>
              <input type="date" value={formData.plannedDeliveryDate} onChange={(e) => setFormData({ ...formData, plannedDeliveryDate: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Fecha Real</label>
              <input type="date" value={formData.actualDeliveryDate} onChange={(e) => setFormData({ ...formData, actualDeliveryDate: e.target.value })} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Estado</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={INPUT_CLS}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Avance (%)</label>
            <input type="number" value={formData.progressPercentage} onChange={(e) => setFormData({ ...formData, progressPercentage: +e.target.value })} min={0} max={100} className={INPUT_CLS} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Resp. Elaboración - Nombre</label>
              <input type="text" value={formData.elaborationResponsibleName} onChange={(e) => setFormData({ ...formData, elaborationResponsibleName: e.target.value })} placeholder="Nombre..." className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Resp. Elaboración - Organización</label>
              <input type="text" value={formData.elaborationResponsibleOrg} onChange={(e) => setFormData({ ...formData, elaborationResponsibleOrg: e.target.value })} placeholder="Organización..." className={INPUT_CLS} />
            </div>
          </div>

          <div>
            <label className={LABEL_CLS}>Criterios de Aceptación del Entregable</label>
            <textarea value={formData.acceptanceCriteria} onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })} rows={4} placeholder="• Criterio 1&#10;• Criterio 2&#10;• Criterio 3" className={INPUT_CLS} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Instancia de Revisión</label>
              <input type="text" value={formData.reviewInstanceName} onChange={(e) => setFormData({ ...formData, reviewInstanceName: e.target.value })} placeholder="Nombre de quien revisa..." className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Instancia de Aprobación</label>
              <input type="text" value={formData.approvalInstanceName} onChange={(e) => setFormData({ ...formData, approvalInstanceName: e.target.value })} placeholder="Nombre de quien aprueba..." className={INPUT_CLS} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Línea Base - Foto Antes</label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Subir imagen (PNG, JPG, SVG, etc.)</p>
              <input ref={fileBeforeRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml,image/svg" className="hidden" onChange={handleFileBefore} />
              <div className="flex items-center gap-3">
                {(previewBefore || formData.baselinePhotoBefore || formData.imageUploadIdBefore || formData.hasPhotoBefore) ? (
                  <>
                    <div className="relative inline-block">
                      {previewBefore ? (
                        <>
                          <img src={previewBefore} alt="Antes" className="w-24 h-24 object-cover rounded border border-light-border dark:border-dark-border" />
                          <button type="button" onClick={clearBefore} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <DeliverableImage path={formData.baselinePhotoBefore || undefined} entryId={formData.hasPhotoBefore && isEdit && id ? +id : undefined} uploadId={formData.imageUploadIdBefore} kind="before" alt="Antes" onClear={clearBefore} />
                      )}
                    </div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => fileBeforeRef.current?.click()} disabled={uploadingBefore}>
                      {uploadingBefore ? 'Subiendo...' : 'Cambiar'}
                    </Button>
                  </>
                ) : (
                  <button type="button" onClick={() => fileBeforeRef.current?.click()} disabled={uploadingBefore} className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 hover:bg-emerald-500/5 transition-colors">
                    <Upload className="w-6 h-6 text-zinc-400" />
                    <span className="text-[10px] text-zinc-500">Subir</span>
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Línea Base - Foto Después</label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Subir imagen (PNG, JPG, SVG, etc.)</p>
              <input ref={fileAfterRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml,image/svg" className="hidden" onChange={handleFileAfter} />
              <div className="flex items-center gap-3">
                {(previewAfter || formData.baselinePhotoAfter || formData.imageUploadIdAfter || formData.hasPhotoAfter) ? (
                  <>
                    <div className="relative inline-block">
                      {previewAfter ? (
                        <>
                          <img src={previewAfter} alt="Después" className="w-24 h-24 object-cover rounded border border-light-border dark:border-dark-border" />
                          <button type="button" onClick={clearAfter} className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500 text-white hover:bg-red-600">
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <DeliverableImage path={formData.baselinePhotoAfter || undefined} entryId={formData.hasPhotoAfter && isEdit && id ? +id : undefined} uploadId={formData.imageUploadIdAfter} kind="after" alt="Después" onClear={clearAfter} />
                      )}
                    </div>
                    <Button type="button" variant="secondary" size="sm" onClick={() => fileAfterRef.current?.click()} disabled={uploadingAfter}>
                      {uploadingAfter ? 'Subiendo...' : 'Cambiar'}
                    </Button>
                  </>
                ) : (
                  <button type="button" onClick={() => fileAfterRef.current?.click()} disabled={uploadingAfter} className="w-24 h-24 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex flex-col items-center justify-center gap-1 hover:border-emerald-500 hover:bg-emerald-500/5 transition-colors">
                    <Upload className="w-6 h-6 text-zinc-400" />
                    <span className="text-[10px] text-zinc-500">Subir</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
            <Button type="button" variant="secondary" onClick={() => navigate('/deliverables')}>Cancelar</Button>
            <Button type="submit" disabled={saving || !formData.name} leftIcon={<Save className="w-4 h-4" />}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Entregable'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
