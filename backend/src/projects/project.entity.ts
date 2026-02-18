import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Department } from '../departments/department.entity';
import { Ticket } from '../tickets/ticket.entity';

@Entity('projects', { schema: 'core' })
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ name: 'client_deadline', type: 'timestamp', nullable: true })
  clientDeadline: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column('text', { name: 'client_logo_url', nullable: true })
  clientLogoUrl: string | null;

  @Column('text', { name: 'company_logo_url', nullable: true })
  companyLogoUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Department, (department) => department.project)
  departments: Department[];

  @OneToMany(() => Ticket, (ticket) => ticket.project)
  tickets: Ticket[];
}
