import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/project.entity';
import { MatrixAcceptanceCriteria } from './matrix-acceptance-criteria.entity';
import { MatrixDependency } from './matrix-dependency.entity';

export enum MatrixItemStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  DELAYED = 'delayed',
  COMPLETED = 'completed',
}

@Entity('matrix_items', { schema: 'matrix' })
export class MatrixItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'project_id', type: 'bigint' })
  projectId: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId: number | null;

  @ManyToOne(() => MatrixItem, (item) => item.children, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: MatrixItem | null;

  @OneToMany(() => MatrixItem, (item) => item.parent)
  children: MatrixItem[];

  @Column({ length: 50 })
  code: string;

  @Column({ length: 255 })
  title: string;

  @Column('text', { default: '' })
  description: string;

  @Column('numeric', { precision: 5, scale: 2, default: 0 })
  weight: number;

  @Column({ name: 'planned_start', type: 'timestamp', nullable: true })
  plannedStart: Date | null;

  @Column({ name: 'planned_end', type: 'timestamp', nullable: true })
  plannedEnd: Date | null;

  @Column({ name: 'baseline_start', type: 'timestamp', nullable: true })
  baselineStart: Date | null;

  @Column({ name: 'baseline_end', type: 'timestamp', nullable: true })
  baselineEnd: Date | null;

  @Column({ name: 'actual_start', type: 'timestamp', nullable: true })
  actualStart: Date | null;

  @Column({ name: 'actual_end', type: 'timestamp', nullable: true })
  actualEnd: Date | null;

  @Column('numeric', {
    name: 'progress_percentage',
    precision: 5,
    scale: 2,
    default: 0,
  })
  progressPercentage: number;

  @Column({ name: 'is_milestone', default: false })
  isMilestone: boolean;

  @Column({ name: 'is_critical_path', default: false })
  isCriticalPath: boolean;

  @Column({ name: 'is_deliverable', default: false })
  isDeliverable: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: MatrixItemStatus.NOT_STARTED,
  })
  status: MatrixItemStatus;

  @OneToMany(() => MatrixAcceptanceCriteria, (c) => c.matrixItem, {
    cascade: true,
  })
  acceptanceCriteria: MatrixAcceptanceCriteria[];

  // Tickets vinculados se cargan desde el lado del Ticket (matrixItemId)
  // No usamos relación directa para evitar dependencia circular a nivel de entidad

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
