import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Project } from '../../projects/project.entity';
import { User } from '../../users/user.entity';
import { BaselineSnapshot } from './baseline-snapshot.entity';

@Entity('project_baselines', { schema: 'matrix' })
export class ProjectBaseline {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'project_id', type: 'bigint' })
  projectId: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'created_by_user_id', type: 'bigint', nullable: true })
  createdByUserId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User | null;

  @OneToMany(() => BaselineSnapshot, (s) => s.baseline, { cascade: true })
  snapshots: BaselineSnapshot[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
