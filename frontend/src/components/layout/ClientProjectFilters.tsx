import React from 'react';
import { Building2, FolderKanban } from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

export interface ClientProjectFiltersProps {
  /** Clase del contenedor (flex) */
  className?: string;
  /** Clase aplicada a cada select (cliente y proyecto) */
  selectClassName?: string;
}

/**
 * Filtros de Cliente y Proyecto para páginas SIPE.
 * Se muestran en la barra de contenido de cada vista (Matriz, Entregables, Acta, Gantt, Métricas).
 */
export const ClientProjectFilters: React.FC<ClientProjectFiltersProps> = ({
  className = '',
  selectClassName = 'text-sm border border-light-border dark:border-dark-border rounded-lg px-3 py-2 bg-white dark:bg-dark-card text-zinc-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
}) => {
  const {
    clients,
    filteredProjects,
    selectedClientId,
    setSelectedClientId,
    selectedProjectId,
    setSelectedProjectId,
  } = useProject();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5">
        <Building2 className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        <select
          value={selectedClientId ?? ''}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : null;
            setSelectedClientId(val);
          }}
          className={selectClassName}
        >
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <FolderKanban className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        <select
          value={selectedProjectId ?? ''}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : null;
            setSelectedProjectId(val);
          }}
          className={selectClassName}
        >
          <option value="">Seleccionar proyecto</option>
          {filteredProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
