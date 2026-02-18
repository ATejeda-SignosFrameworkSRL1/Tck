// import React, { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext';
// import { departmentsAPI, projectsAPI, usersAPI } from '../services/api';

// interface Project {
//   id: number;
//   name: string;
//   description?: string;
//   clientDeadline?: string;
//   isActive: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

// interface Department {
//   id: number;
//   name: string;
//   description?: string;
//   projectId: number;
//   project?: Project;
//   createdAt: string;
// }

// interface User {
//   id: number;
//   email: string;
//   name: string;
//   role: string;
//   departmentId?: number;
//   department?: Department;
//   createdAt?: string;
// }

// const Departments: React.FC = () => {
//   const { user } = useAuth();
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
//   const [departments, setDepartments] = useState<Department[]>([]);
//   const [users, setUsers] = useState<User[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showModal, setShowModal] = useState(false);
//   const [editingDept, setEditingDept] = useState<Department | null>(null);
//   const [formData, setFormData] = useState({
//     name: '',
//     description: '',
//     projectId: 0,
//   });

//   useEffect(() => {
//     loadProjects();
//     loadUsers();
//   }, []);

//   useEffect(() => {
//     if (selectedProjectId) {
//       loadDepartments(selectedProjectId);
//     }
//   }, [selectedProjectId]);

//   const loadProjects = async () => {
//     try {
//       const response = await projectsAPI.getAll();
//       const activeProjects = response.data.filter((p: Project) => p.isActive);
//       setProjects(activeProjects);
//       if (activeProjects.length > 0 && !selectedProjectId) {
//         setSelectedProjectId(activeProjects[0].id);
//       }
//     } catch (error) {
//       console.error('Error al cargar proyectos:', error);
//     }
//   };

//   const loadDepartments = async (projectId: number) => {
//     try {
//       setLoading(true);
//       const response = await departmentsAPI.getAll(projectId);
//       setDepartments(response.data);
//     } catch (error) {
//       console.error('Error al cargar departamentos:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadUsers = async () => {
//     try {
//       const response = await usersAPI.getAll();
//       setUsers(response.data);
//     } catch (error) {
//       console.error('Error al cargar usuarios:', error);
//     }
//   };

//   const handleCreate = () => {
//     setEditingDept(null);
//     setFormData({
//       name: '',
//       description: '',
//       projectId: selectedProjectId || 0,
//     });
//     setShowModal(true);
//   };

//   const handleEdit = (dept: Department) => {
//     setEditingDept(dept);
//     setFormData({
//       name: dept.name,
//       description: dept.description || '',
//       projectId: dept.projectId,
//     });
//     setShowModal(true);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       if (editingDept) {
//         await departmentsAPI.update(editingDept.id, formData);
//       } else {
//         await departmentsAPI.create(formData);
//       }
//       setShowModal(false);
//       if (selectedProjectId) {
//         loadDepartments(selectedProjectId);
//       }
//     } catch (error: any) {
//       console.error('Error al guardar departamento:', error);
//       alert(error.response?.data?.message || 'Error al guardar departamento');
//     }
//   };

//   const handleDelete = async (id: number) => {
//     if (!window.confirm('¿Está seguro de eliminar este departamento?')) return;
//     try {
//       await departmentsAPI.delete(id);
//       if (selectedProjectId) {
//         loadDepartments(selectedProjectId);
//       }
//     } catch (error: any) {
//       alert(error.response?.data?.message || 'Error al eliminar departamento');
//     }
//   };

//   const getUsersInDepartment = (deptId: number) => {
//     return users.filter((u) => u.departmentId === deptId);
//   };

//   return (
//     <div className="min-h-screen bg-gray-100">
//       {/* Header */}
//       <div className="bg-white shadow">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
//           <div className="flex justify-between items-center mb-4">
//             <div>
//               <h1 className="text-2xl font-bold text-gray-900">Departamentos</h1>
//               <p className="text-sm text-gray-500">
//                 {user?.name} ({user?.role})
//               </p>
//             </div>
//             <div className="flex gap-4">
//               <Link to="/projects" className="text-indigo-600 hover:text-indigo-800">
//                 Ver Proyectos
//               </Link>
//               <Link to="/" className="text-indigo-600 hover:text-indigo-800">
//                 ← Dashboard
//               </Link>
//             </div>
//           </div>

