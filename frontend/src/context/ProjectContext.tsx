import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { projectsAPI, clientsAPI } from '../services/api';
import type { Client } from '../types';

interface Project {
  id: number;
  name: string;
  description?: string;
  clientDeadline?: string;
  isActive: boolean;
  clientId?: number | null;
  client?: Client | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectContextType {
  projects: Project[];
  clients: Client[];
  selectedProjectId: number | null;
  selectedProject: Project | null;
  selectedClientId: number | null;
  setSelectedProjectId: (id: number | null) => void;
  setSelectedClientId: (id: number | null) => void;
  filteredProjects: Project[];
  isLoading: boolean;
  refreshProjects: () => Promise<void>;
  refreshClients: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadProjects = useCallback(async () => {
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

  const loadClients = useCallback(async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return;
    try {
      const response = await clientsAPI.getAll();
      const data = response?.data;
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]);
    }
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token && !hasLoaded) {
      loadProjects();
      loadClients();
    }
  }, [hasLoaded, loadProjects, loadClients]);

  const filteredProjects = useMemo(() => {
    if (selectedClientId == null) return projects;
    return projects.filter(
      (p) => Number(p.clientId) === Number(selectedClientId),
    );
  }, [projects, selectedClientId]);

  useEffect(() => {
    if (selectedClientId != null && selectedProjectId != null) {
      const belongs = filteredProjects.some(
        (p) => Number(p.id) === Number(selectedProjectId),
      );
      if (!belongs) setSelectedProjectId(null);
    }
  }, [selectedClientId, filteredProjects, selectedProjectId]);

  const selectedProject =
    projects.find((p) => Number(p.id) === Number(selectedProjectId)) || null;

  const value: ProjectContextType = {
    projects,
    clients,
    selectedProjectId,
    selectedProject,
    selectedClientId,
    setSelectedProjectId,
    setSelectedClientId,
    filteredProjects,
    isLoading,
    refreshProjects: loadProjects,
    refreshClients: loadClients,
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
