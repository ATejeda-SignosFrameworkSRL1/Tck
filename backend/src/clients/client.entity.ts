import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Project } from '../projects/project.entity';

@Entity('clients', { schema: 'core' })
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'business_name', length: 255, nullable: true })
  businessName: string;

  @Column({ name: 'identification', length: 100, nullable: true })
  identification: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({ name: 'contact_name', length: 255, nullable: true })
  contactName: string;

  @Column({ name: 'contact_email', length: 255, nullable: true })
  contactEmail: string;

  @Column({ name: 'contact_phone', length: 100, nullable: true })
  contactPhone: string;

  @Column('text', { name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Project, (project) => project.client)
  projects: Project[];
}
