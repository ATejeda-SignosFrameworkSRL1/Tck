import React from 'react';
import { Paperclip, Eye, Download, Trash2 } from 'lucide-react';
import { Button } from './Button';

export interface AttachmentCardProps {
  /** Nombre del archivo a mostrar */
  fileName: string;
  /** Tamaño en bytes (opcional). Se muestra como "X.X KB" o "X.X MB" */
  sizeBytes?: number;
  /** Nombre del usuario que subió (opcional). Se muestra como "· Nombre" */
  uploadedByName?: string;
  /** Al hacer clic en Ver (abrir/previsualizar) */
  onView: () => void;
  /** Al hacer clic en Descargar */
  onDownload: () => void;
  /** Si está en proceso la descarga (deshabilita botón Descargar) */
  isDownloading?: boolean;
  /** Si se pasa, se muestra botón eliminar (p. ej. para gestores) */
  onDelete?: () => void;
  /** Clase adicional del contenedor */
  className?: string;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const AttachmentCard: React.FC<AttachmentCardProps> = ({
  fileName,
  sizeBytes,
  uploadedByName,
  onView,
  onDownload,
  isDownloading = false,
  onDelete,
  className = '',
}) => {
  const meta = [
    sizeBytes != null && formatSize(sizeBytes),
    uploadedByName,
  ].filter(Boolean).join(' · ');

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-card ${className}`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
        <Paperclip className="w-5 h-5 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
          {fileName}
        </p>
        {meta && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {meta}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={onView}
          leftIcon={<Eye className="w-4 h-4" />}
        >
          Ver
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onDownload}
          disabled={isDownloading}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Descargar
        </Button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
