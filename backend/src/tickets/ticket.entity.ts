import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Project } from '../projects/project.entity';
import { Department } from '../departments/department.entity';
import { TicketAssignment } from './ticket-assignment.entity';
import { TicketChecklistItem } from './ticket-checklist-item.entity';
import { TicketAttachment } from './ticket-attachment.entity';
import { TicketTag } from '../tags/ticket-tag.entity';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  IN_REVIEW = 'in_review',
  DONE = 'done',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum TicketType {
  TASK = 'task',
  MILESTONE = 'milestone',
  CORRECTION = 'correction',
  INCIDENT = 'incident',
}

@Entity('tickets', { schema: 'tick' })
export class Ticket {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.OPEN,
  })
  status: TicketStatus;

  @Column({
    type: 'enum',
    enum: TicketPriority,
    default: TicketPriority.MEDIUM,
  })
  priority: TicketPriority;

  // Tipo de ticket SIPE
  @Column({
    name: 'ticket_type',
    type: 'varchar',
    length: 20,
    default: TicketType.TASK,
  })
  ticketType: TicketType;

  // Vínculo a la Matriz de Entregables (SIPE Capa 1)
  @Column({ name: 'matrix_item_id', type: 'bigint', nullable: true })
  matrixItemId: number | null;

  // Horas estimadas para proyecciones de desvío
  @Column('numeric', { name: 'estimated_hours', precision: 8, scale: 2, default: 0 })
  estimatedHours: number;

  // Proyecto al que pertenece el ticket
  @ManyToOne(() => Project, (project) => project.tickets)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id', type: 'bigint' })
  projectId: number;

  // Fecha de inicio
  @Column({ name: 'start_date', type: 'timestamp', nullable: true })
  startDate: Date;

  // Fecha de compromiso/entrega
  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  // Usuario que creó el ticket
  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @Column({ name: 'created_by_user_id', type: 'bigint' })
  createdByUserId: number;

  // Departamento de origen (donde se creó el ticket)
  @ManyToOne(() => Department)
  @JoinColumn({ name: 'origin_department_id' })
  originDepartment: Department;

  @Column({ name: 'origin_department_id', type: 'bigint' })
  originDepartmentId: number;

  // Departamento actual (donde está el ticket ahora)
  @ManyToOne(() => Department)
  @JoinColumn({ name: 'current_department_id' })
  currentDepartment: Department;

  @Column({ name: 'current_department_id', type: 'bigint' })
  currentDepartmentId: number;

  // Departamento destino (para quien va etiquetado, opcional)
  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'target_department_id' })
  targetDepartment: Department;

  @Column({ name: 'target_department_id', type: 'bigint', nullable: true })
  targetDepartmentId: number;

  // Asignaciones múltiples de usuarios
  @OneToMany(() => TicketAssignment, (assignment) => assignment.ticket, {
    cascade: true,
  })
  assignments: TicketAssignment[];

  // Historial de transiciones entre departamentos
  @OneToMany('TicketTransition', 'ticket')
  transitions: any[];

  @OneToMany(() => TicketChecklistItem, (item) => item.ticket, { cascade: true })
  checklistItems: TicketChecklistItem[];

  @OneToMany(() => TicketAttachment, (att) => att.ticket, { cascade: true })
  attachments: TicketAttachment[];

  @OneToMany(() => TicketTag, (ticketTag) => ticketTag.ticket, { cascade: true })
  ticketTags: TicketTag[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
