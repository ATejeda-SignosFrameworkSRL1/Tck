import axios from 'axios';

const API_URL = 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token JWT
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Solo limpiar y redirigir si no estamos ya en login
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        // Usar replace para evitar loops en el historial
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),

  // ========== SECURE ONBOARDING FLOW ==========
  // Paso 1: Enviar OTP
  sendOtp: (email: string, purpose: 'registration' | 'password_recovery' = 'registration') =>
    api.post('/auth/otp/send', { email, purpose }),
  
  // Paso 2: Verificar OTP
  verifyOtp: (email: string, code: string) =>
    api.post('/auth/otp/verify', { email, code }),
  
  // Paso 3: Validar código de invitación
  validateInvitation: (pinCode: string) =>
    api.post('/auth/invitation/validate', { pinCode }),
  
  // Paso 4: Registro seguro completo
  secureRegister: (data: {
    email: string;
    password: string;
    name: string;
    pinCode: string;
    otpVerificationToken: string;
    departmentIds?: number[];
  }) => api.post('/auth/secure-register', data),

  // ========== PASSWORD RECOVERY FLOW ==========
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  resetPassword: (data: { email: string; otpCode: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),

  // ========== INVITACIONES (ADMIN) ==========
  createInvitation: (data: { targetRole: string; description?: string; expiresAt?: string }) =>
    api.post('/auth/invitations', data),
  
  listInvitations: (includeUsed = false) =>
    api.get(`/auth/invitations?includeUsed=${includeUsed}`),
  
  getInvitationStats: () =>
    api.get('/auth/invitations/stats'),
  
  deleteInvitation: (id: number) =>
    api.delete(`/auth/invitations/${id}`),
};