//           {/* Project Selector */}
//           <div className="flex items-center gap-4">
//             <label className="text-sm font-medium text-gray-700">Proyecto:</label>
//             <select
//               value={selectedProjectId || ''}
//               onChange={(e) => setSelectedProjectId(Number(e.target.value))}
//               className="px-3 py-2 border border-gray-300 rounded-md"
//             >
//               {projects.map((project) => (
//                 <option key={project.id} value={project.id}>
//                   {project.name}
//                   {project.clientDeadline &&
//                     ` - Entrega: ${new Date(project.clientDeadline).toLocaleDateString()}`}
//                 </option>
//               ))}
//             </select>

//             {user?.role === 'admin' && (
//               <button
//                 onClick={handleCreate}
//                 className="ml-auto bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
//               >
//                 Nuevo Departamento
//               </button>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Departments List */}
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {loading ? (
//           <p>Cargando departamentos...</p>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {departments.map((dept) => {
//               const deptUsers = getUsersInDepartment(dept.id);
//               return (
//                 <div key={dept.id} className="bg-white rounded-lg shadow p-6">
//                   <h3 className="text-lg font-semibold mb-2">{dept.name}</h3>
//                   {dept.description && (
//                     <p className="text-gray-600 text-sm mb-4">{dept.description}</p>
//                   )}

//                   <div className="mb-4">
//                     <span className="text-sm text-gray-500">
//                       Usuarios: {deptUsers.length}
//                     </span>
//                     {deptUsers.length > 0 && (
//                       <ul className="mt-2 space-y-1">
//                         {deptUsers.map((u) => (
//                           <li key={u.id} className="text-sm text-gray-700">
//                             • {u.name} ({u.role})
//                           </li>
//                         ))}
//                       </ul>
//                     )}
//                   </div>

//                   {user?.role === 'admin' && (
//                     <div className="flex gap-2 mt-4">
//                       <button
//                         onClick={() => handleEdit(dept)}
//                         className="text-sm text-blue-600 hover:text-blue-800"
//                       >
//                         Editar
//                       </button>
//                       <button
//                         onClick={() => handleDelete(dept.id)}
//                         className="text-sm text-red-600 hover:text-red-800"
//                       >
//                         Eliminar
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         )}

//         {!loading && departments.length === 0 && (
//           <div className="text-center py-12">
//             <p className="text-gray-500">No hay departamentos en este proyecto</p>
//           </div>
//         )}
//       </div>

//       {/* Modal */}
//       {showModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-lg max-w-md w-full p-6">
//             <h2 className="text-xl font-bold mb-4">
//               {editingDept ? 'Editar Departamento' : 'Nuevo Departamento'}
//             </h2>
//             <form onSubmit={handleSubmit}>
//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Nombre *
//                 </label>
//                 <input
//                   type="text"
//                   required
//                   value={formData.name}
//                   onChange={(e) =>
//                     setFormData({ ...formData, name: e.target.value })
//                   }
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md"
//                 />
//               </div>

//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Descripción
//                 </label>
//                 <textarea
//                   value={formData.description}
//                   onChange={(e) =>
//                     setFormData({ ...formData, description: e.target.value })
//                   }
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md"
//                   rows={3}
//                 />
//               </div>

//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Proyecto *
//                 </label>
//                 <select
//                   required
//                   value={formData.projectId}
//                   onChange={(e) =>
//                     setFormData({ ...formData, projectId: Number(e.target.value) })
//                   }
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md"
//                 >
//                   <option value="">Seleccionar proyecto</option>
//                   {projects.map((project) => (
//                     <option key={project.id} value={project.id}>
//                       {project.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="flex gap-2 justify-end">
//                 <button
//                   type="button"
//                   onClick={() => setShowModal(false)}
//                   className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
//                 >
//                   Cancelar
//                 </button>
//                 <button
//                   type="submit"
//                   className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
//                 >
//                   {editingDept ? 'Actualizar' : 'Crear'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Departments;
