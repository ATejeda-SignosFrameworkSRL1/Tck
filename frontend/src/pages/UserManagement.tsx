import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usersAPI, departmentsAPI, projectsAPI } from '../services/api';
import { ConfirmDialog } from '../components/ui';

interface Project {
  id: number;
  name: string;
  isActive: boolean;
}

interface Department {
  id: number;
  name: string;
  projectId: number;
  project?: Project;
}

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  departmentId?: number;
  department?: Department;
  createdAt?: string;
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<number>(0);
  const [userToRemoveDeptId, setUserToRemoveDeptId] = useState<number | null>(null);
  const [isRemovingDept, setIsRemovingDept] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadDepartments(selectedProjectId);
    }
  }, [selectedProjectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, projectsRes] = await Promise.all([
        usersAPI.getAll(),
        projectsAPI.getAll(true),
      ]);

      setUsers(usersRes.data);
      setProjects(projectsRes.data);

      if (projectsRes.data.length > 0) {
        setSelectedProjectId(projectsRes.data[0].id);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async (_projectId?: number) => {
    try {
      const response = await departmentsAPI.getAll();
      setDepartments(response.data);
    } catch (error) {
      console.error('Error al cargar departamentos:', error);
    }
  };

  const handleAssignDepartment = async (userId: number, deptId: number) => {
    try {
      await usersAPI.assignDepartments(userId, [deptId]);
      setEditingUserId(null);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al asignar departamento');
    }
  };

  const handleRemoveDepartment = async (userId: number) => {
    setUserToRemoveDeptId(userId);
  };

  const confirmRemoveDepartment = async () => {
    if (userToRemoveDeptId == null) return;
    try {
      setIsRemovingDept(true);
      await usersAPI.assignDepartments(userToRemoveDeptId, []);
      setUserToRemoveDeptId(null);
      await loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al remover departamento');
    } finally {
      setIsRemovingDept(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      developer: 'bg-blue-100 text-blue-800',
      user: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      developer: 'Desarrollador',
      user: 'Usuario',
    };
    return labels[role] || role;
  };

  const filteredDepartments = selectedProjectId
    ? departments.filter((d) => d.projectId === selectedProjectId)
    : departments;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Gestión de Usuarios y Departamentos
              </h1>
              <p className="text-sm text-gray-500">
                Asignar usuarios a departamentos por proyecto
              </p>
            </div>
            <div className="flex gap-4">
              <Link to="/" className="text-indigo-600 hover:text-indigo-800">
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={userToRemoveDeptId != null}
        onClose={() => setUserToRemoveDeptId(null)}
        title="Remover de departamento"
        message="¿Remover usuario de su departamento actual?"
        helperText="Esta acción es irreversible."
        confirmText="Remover"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isRemovingDept}
        loadingText="Eliminando..."
        onConfirm={confirmRemoveDepartment}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Selector */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Proyecto:
          </label>
          <select
            value={selectedProjectId || ''}
            onChange={(e) => setSelectedProjectId(Number(e.target.value))}
            className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} {!project.isActive && '(Inactivo)'}
              </option>
            ))}
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Usuarios del Sistema ({users.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Proyecto
                  </th>
                  {currentUser?.role === 'admin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {u.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{u.email}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${getRoleBadge(
                          u.role
                        )}`}
                      >
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUserId === u.id ? (
                        <select
                          value={selectedDeptId}
                          onChange={(e) => setSelectedDeptId(Number(e.target.value))}
                          className="text-sm px-2 py-1 border border-gray-300 rounded"
                          autoFocus
                        >
                          <option value="0">Sin asignar</option>
                          {filteredDepartments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-gray-900">
                          {u.department?.name || (
                            <span className="text-gray-400 italic">Sin asignar</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {u.department?.project?.name || '-'}
                      </span>
                    </td>
                    {currentUser?.role === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingUserId === u.id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() =>
                                handleAssignDepartment(u.id, selectedDeptId)
                              }
                              className="text-green-600 hover:text-green-800"
                              disabled={selectedDeptId === 0}
                            >
                              ✓ Guardar
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="text-red-600 hover:text-red-800"
                            >
                              ✗ Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setSelectedDeptId(u.departmentId || 0);
                              }}
                              className="text-indigo-600 hover:text-indigo-800"
                            >
                              Asignar
                            </button>
                            {u.departmentId && (
                              <button
                                onClick={() => handleRemoveDepartment(u.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-1">Usuarios con Departamento</p>
            <p className="text-2xl font-bold text-green-600">
              {users.filter((u) => u.departmentId).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-1">Usuarios sin Departamento</p>
            <p className="text-2xl font-bold text-yellow-600">
              {users.filter((u) => !u.departmentId).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500 mb-1">Total Departamentos</p>
            <p className="text-2xl font-bold text-indigo-600">{departments.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
