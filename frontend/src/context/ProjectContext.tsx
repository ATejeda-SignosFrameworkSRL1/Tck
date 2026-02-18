import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { projectsAPI } from '../services/api';

interface Project {
  id: number;
  name: string;
  description?: string;
  clientDeadline?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProjectContextType {
  projects: Project[];
  selectedProjectId: number | null;
  selectedProject: Project | null;
  setSelectedProjectId: (id: number | null) => void;
  isLoading: boolean;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadProjects = useCallback(async () => {
    // Solo cargar si hay un token (usuario autenticado)
    const token = sessionStorage.getItem('token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await projectsAPI.getAll();
      const data = response?.data;
      setProjects(Array.isArray(data) ? data : []);
      setHasLoaded(true);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Cargar proyectos solo cuando hay token y no se han cargado
    const token = sessionStorage.getItem('token');
    if (token && !hasLoaded) {
      loadProjects();
    }
  }, [hasLoaded, loadProjects]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  const value: ProjectContextType = {
    projects,
    selectedProjectId,
    selectedProject,
    setSelectedProjectId,
    isLoading,
    refreshProjects: loadProjects,
  };

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
