import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProjectBaseline } from './project-baseline.entity';
import { MatrixItem } from './matrix-item.entity';

@Entity('baseline_snapshots', { schema: 'matrix' })
export class BaselineSnapshot {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'baseline_id', type: 'bigint' })
  baselineId: number;

  @ManyToOne(() => ProjectBaseline, (b) => b.snapshots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'baseline_id' })
  baseline: ProjectBaseline;

  @Column({ name: 'matrix_item_id', type: 'bigint' })
  matrixItemId: number;

  @ManyToOne(() => MatrixItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matrix_item_id' })
  matrixItem: MatrixItem;

  @Column({ name: 'planned_start', type: 'timestamp', nullable: true })
  plannedStart: Date | null;

  @Column({ name: 'planned_end', type: 'timestamp', nullable: true })
  plannedEnd: Date | null;

  @Column('numeric', { precision: 5, scale: 2, default: 0 })
  weight: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
