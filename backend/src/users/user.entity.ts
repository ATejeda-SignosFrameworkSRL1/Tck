import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  ADMIN = 'admin',           // Project Manager
  SUPERVISOR = 'supervisor', // Líder Técnico / Validador
  DEV = 'dev',              // Ejecutor (mantener por compatibilidad)
  USER = 'user',            // Ejecutor
  COLLABORATOR = 'collaborator', // Stakeholder / Consulta
  CLIENT = 'client',        // Invitado - solo lectura
}

@Entity('users', { schema: 'core' })
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relación many-to-many con departamentos (via UserDepartment)
  @OneToMany('UserDepartment', 'user')
  userDepartments: any[];
}
