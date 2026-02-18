import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MatrixItem } from './matrix-item.entity';
import { User } from '../../users/user.entity';

@Entity('matrix_acceptance_criteria', { schema: 'matrix' })
export class MatrixAcceptanceCriteria {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'matrix_item_id', type: 'bigint' })
  matrixItemId: number;

  @ManyToOne(() => MatrixItem, (item) => item.acceptanceCriteria, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'matrix_item_id' })
  matrixItem: MatrixItem;

  @Column('text')
  description: string;

  @Column({ name: 'is_met', default: false })
  isMet: boolean;

  @Column({ name: 'verified_by_user_id', type: 'bigint', nullable: true })
  verifiedByUserId: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by_user_id' })
  verifiedBy: User | null;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
