import React, { useState, useEffect } from 'react';
import { Edit, MoreVertical, Building2, X } from 'lucide-react';
import { usersAPI, departmentsAPI } from '../../services/api';
import { notify } from '../../store/notificationStore';
import { PageHeader, Table, RoleBadge, Modal, Select, Dropdown, EmptyState, Avatar, Button } from '../../components/ui';

interface DepartmentInfo {
  id: number;
  name: string;
  description?: string;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'dev' | 'user';
  departments?: DepartmentInfo[];
  createdAt: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);

  // Form state
  const [formRole, setFormRole] = useState('');
  const [formDepartmentIds, setFormDepartmentIds] = useState<number[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, deptsRes] = await Promise.all([
        usersAPI.getAll(),
        departmentsAPI.getAll(),
      ]);

      const allDepts: DepartmentInfo[] = deptsRes.data;
      setDepartments(allDepts);

      // Para cada usuario, cargar sus departamentos
      const usersWithDepts: UserData[] = await Promise.all(
        usersRes.data.map(async (user: any) => {
          try {
            const deptRes = await usersAPI.getUserDepartments(user.id);
            return {
              ...user,
              departments: deptRes.data.map((ud: any) => ud.department),
            };
          } catch {
            return { ...user, departments: [] };
          }
        })
      );

      setUsers(usersWithDepts);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (user: UserData) => {
    setEditingUser(user);
    setFormRole(user.role);
    setFormDepartmentIds(user.departments?.map((d) => d.id) || []);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormRole('');
    setFormDepartmentIds([]);
  };

  const handleAddDepartment = (deptId: string) => {
    const id = parseInt(deptId);
    if (id && !formDepartmentIds.includes(id)) {
      setFormDepartmentIds([...formDepartmentIds, id]);
    }
  };

  const handleRemoveDepartment = (deptId: number) => {
    setFormDepartmentIds(formDepartmentIds.filter((id) => id !== deptId));
  };

  const handleSubmit = async () => {
    if (!editingUser) return;
    try {
      // 1. Actualizar rol
      await usersAPI.update(editingUser.id, { role: formRole });

      // 2. Actualizar departamentos
      await usersAPI.assignDepartments(editingUser.id, formDepartmentIds);

      handleCloseModal();
      loadData();
    } catch (error: any) {
      notify({ type: 'error', title: 'Error al actualizar usuario', body: error.response?.data?.message });
    }
  };

  // Departamentos disponibles (que no están ya seleccionados)
  const availableDepartments = departments.filter(
    (d) => !formDepartmentIds.includes(d.id)
  );

  const columns = [
    {
      key: 'name',
      header: 'Usuario',
      sortable: true,
      render: (user: UserData) => (
        <div className="flex items-center gap-3">
          <Avatar name={user.name} size="sm" />
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">{user.name}</p>
            <p className="text-xs text-zinc-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      width: '130px',
      render: (user: UserData) => <RoleBadge role={user.role} />,
    },
    {
      key: 'departments',
      header: 'Departamentos',
      render: (user: UserData) => {
        if (!user.departments || user.departments.length === 0) {
          return <span className="text-zinc-400 text-sm italic">Sin asignar</span>;
        }
        return (
          <div className="flex flex-wrap gap-1.5">
            {user.departments.map((dept) => (
              <span
                key={dept.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
              >
                <Building2 className="w-3 h-3" />
                {dept.name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '50px',
      render: (user: UserData) => (
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
              onClick: () => handleOpenModal(user),
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
        title="Usuarios"
        subtitle={`${users.length} usuarios en el sistema`}
      />

      {users.length > 0 ? (
        <Table
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          isLoading={isLoading}
        />
      ) : (
        <EmptyState
          icon="users"
          title="No hay usuarios"
          description="No se encontraron usuarios en el sistema"
        />
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Editar Usuario"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* User Info */}
          {editingUser && (
            <div className="flex items-center gap-3 p-3 bg-light-bg dark:bg-dark-surface rounded-lg">
              <Avatar name={editingUser.name} size="md" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">{editingUser.name}</p>
                <p className="text-sm text-zinc-500">{editingUser.email}</p>
              </div>
            </div>
          )}

          {/* Role */}
          <Select
            label="Rol"
            value={formRole}
            onChange={(value) => setFormRole(value)}
            options={[
              { value: 'admin', label: 'Administrador' },
              { value: 'dev', label: 'Desarrollador' },
              { value: 'user', label: 'Usuario' },
            ]}
          />

          {/* Departments - Multi select */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Departamentos
            </label>

            {/* Selected departments */}
            {formDepartmentIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formDepartmentIds.map((deptId) => {
                  const dept = departments.find((d) => d.id === deptId);
                  if (!dept) return null;
                  return (
                    <span
                      key={deptId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      {dept.name}
                      <button
                        onClick={() => handleRemoveDepartment(deptId)}
                        className="ml-0.5 p-0.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Add department dropdown */}
            {availableDepartments.length > 0 ? (
              <Select
                value=""
                onChange={handleAddDepartment}
                options={[
                  { value: '', label: '+ Agregar departamento...' },
                  ...availableDepartments.map((d) => ({
                    value: d.id,
                    label: d.name,
                  })),
                ]}
              />
            ) : (
              <p className="text-xs text-zinc-500 italic">
                {departments.length === 0
                  ? 'No hay departamentos creados'
                  : 'Todos los departamentos asignados'}
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
