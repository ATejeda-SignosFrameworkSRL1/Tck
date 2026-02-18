export interface Project {
  id: number;
  name: string;
  description?: string;
  clientDeadline?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  departments?: Department[];
  tickets?: Ticket[];
}

// ==================== MATRIZ DE ENTREGABLES (SIPE) ====================

export interface MatrixItem {
  id: number;
  projectId: number;
  parentId: number | null;
  code: string;
  title: string;
  description: string;
  weight: number;
  plannedStart: string | null;
  plannedEnd: string | null;
  baselineStart: string | null;
  baselineEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  progressPercentage: number;
  isMilestone: boolean;
  isCriticalPath: boolean;
  isDeliverable: boolean;
  sortOrder: number;
  status: 'not_started' | 'in_progress' | 'delayed' | 'completed';
  children?: MatrixItem[];
  acceptanceCriteria?: MatrixAcceptanceCriteria[];
  createdAt: string;
  updatedAt: string;
}

export interface MatrixAcceptanceCriteria {
  id: number;
  matrixItemId: number;
  description: string;
  isMet: boolean;
  verifiedByUserId: number | null;
  verifiedBy?: { id: number; name: string } | null;
  verifiedAt: string | null;
}

export interface MatrixDependency {
  id: number;
  predecessorId: number;
  successorId: number;
  predecessor?: MatrixItem;
  successor?: MatrixItem;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays: number;
}

export interface ProjectBaseline {
  id: number;
  projectId: number;
  name: string;
  createdByUserId: number | null;
  createdBy?: { id: number; name: string } | null;
  createdAt: string;
}

// ==================== DELIVERABLE ENTRIES (CRUD) ====================

