// import React, { useState, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { useAuth } from '../context/AuthContext.jsx';
// import { projectsAPI } from '../services/api';

// interface Project {
//   id: number;
//   name: string;
//   description?: string;
//   clientDeadline?: string;
//   isActive: boolean;
//   createdAt: string;
//   updatedAt: string;
// }

// const Projects: React.FC = () => {
//   const { user } = useAuth();
//   const navigate = useNavigate();
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [showModal, setShowModal] = useState(false);
//   const [editingProject, setEditingProject] = useState<Project | null>(null);
//   const [successMessage, setSuccessMessage] = useState<string | null>(null);
//   const [formData, setFormData] = useState({
//     name: '',
//     description: '',
//     clientDeadline: '',
//     createDefaultDepartments: true,
//   });

//   useEffect(() => {
//     loadProjects();
//   }, []);

//   const loadProjects = async () => {
//     try {
//       const response = await projectsAPI.getAll();
//       setProjects(response.data);
//     } catch (error) {
//       console.error('Error al cargar proyectos:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCreate = () => {
//     setEditingProject(null);
//     setFormData({
//       name: '',
//       description: '',
//       clientDeadline: '',
//       createDefaultDepartments: true,
//     });
//     setShowModal(true);
//   };

//   const handleEdit = (project: Project) => {
//     setEditingProject(project);
//     setFormData({
//       name: project.name,
//       description: project.description || '',
//       clientDeadline: project.clientDeadline
//         ? new Date(project.clientDeadline).toISOString().split('T')[0]
//         : '',
//       createDefaultDepartments: false,
//     });
//     setShowModal(true);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       if (editingProject) {
//         await projectsAPI.update(editingProject.id, {
//           name: formData.name,
//           description: formData.description || undefined,
//           clientDeadline: formData.clientDeadline || undefined,
//         });
//         setSuccessMessage('Proyecto actualizado correctamente');
//       } else {
//         await projectsAPI.create(formData);
//         setSuccessMessage('Proyecto creado correctamente');
//       }
//       setShowModal(false);
//       await loadProjects();
      
//       // Ocultar mensaje después de 3 segundos
//       setTimeout(() => {
//         setSuccessMessage(null);
//       }, 3000);
//     } catch (error: any) {
//       console.error('Error al guardar proyecto:', error);
//       alert(error.response?.data?.message || 'Error al guardar proyecto');
//     }
//   };

//   const handleToggleActive = async (project: Project) => {
//     try {
//       if (project.isActive) {
//         await projectsAPI.deactivate(project.id);
//       } else {
//         await projectsAPI.activate(project.id);
//       }
//       loadProjects();
//     } catch (error: any) {
//       alert(error.response?.data?.message || 'Error al cambiar estado');
//     }
//   };

//   const handleDelete = async (id: number) => {
//     if (!window.confirm('¿Está seguro de eliminar este proyecto?')) return;
//     try {
//       await projectsAPI.delete(id);
//       loadProjects();
//     } catch (error: any) {
//       alert(error.response?.data?.message || 'Error al eliminar proyecto');
//     }
//   };

//   const isDeadlineClose = (deadline?: string) => {
//     if (!deadline) return false;
//     const diff = new Date(deadline).getTime() - new Date().getTime();
//     const days = diff / (1000 * 60 * 60 * 24);
//     return days <= 7 && days >= 0;
//   };

//   const isDeadlinePassed = (deadline?: string) => {
//     if (!deadline) return false;
//     return new Date(deadline) < new Date();
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-100 p-8">
//         <p>Cargando proyectos...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-100">
//       {/* Success Message Toast */}
//       {successMessage && (
//         <div className="fixed top-4 right-4 z-50 animate-fade-in">
//           <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
//             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//             </svg>
//             <span>{successMessage}</span>
//           </div>
//         </div>
//       )}

