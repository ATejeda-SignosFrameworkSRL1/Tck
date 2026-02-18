import React, { useEffect, useState } from 'react';
import { projectsAPI } from '../../services/api';

interface Project {
  id: number;
  name: string;
  description?: string;
  clientDeadline?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSelectorProps {
  value: number | null;
  onChange: (projectId: number | null) => void;
  showAllOption?: boolean;
  className?: string;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  value,
  onChange,
  showAllOption = true,
  className = '',
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data.filter((p: Project) => p.isActive));
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
    } finally {
      setLoading(false);
    }
  };

  const isDeadlineClose = (deadline?: string) => {
    if (!deadline) return false;
    const diff = new Date(deadline).getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 7 && days >= 0;
  };

  const selectedProject = projects.find((p) => p.id === value);

  if (loading) {
    return (
      <select className={className} disabled>
        <option>Cargando proyectos...</option>
      </select>
    );
  }

  return (
    <div>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className={className}
      >
        {showAllOption && <option value="">Todos los proyectos</option>}
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
            {project.clientDeadline &&
              ` - Entrega: ${new Date(project.clientDeadline).toLocaleDateString()}`}
          </option>
        ))}
      </select>

      {selectedProject?.clientDeadline && isDeadlineClose(selectedProject.clientDeadline) && (
        <p className="text-xs text-yellow-600 mt-1">
          ⚠️ Entrega próxima:{' '}
          {new Date(selectedProject.clientDeadline).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

export default ProjectSelector;
