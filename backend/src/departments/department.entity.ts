import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Project } from '../projects/project.entity';
import { UserDepartment } from '../users/user-department.entity';

@Entity('departments', { schema: 'core' })
export class Department {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @ManyToOne(() => Project, (project) => project.departments, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Column({ name: 'project_id', type: 'bigint', nullable: true })
  projectId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => UserDepartment, (ud) => ud.department)
  userDepartments: UserDepartment[];
}