export interface DeliverableEntry {
  id: number;
  projectId: number;
  entryNumber: number;
  name: string;
  description: string;
  phase: number;
  responsibleFront: string;
  plannedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  status: 'sin_iniciar' | 'avanzado' | 'terminado';
  progressPercentage: number;
  elaborationResponsibleName: string;
  elaborationResponsibleOrg: string;
  acceptanceCriteria: string;
  reviewInstanceName: string;
  approvalInstanceName: string;
  baselinePhotoBefore: string | null;
  baselinePhotoAfter: string | null;
  hasPhotoBefore?: boolean;
  hasPhotoAfter?: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeliverablesSummary {
  projectName: string;
  projectUpdatedAt: string;
  clientLogoUrl: string | null;
  companyLogoUrl: string | null;
  totalEntries: number;
  completedEntries: number;
  overallProgress: number;
  byStatus: Record<string, number>;
}

// ==================== GANTT ====================

export interface GanttTask {
  id: number;
  code: string;
  title: string;
  parentId: number | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  baselineStart: string | null;
  baselineEnd: string | null;
  progress: number;
  isMilestone: boolean;
  isCriticalPath: boolean;
  status: string;
  weight: number;
  ticketCount: number;
  ticketsClosed: number;
}

export interface GanttLink {
  id: number;
  source: number;
  target: number;
  type: string;
  lagDays: number;
}

export interface GanttData {
  tasks: GanttTask[];
  links: GanttLink[];
  criticalPath: number[];
  projectStart: string | null;
  projectEnd: string | null;
}

// ==================== MÉTRICAS ====================

export interface HealthSemaphore {
  status: 'green' | 'yellow' | 'red';
  deviationPercentage: number;
  message: string;
}

export interface ProgressMetrics {
  planned: number;
  actual: number;
  gap: number;
  totalItems: number;
  completedItems: number;
  inProgressItems: number;
  delayedItems: number;
  byPartida: Array<{
    id: number;
    code: string;
    title: string;
    planned: number;
    actual: number;
    status: string;
    ticketCount: number;
    ticketsClosed: number;
  }>;
}

export interface DeviationMetrics {
  sCurve: Array<{
    date: string;
    planned: number;
    actual: number;
  }>;
  gapDays: number;
  projectedEndDate: string | null;
  plannedEndDate: string | null;
}

export interface ForecastMetrics {
  velocity: number;
  remainingTickets: number;
  projectedEndDate: string | null;
  plannedEndDate: string | null;
  gapDays: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface DocumentationCompliance {
  totalItems: number;
  documentedItems: number;
  percentage: number;
  byItem: Array<{
    id: number;
    code: string;
    title: string;
    hasDocumentation: boolean;
    attachmentCount: number;
    criteriaTotal: number;
    criteriaMet: number;
  }>;
}

export interface TicketDistribution {
  open: number;
  inProgress: number;
  blocked: number;
  inReview: number;
  done: number;
  total: number;
  overdueCount: number;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface UserDepartment {
  id: number;
  userId: number;
  departmentId: number;
  department?: Department;
  assignedAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'supervisor' | 'dev' | 'user' | 'collaborator' | 'client';
  createdAt?: string;
  updatedAt?: string;
  userDepartments?: UserDepartment[];
  departments?: Department[];
}

export interface TicketAssignment {
  id: number;
  ticketId: number;
  userId: number;
  user: User;
  assignedAt: string;
  role?: 'assignee' | 'observer' | 'responsible';
}

export interface TicketTransition {
  id: number;
  ticketId: number;
  fromDepartmentId: number;
  fromDepartment: Department;
  toDepartmentId: number;
  toDepartment: Department;
  movedByUserId: number;
  movedByUser: User;
  note?: string;
  movedAt: string;
}

export interface TicketChecklistItem {
  id: number;
  ticketId?: number;
  text: string;
  isCompleted: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface TicketAttachment {
  id: number;
  ticketId?: number;
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath?: string;
  uploadedByUserId?: number | null;
  uploadedBy?: { id: number; name: string } | null;
  createdAt: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'blocked' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high';
  ticketType?: 'task' | 'milestone' | 'correction' | 'incident';
  matrixItemId?: number | null;
  estimatedHours?: number;
  projectId: number;
  project?: Project;
  startDate?: string;
  dueDate?: string;
  // Checklist y adjuntos
  checklistItems?: TicketChecklistItem[];
  attachments?: TicketAttachment[];
  // Departamentos
  originDepartmentId: number;
  originDepartment?: Department;
  currentDepartmentId: number;
  currentDepartment?: Department;
  targetDepartmentId?: number;
  targetDepartment?: Department;
  // Asignaciones
  assignments?: TicketAssignment[];
  // Historial de transiciones
  transitions?: TicketTransition[];
  // Usuario creador
  createdByUserId: number;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  content: string;
  user: User;
  userId: number;
  ticketId: number;
  createdAt: string;
}

export interface TicketHistory {
  id: number;
  ticketId: number;
  user: User;
  userId: number;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
}

export interface TimeTracking {
  id: number;
  ticketId: number;
  user: User;
  userId: number;
  hoursSpent: number;
  description?: string;
  loggedAt: string;
}

// Filtros para tickets
export interface TicketFilters {
  status?: string;
  priority?: string;
  projectId?: number;
  currentDepartmentId?: number;
  originDepartmentId?: number;
  targetDepartmentId?: number;
  matrixItemId?: number;
  createdBy?: number;
  assignedTo?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
}

// ==================== NOTIFICATIONS ====================

export type NotificationType =
  | 'assignment'
  | 'comment'
  | 'movement'
  | 'mention'
  | 'due_reminder'
  | 'system'
  | 'success'
  | 'error';

export type NotificationEntityType = 'ticket' | 'comment' | 'project' | 'department' | 'user' | 'deliverable';

export interface Notification {
  id: string;
  entityType?: NotificationEntityType;
  entityId?: number;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  readAt: string | null;
  createdAt: string;
}

export type NotificationInput = Omit<Notification, 'id' | 'readAt' | 'createdAt'> & {
  id?: string;
  readAt?: string | null;
  createdAt?: string;
};