// Projects endpoints
export const projectsAPI = {
  getAll: (includeInactive = false) =>
    api.get(`/projects?includeInactive=${includeInactive}`),
  getOne: (id: number) => api.get(`/projects/${id}`),
  create: (data: {
    name: string;
    description?: string;
    clientDeadline?: string;
    isActive?: boolean;
    createDefaultDepartments?: boolean;
  }) => api.post('/projects', data),
  update: (id: number, data: Partial<{
    name: string;
    description?: string;
    clientDeadline?: string;
    isActive?: boolean;
  }>) => api.patch(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
  activate: (id: number) => api.patch(`/projects/${id}/activate`, {}),
  deactivate: (id: number) => api.patch(`/projects/${id}/deactivate`, {}),
};

// Departments endpoints (ahora son globales, no por proyecto)
export const departmentsAPI = {
  getAll: () => api.get('/departments'),
  getOne: (id: number) => api.get(`/departments/${id}`),
  create: (data: {
    name: string;
    description?: string;
  }) => api.post('/departments', data),
  update: (id: number, data: Partial<{
    name: string;
    description?: string;
  }>) => api.patch(`/departments/${id}`, data),
  delete: (id: number) => api.delete(`/departments/${id}`),
};

// Users endpoints
export const usersAPI = {
  getAll: (departmentId?: number) =>
    api.get('/users', { params: { departmentId } }),
  getOne: (id: number) => api.get(`/users/${id}`),
  getOneWithDepartments: (id: number) => api.get(`/users/${id}/with-departments`),
  getDevelopers: () => api.get('/users/developers'),
  getUserDepartments: (id: number) => api.get(`/users/${id}/departments`),
  update: (id: number, data: {
    name?: string;
    role?: string;
  }) => api.patch(`/users/${id}`, data),
  // Gestión de departamentos del usuario
  assignDepartments: (userId: number, departmentIds: number[]) =>
    api.patch(`/users/${userId}/departments`, { departmentIds }),
  addDepartment: (userId: number, departmentId: number) =>
    api.post(`/users/${userId}/departments/${departmentId}`),
  removeDepartment: (userId: number, departmentId: number) =>
    api.delete(`/users/${userId}/departments/${departmentId}`),
};

// Tickets endpoints
export const ticketsAPI = {
  getAll: (params?: number | {
    search?: string;
    status?: string;
    priority?: string;
    projectId?: number;
    currentDepartmentId?: number;
    originDepartmentId?: number;
    targetDepartmentId?: number;
    createdBy?: number;
    assignedTo?: number;
    dueDateFrom?: string;
    dueDateTo?: string;
    tagIds?: number[];
  }) => {
    // Normalizar: si es número, convertir a objeto con projectId
    const normalizedParams = typeof params === 'number' 
      ? { projectId: params } 
      : params;
    return api.get('/tickets', { params: normalizedParams });
  },
  getByUserDepartments: () => api.get('/tickets/my-departments'),
  getOne: (id: number) => api.get(`/tickets/${id}`),
  create: (data: {
    title: string;
    description: string;
    priority: string;
    projectId: number;
    originDepartmentId: number;
    targetDepartmentId?: number;
    assignedUserIds?: number[];
    observerIds?: number[];
    responsibleId?: number;
    startDate?: string;
    dueDate?: string;
    checklistItems?: { text: string }[];
    // SIPE fields
    ticketType?: string;
    matrixItemId?: number;
    estimatedHours?: number;
  }) => api.post('/tickets', data),
  update: (id: number, data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    targetDepartmentId?: number;
    assignedUserIds?: number[];
    observerIds?: number[];
    responsibleId?: number;
    startDate?: string;
    dueDate?: string;
    // SIPE fields
    ticketType?: string;
    matrixItemId?: number;
    estimatedHours?: number;
  }) => api.patch(`/tickets/${id}`, data),
  delete: (id: number) => api.delete(`/tickets/${id}`),
  // Mover ticket entre departamentos
  move: (ticketId: number, data: { toDepartmentId: number; note?: string }) =>
    api.patch(`/tickets/${ticketId}/move`, data),
  // Asignar usuarios al ticket (ejecutores, observadores y responsable de seguimiento)
  assign: (ticketId: number, data: { assigneeIds: number[]; observerIds?: number[]; responsibleId?: number }) =>
    api.patch(`/tickets/${ticketId}/assign`, data),
  // Checklist
  getChecklist: (ticketId: number) => api.get(`/tickets/${ticketId}/checklist`),
  addChecklistItem: (ticketId: number, data: { text: string }) =>
    api.post(`/tickets/${ticketId}/checklist`, data),
  updateChecklistItem: (ticketId: number, itemId: number, data: { text?: string; isCompleted?: boolean }) =>
    api.patch(`/tickets/${ticketId}/checklist/${itemId}`, data),
  deleteChecklistItem: (ticketId: number, itemId: number) =>
    api.delete(`/tickets/${ticketId}/checklist/${itemId}`),
  // Adjuntos
  getAttachments: (ticketId: number) => api.get(`/tickets/${ticketId}/attachments`),
  uploadAttachments: (ticketId: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post(`/tickets/${ticketId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  downloadAttachment: (ticketId: number, attachmentId: number) =>
    api.get(`/tickets/${ticketId}/attachments/${attachmentId}/download`, { responseType: 'blob' }),
  viewAttachmentUrl: (ticketId: number, attachmentId: number) =>
    `${api.defaults.baseURL}/tickets/${ticketId}/attachments/${attachmentId}/view`,
  deleteAttachment: (ticketId: number, attachmentId: number) =>
    api.delete(`/tickets/${ticketId}/attachments/${attachmentId}`),
};

// Tags endpoints
export const tagsAPI = {
  getAll: () => api.get('/tags'),
  getOne: (id: number) => api.get(`/tags/${id}`),
  create: (data: { name: string; color?: string; icon?: string }) =>
    api.post('/tags', data),
  update: (id: number, data: { name?: string; color?: string; icon?: string }) =>
    api.patch(`/tags/${id}`, data),
  delete: (id: number) => api.delete(`/tags/${id}`),
  // Tags de un ticket
  getForTicket: (ticketId: number) => api.get(`/tickets/${ticketId}/tags`),
  addToTicket: (ticketId: number, tagId: number) =>
    api.post(`/tickets/${ticketId}/tags/${tagId}`),
  removeFromTicket: (ticketId: number, tagId: number) =>
    api.delete(`/tickets/${ticketId}/tags/${tagId}`),
};

// Comments endpoints
export const commentsAPI = {
  getByTicket: (ticketId: number) => api.get(`/tickets/${ticketId}/comments`),
  create: (ticketId: number, content: string) =>
    api.post(`/tickets/${ticketId}/comments`, { content }),
  update: (ticketId: number, commentId: number, content: string) =>
    api.patch(`/tickets/${ticketId}/comments/${commentId}`, { content }),
  delete: (ticketId: number, commentId: number) =>
    api.delete(`/tickets/${ticketId}/comments/${commentId}`),
};

// Tracking endpoints
export const trackingAPI = {
  getHistory: (ticketId: number) => api.get(`/tickets/${ticketId}/history`),
  getTime: (ticketId: number) => api.get(`/tickets/${ticketId}/time`),
  getTotalTime: (ticketId: number) => api.get(`/tickets/${ticketId}/time/total`),
  logTime: (ticketId: number, data: { hoursSpent: number; description?: string }) =>
    api.post(`/tickets/${ticketId}/time`, data),
};

// ==================== MATRIX API (SIPE Capa 1) ====================
export const matrixAPI = {
  // Items WBS/EDT
  getProjectTree: (projectId: number) =>
    api.get(`/matrix/project/${projectId}`),
  getProjectTreeFlat: (projectId: number) =>
    api.get(`/matrix/project/${projectId}/flat`),
  getProjectProgress: (projectId: number) =>
    api.get(`/matrix/project/${projectId}/progress`),
  recalculateProgress: (projectId: number) =>
    api.post(`/matrix/project/${projectId}/recalculate`),
  getItem: (id: number) => api.get(`/matrix/items/${id}`),
  getItemWithTickets: (id: number) =>
    api.get(`/matrix/items/${id}/with-tickets`),
  createItem: (data: {
    projectId: number;
    parentId?: number;
    code: string;
    title: string;
    description?: string;
    weight?: number;
    plannedStart?: string;
    plannedEnd?: string;
    isMilestone?: boolean;
    isCriticalPath?: boolean;
    isDeliverable?: boolean;
    deliverableEntryId?: number | null;
    sortOrder?: number;
  }) => api.post('/matrix/items', data),
  updateItem: (id: number, data: {
    parentId?: number | null;
    code?: string;
    title?: string;
    description?: string;
    weight?: number;
    plannedStart?: string;
    plannedEnd?: string;
    isMilestone?: boolean;
    isCriticalPath?: boolean;
    isDeliverable?: boolean;
    deliverableEntryId?: number | null;
    sortOrder?: number;
    status?: string;
  }) => api.patch(`/matrix/items/${id}`, data),
  deleteItem: (id: number) => api.delete(`/matrix/items/${id}`),

  // Acceptance Criteria
  addCriteria: (matrixItemId: number, data: { description: string }) =>
    api.post(`/matrix/items/${matrixItemId}/criteria`, data),
  verifyCriteria: (criteriaId: number, isMet: boolean) =>
    api.patch(`/matrix/criteria/${criteriaId}/verify`, { isMet }),
  deleteCriteria: (criteriaId: number) =>
    api.delete(`/matrix/criteria/${criteriaId}`),

  // Dependencies
  createDependency: (data: {
    predecessorId: number;
    successorId: number;
    type?: string;
    lagDays?: number;
  }) => api.post('/matrix/dependencies', data),
  getDependencies: (projectId: number) =>
    api.get(`/matrix/project/${projectId}/dependencies`),
  deleteDependency: (id: number) =>
    api.delete(`/matrix/dependencies/${id}`),

  // Baselines
  createBaseline: (data: { projectId: number; name: string }) =>
    api.post('/matrix/baselines', data),
  getProjectBaselines: (projectId: number) =>
    api.get(`/matrix/project/${projectId}/baselines`),
  getBaseline: (id: number) => api.get(`/matrix/baselines/${id}`),
};

// ==================== DELIVERABLES API (Matriz de Entregables CRUD) ====================
export const deliverablesAPI = {
  getByProject: (projectId: number) =>
    api.get(`/deliverables/project/${projectId}`),
  getSummary: (projectId: number) =>
    api.get(`/deliverables/project/${projectId}/summary`),
  getOne: (id: number) => api.get(`/deliverables/${id}`),
  create: (data: {
    projectId: number;
    name: string;
    description?: string;
    phase?: number;
    responsibleFront?: string;
    plannedDeliveryDate?: string;
    actualDeliveryDate?: string;
    status?: string;
    progressPercentage?: number;
    elaborationResponsibleName?: string;
    elaborationResponsibleOrg?: string;
    acceptanceCriteria?: string;
    reviewInstanceName?: string;
    approvalInstanceName?: string;
    baselinePhotoBefore?: string;
    baselinePhotoAfter?: string;
    imageUploadIdBefore?: number;
    imageUploadIdAfter?: number;
  }) => api.post('/deliverables', data),
  update: (id: number, data: Record<string, any>) =>
    api.patch(`/deliverables/${id}`, data),
  remove: (id: number) => api.delete(`/deliverables/${id}`),
  updateLogos: (projectId: number, data: { clientLogoUrl?: string; companyLogoUrl?: string }) =>
    api.patch(`/deliverables/project/${projectId}/logos`, data),
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file, file.name || 'image');
    return api.post<{ id: number }>('/deliverables/upload/image', formData);
  },
  getServeImageUrl: (path: string) =>
    `${api.defaults.baseURL}/deliverables/serve/${encodeURIComponent(path)}`,
  getImageBlobUrl: async (path: string): Promise<string> => {
    const res = await api.get(`/deliverables/serve/${encodeURIComponent(path)}`, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  },
  getUploadImageBlobUrl: async (uploadId: number): Promise<string> => {
    const res = await api.get(`/deliverables/upload/${uploadId}`, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  },
  getEntryPhotoBlobUrl: async (entryId: number, kind: 'before' | 'after'): Promise<string> => {
    const res = await api.get(`/deliverables/entry/${entryId}/photo/${kind}`, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  },
};

// ==================== GANTT API (SIPE Capa 2) ====================
export const ganttAPI = {
  getGanttData: (projectId: number) =>
    api.get(`/gantt/project/${projectId}`),
  getCriticalPath: (projectId: number) =>
    api.get(`/gantt/project/${projectId}/critical-path`),
  getDeviations: (projectId: number) =>
    api.get(`/gantt/project/${projectId}/deviations`),
};

// ==================== METRICS API (SIPE Capa 4) ====================
export const metricsAPI = {
  getProjectHealth: (projectId: number) =>
    api.get(`/metrics/project/${projectId}/health`),
  getProgressMetrics: (projectId: number) =>
    api.get(`/metrics/project/${projectId}/progress`),
  getDeviationMetrics: (projectId: number) =>
    api.get(`/metrics/project/${projectId}/deviation`),
  getForecast: (projectId: number) =>
    api.get(`/metrics/project/${projectId}/forecast`),
  getDocumentationCompliance: (projectId: number) =>
    api.get(`/metrics/project/${projectId}/documentation-compliance`),
  getTicketDistribution: (projectId: number) =>
    api.get(`/metrics/project/${projectId}/ticket-distribution`),
};

export default api;
