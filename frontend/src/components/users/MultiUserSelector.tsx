import React, { useEffect, useState } from 'react';
import { usersAPI, departmentsAPI } from '../../services/api';

interface Project {
  id: number;
  name: string;
}

interface Department {
  id: number;
  name: string;
  description?: string;
  projectId: number;
  project?: Project;
  createdAt: string;
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

interface MultiUserSelectorProps {
  selectedUserIds: number[];
  onChange: (userIds: number[]) => void;
  projectId?: number;
}

const MultiUserSelector: React.FC<MultiUserSelectorProps> = ({
  selectedUserIds,
  onChange,
  projectId,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filterDeptId, setFilterDeptId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
    if (projectId) {
      loadDepartments();
    }
  }, [projectId]);

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll();
      setDepartments(response.data);
    } catch (error) {
      console.error('Error al cargar departamentos:', error);
    }
  };

  const toggleUser = (userId: number) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  const removeUser = (userId: number) => {
    onChange(selectedUserIds.filter((id) => id !== userId));
  };

  const filteredUsers = users.filter((user) => {
    const matchesDept = filterDeptId ? user.departmentId === filterDeptId : true;
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id));

  if (loading) {
    return <p className="text-sm text-gray-500">Cargando usuarios...</p>;
  }

  return (
    <div>
      {/* Selected Users (Chips) */}
      {selectedUsers.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm"
            >
              {user.name}
              <button
                type="button"
                onClick={() => removeUser(user.id)}
                className="ml-2 text-indigo-600 hover:text-indigo-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="mb-3 space-y-2">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />

        {departments.length > 0 && (
          <select
            value={filterDeptId || ''}
            onChange={(e) =>
              setFilterDeptId(e.target.value ? Number(e.target.value) : null)
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Todos los departamentos</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* User List */}
      <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
        {filteredUsers.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No se encontraron usuarios
          </p>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <label
                key={user.id}
                className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(user.id)}
                  onChange={() => toggleUser(user.id)}
                  className="mr-3"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-gray-500">
                    {user.email}
                    {user.department && ` • ${user.department.name}`}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiUserSelector;
