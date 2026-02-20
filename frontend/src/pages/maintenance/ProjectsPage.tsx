import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Power, MoreVertical, FolderKanban, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI, clientsAPI } from '../../services/api';
import { useProject } from '../../context/ProjectContext';
import { notify } from '../../store/notificationStore';
import { PageHeader, Button, Table, Badge, Modal, Input, ConfirmDialog, Dropdown, EmptyState } from '../../components/ui';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Client } from '../../types';

interface Project {
  id: number;
  name: string;
  description?: string;
  clientDeadline?: string;
  isActive: boolean;
  clientId?: number | null;
  client?: Client | null;
  createdAt: string;
  departments?: any[];
  tickets?: any[];
}

const ProjectsPage: React.FC = () => {
  const { selectedProjectId, setSelectedProjectId } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Project | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientDeadline: '',
    createDefaultDepartments: false,
    clientId: '' as string,
  });

  useEffect(() => {
    loadProjects();
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const response = await clientsAPI.getAll();
      setAllClients(response.data);
    } catch (e) {
      console.error('Error loading clients:', e);
    }
  };

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const response = await projectsAPI.getAll(true);
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        description: project.description || '',
        clientDeadline: project.clientDeadline?.split('T')[0] || '',
        createDefaultDepartments: false,
        clientId: project.clientId != null ? String(project.clientId) : '',
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        description: '',
        clientDeadline: '',
        createDefaultDepartments: true,
        clientId: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const handleSubmit = async () => {
    try {
      const clientIdVal = formData.clientId ? Number(formData.clientId) : null;
      if (editingProject) {
        await projectsAPI.update(editingProject.id, {
          name: formData.name,
          description: formData.description || undefined,
          clientDeadline: formData.clientDeadline || undefined,
          clientId: clientIdVal,
        });
        toast.success('Proyecto actualizado correctamente');
      } else {
        await projectsAPI.create({
          name: formData.name,
          description: formData.description || undefined,
          clientDeadline: formData.clientDeadline || undefined,
          createDefaultDepartments: formData.createDefaultDepartments,
          clientId: clientIdVal,
        });
        toast.success('Proyecto creado correctamente');
      }
      handleCloseModal();
      loadProjects();
    } catch (error: any) {
      notify({ type: 'error', title: 'Error al guardar proyecto', body: error.response?.data?.message });
    }
  };

  const handleToggleActive = async (project: Project) => {
    try {
      if (project.isActive) {
        await projectsAPI.deactivate(project.id);
      } else {
        await projectsAPI.activate(project.id);
      }
      loadProjects();
    } catch (error: any) {
      notify({ type: 'error', title: 'Error al cambiar estado', body: error.response?.data?.message });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await projectsAPI.delete(deleteConfirm.id);
      if (selectedProjectId === deleteConfirm.id) {
        setSelectedProjectId(null);
      }
      setDeleteConfirm(null);
      loadProjects();
    } catch (error: any) {
      notify({ type: 'error', title: 'Error al eliminar proyecto', body: error.response?.data?.message });
    }
  };

  const getDeadlineStatus = (deadline?: string) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) return 'danger';
    if (daysLeft <= 7) return 'warning';
    return 'neutral';
  };

  const columns = [
    {
      key: 'name',
      header: 'Proyecto',
      sortable: true,
      render: (project: Project) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <FolderKanban className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">{project.name}</p>
            {project.description && (
              <p className="text-xs text-zinc-500 truncate max-w-xs">
                {project.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'clientDeadline',
      header: 'Fecha Entrega',
      sortable: true,
      render: (project: Project) => {
        if (!project.clientDeadline) return <span className="text-zinc-500">-</span>;
        const status = getDeadlineStatus(project.clientDeadline);
        return (
          <div className="flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${
              status === 'danger' ? 'text-accent-danger' :
              status === 'warning' ? 'text-accent-warning' : 'text-zinc-500'
            }`} />
            <span className={
              status === 'danger' ? 'text-accent-danger' :
              status === 'warning' ? 'text-accent-warning' : 'text-zinc-600 dark:text-zinc-400'
            }>
              {format(new Date(project.clientDeadline), 'dd MMM yyyy', { locale: es })}
            </span>
          </div>
        );
      },
    },
    {
      key: 'client',
      header: 'Cliente',
      render: (project: Project) => (
        <span className="text-zinc-600 dark:text-zinc-400">
          {project.client?.name || '—'}
        </span>
      ),
    },
    {
      key: 'departments',
      header: 'Departamentos',
      render: (project: Project) => (
        <span className="text-zinc-600 dark:text-zinc-400">{project.departments?.length || 0}</span>
      ),
    },
    {
      key: 'tickets',
      header: 'Tickets',
      render: (project: Project) => (
        <span className="text-zinc-600 dark:text-zinc-400">{project.tickets?.length || 0}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Estado',
      render: (project: Project) => (
        <Badge variant={project.isActive ? 'success' : 'neutral'} dot>
          {project.isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (project: Project) => (
        <Dropdown
          trigger={
            <button className="p-1 hover:bg-light-hover dark:hover:bg-dark-hover rounded">
              <MoreVertical className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            </button>
          }
          items={[
            {
              id: 'edit',
              label: 'Editar',
              icon: <Edit className="w-4 h-4" />,
              onClick: () => handleOpenModal(project),
            },
            {
              id: 'toggle',
              label: project.isActive ? 'Desactivar' : 'Activar',
              icon: <Power className="w-4 h-4" />,
              onClick: () => handleToggleActive(project),
            },
            { id: 'divider', label: '', divider: true },
            {
              id: 'delete',
              label: 'Eliminar',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: () => setDeleteConfirm(project),
            },
          ]}
          align="right"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proyectos"
        subtitle="Gestión de proyectos del sistema"
        actions={
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
            Nuevo Proyecto
          </Button>
        }
      />

      {projects.length > 0 ? (
        <Table
          columns={columns}
          data={projects}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
        />
      ) : (
        <EmptyState
          icon="folder"
          title="No hay proyectos"
          description="Crea tu primer proyecto para comenzar"
          action={{
            label: 'Crear Proyecto',
            onClick: () => handleOpenModal(),
          }}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingProject ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre del Proyecto"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Sistema E-commerce"
          />

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del proyecto..."
              rows={3}
              className="w-full px-3 py-2 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Cliente
            </label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-3 py-2 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">Sin cliente asignado</option>
              {allClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.identification ? ` (${c.identification})` : ''}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Fecha de Entrega al Cliente"
            type="date"
            value={formData.clientDeadline}
            onChange={(e) => setFormData({ ...formData, clientDeadline: e.target.value })}
          />

          {!editingProject && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.createDefaultDepartments}
                onChange={(e) =>
                  setFormData({ ...formData, createDefaultDepartments: e.target.checked })
                }
                className="w-4 h-4 rounded border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-primary focus:ring-primary"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Crear departamentos por defecto (QA, Desarrollo, Implementación)
              </span>
            </label>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar Proyecto"
        message={`¿Estás seguro de eliminar el proyecto "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};

export default ProjectsPage;