//       {/* Header */}
//       <div className="bg-white shadow">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900">Proyectos</h1>
//             <p className="text-sm text-gray-500">
//               {user?.name} ({user?.role})
//             </p>
//           </div>
//           <div className="flex gap-4">
//             <Link to="/" className="text-indigo-600 hover:text-indigo-800">
//               ← Volver al Dashboard
//             </Link>
//             {user?.role === 'admin' && (
//               <button
//                 onClick={handleCreate}
//                 className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
//               >
//                 Nuevo Proyecto
//               </button>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Projects Grid */}
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {projects.map((project) => (
//             <div
//               key={project.id}
//               className={`bg-white rounded-lg shadow p-6 ${
//                 !project.isActive ? 'opacity-60' : ''
//               }`}
//             >
//               <div className="flex justify-between items-start mb-4">
//                 <h3 className="text-lg font-semibold">{project.name}</h3>
//                 {!project.isActive && (
//                   <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs">
//                     Inactivo
//                   </span>
//                 )}
//               </div>

//               {project.description && (
//                 <p className="text-gray-600 text-sm mb-4">{project.description}</p>
//               )}

//               {project.clientDeadline && (
//                 <div className="mb-4">
//                   <span className="text-xs text-gray-500">Entrega al cliente:</span>
//                   <p
//                     className={`text-sm font-medium ${
//                       isDeadlinePassed(project.clientDeadline)
//                         ? 'text-red-600'
//                         : isDeadlineClose(project.clientDeadline)
//                         ? 'text-yellow-600'
//                         : 'text-gray-900'
//                     }`}
//                   >
//                     {new Date(project.clientDeadline).toLocaleDateString()}
//                   </p>
//                 </div>
//               )}

//               <div className="flex flex-wrap gap-2 mt-4">
//                 <button
//                   onClick={() => navigate(`/?projectId=${project.id}`)}
//                   className="text-sm text-indigo-600 hover:text-indigo-800"
//                 >
//                   Ver Tickets
//                 </button>
//                 {user?.role === 'admin' && (
//                   <>
//                     <button
//                       onClick={() => handleEdit(project)}
//                       className="text-sm text-blue-600 hover:text-blue-800"
//                     >
//                       Editar
//                     </button>
//                     <button
//                       onClick={() => handleToggleActive(project)}
//                       className="text-sm text-yellow-600 hover:text-yellow-800"
//                     >
//                       {project.isActive ? 'Desactivar' : 'Activar'}
//                     </button>
//                     <button
//                       onClick={() => handleDelete(project.id)}
//                       className="text-sm text-red-600 hover:text-red-800"
//                     >
//                       Eliminar
//                     </button>
//                   </>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>

//         {projects.length === 0 && (
//           <div className="text-center py-12">
//             <p className="text-gray-500">No hay proyectos creados</p>
//           </div>
//         )}
//       </div>

//       {/* Modal */}
//       {showModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-lg max-w-md w-full p-6">
//             <h2 className="text-xl font-bold mb-4">
//               {editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
//             </h2>
//             <form onSubmit={handleSubmit}>
//               <div className="mb-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Nombre del Proyecto *
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
//                   Fecha de Entrega al Cliente
//                 </label>
//                 <input
//                   type="date"
//                   value={formData.clientDeadline}
//                   onChange={(e) =>
//                     setFormData({ ...formData, clientDeadline: e.target.value })
//                   }
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md"
//                 />
//               </div>

//               {!editingProject && (
//                 <div className="mb-4">
//                   <label className="flex items-center">
//                     <input
//                       type="checkbox"
//                       checked={formData.createDefaultDepartments}
//                       onChange={(e) =>
//                         setFormData({
//                           ...formData,
//                           createDefaultDepartments: e.target.checked,
//                         })
//                       }
//                       className="mr-2"
//                     />
//                     <span className="text-sm text-gray-700">
//                       Crear departamentos por defecto (QA, Desarrollo, Implementación)
//                     </span>
//                   </label>
//                 </div>
//               )}

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
//                   {editingProject ? 'Actualizar' : 'Crear'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Projects;
