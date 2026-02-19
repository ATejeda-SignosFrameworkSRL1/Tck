import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MoreVertical, Building2, Users } from 'lucide-react';
import { departmentsAPI, projectsAPI } from '../../services/api';
import { notify } from '../../store/notificationStore';
import { PageHeader, Button, Table, Modal, Input, Select, ConfirmDialog, Dropdown, EmptyState } from '../../components/ui';

interface Department {
  id: number;
  name: string;
  description?: string;
  projectId: number;
  project?: { name: string };
  users?: any[];
  createdAt: string;
}

interface Project {
  id: number;
  name: string;
  isActive: boolean;
}

const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadDepartments();
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data);
      if (response.data.length > 0) {
        setSelectedProjectId(response.data[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadDepartments = async () => {
    if (!selectedProjectId) return;
    try {
      setIsLoading(true);
      const response = await departmentsAPI.getAll();
      setDepartments(response.data);
    } catch (error) {
      console.error('Error loading departments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (department?: Department) => {
    if (department) {
      setEditingDepartment(department);
      setFormData({
        name: department.name,
        description: department.description || '',
        projectId: department.projectId.toString(),
      });
    } else {
      setEditingDepartment(null);
      setFormData({
        name: '',
        description: '',
        projectId: selectedProjectId?.toString() || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
  };

  const handleSubmit = async () => {
    try {
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        projectId: parseInt(formData.projectId),
      };

      if (editingDepartment) {
        await departmentsAPI.update(editingDepartment.id, data);
      } else {
        await departmentsAPI.create(data);
      }
      handleCloseModal();
      loadDepartments();
    } catch (error: any) {
      notify({ type: 'error', title: 'Error al guardar departamento', body: error.response?.data?.message });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await departmentsAPI.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      loadDepartments();
    } catch (error: any) {
      notify({ type: 'error', title: 'Error al eliminar departamento', body: error.response?.data?.message });
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Departamento',
      sortable: true,
      render: (dept: Department) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-info/20">
            <Building2 className="w-5 h-5 text-accent-info" />
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">{dept.name}</p>
            {dept.description && (
              <p className="text-xs text-zinc-500 truncate max-w-xs">
                {dept.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'project',
      header: 'Proyecto',
      render: (dept: Department) => (
        <span className="text-zinc-600 dark:text-zinc-400">{dept.project?.name || 'Sin proyecto'}</span>
      ),
    },
    {
      key: 'users',
      header: 'Usuarios',
      render: (dept: Department) => (
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-zinc-500" />
          <span className="text-zinc-600 dark:text-zinc-400">{dept.users?.length || 0}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (dept: Department) => (
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
              onClick: () => handleOpenModal(dept),
            },
            { id: 'divider', label: '', divider: true },
            {
              id: 'delete',
              label: 'Eliminar',
              icon: <Trash2 className="w-4 h-4" />,
              onClick: () => setDeleteConfirm(dept),
              disabled: (dept.users?.length || 0) > 0,
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
        title="Departamentos"
        subtitle="Gestión de departamentos por proyecto"
        actions={
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
            Nuevo Departamento
          </Button>
        }
      />

      {/* Project Filter */}
      <div className="flex items-center gap-4">
        <Select
          label="Filtrar por proyecto"
          value={selectedProjectId?.toString() || ''}
          onChange={(value) => setSelectedProjectId(parseInt(value))}
          options={projects.map((p) => ({
            value: p.id,
            label: p.name,
          }))}
          className="w-64"
        />
      </div>

      {departments.length > 0 ? (
        <Table
          columns={columns}
          data={departments}
          keyExtractor={(d) => d.id}
          isLoading={isLoading}
        />
      ) : (
        <EmptyState
          icon="folder"
          title="No hay departamentos"
          description={selectedProjectId ? "Este proyecto no tiene departamentos" : "Selecciona un proyecto"}
          action={selectedProjectId ? {
            label: 'Crear Departamento',
            onClick: () => handleOpenModal(),
          } : undefined}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingDepartment ? 'Editar Departamento' : 'Nuevo Departamento'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingDepartment ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre del Departamento"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ej: Desarrollo"
          />

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del departamento..."
              rows={3}
              className="w-full px-3 py-2 bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <Select
            label="Proyecto"
            value={formData.projectId}
            onChange={(value) => setFormData({ ...formData, projectId: value })}
            options={projects.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
          />
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar Departamento"
        message={
          (deleteConfirm?.users?.length || 0) > 0
            ? `No se puede eliminar "${deleteConfirm?.name}" porque tiene usuarios asignados.`
            : `¿Estás seguro de eliminar el departamento "${deleteConfirm?.name}"?`
        }
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
};

export default DepartmentsPage;
