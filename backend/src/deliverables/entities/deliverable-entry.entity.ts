import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/project.entity';

export enum DeliverableStatus {
  NOT_STARTED = 'sin_iniciar',
  IN_PROGRESS = 'avanzado',
  COMPLETED = 'terminado',
}

@Entity('deliverable_entries', { schema: 'matrix' })
export class DeliverableEntry {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'project_id', type: 'bigint' })
  projectId: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'entry_number', type: 'int' })
  entryNumber: number;

  @Column({ name: 'name', length: 500 })
  name: string;

  @Column('text', { default: '' })
  description: string;

  @Column({ type: 'int', default: 1 })
  phase: number;

  @Column({ name: 'responsible_front', length: 255, default: '' })
  responsibleFront: string;

  @Column({ name: 'planned_delivery_date', type: 'timestamp', nullable: true })
  plannedDeliveryDate: Date | null;

  @Column({ name: 'actual_delivery_date', type: 'timestamp', nullable: true })
  actualDeliveryDate: Date | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: DeliverableStatus.NOT_STARTED,
  })
  status: DeliverableStatus;

  @Column('numeric', {
    name: 'progress_percentage',
    precision: 5,
    scale: 2,
    default: 0,
  })
  progressPercentage: number;

  @Column({ name: 'elaboration_responsible_name', length: 255, default: '' })
  elaborationResponsibleName: string;

  @Column({ name: 'elaboration_responsible_org', length: 255, default: '' })
  elaborationResponsibleOrg: string;

  @Column('text', { name: 'acceptance_criteria', default: '' })
  acceptanceCriteria: string;

  @Column({ name: 'review_instance_name', length: 255, default: '' })
  reviewInstanceName: string;

  @Column({ name: 'approval_instance_name', length: 255, default: '' })
  approvalInstanceName: string;

  @Column('text', { name: 'baseline_photo_before', nullable: true })
  baselinePhotoBefore: string | null;

  @Column('text', { name: 'baseline_photo_after', nullable: true })
  baselinePhotoAfter: string | null;

  @Column({ name: 'baseline_photo_before_data', type: 'bytea', nullable: true, select: false })
  baselinePhotoBeforeData: Buffer | null;

  @Column({ name: 'baseline_photo_before_mimetype', type: 'varchar', length: 100, nullable: true, select: false })
  baselinePhotoBeforeMimetype: string | null;

  @Column({ name: 'baseline_photo_after_data', type: 'bytea', nullable: true, select: false })
  baselinePhotoAfterData: Buffer | null;

  @Column({ name: 'baseline_photo_after_mimetype', type: 'varchar', length: 100, nullable: true, select: false })
  baselinePhotoAfterMimetype: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
