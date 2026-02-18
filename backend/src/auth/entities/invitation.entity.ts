import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';

export type InvitationRole = 'admin' | 'dev' | 'user';

@Entity('invitations', { schema: 'core' })
export class Invitation {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'pin_code', unique: true, length: 20 })
  pinCode: string;

  @Column({ name: 'target_role', length: 10 })
  targetRole: InvitationRole;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'used_by_user_id' })
  usedByUser: User;

  @Column({ name: 'used_by_user_id', type: 'bigint', nullable: true })
  usedByUserId: number;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser: User;

  @Column({ name: 'created_by_user_id', type: 'bigint', nullable: true })
  createdByUserId: number;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Helper para verificar si la invitación es válida (el PIN puede reutilizarse para varios usuarios)
  isValid(): boolean {
    if (this.expiresAt && new Date() > this.expiresAt) return false;
    return true;
  }
}
