import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MatrixItem } from './matrix-item.entity';

export enum DependencyType {
  FS = 'FS', // Fin-Inicio
  SS = 'SS', // Inicio-Inicio
  FF = 'FF', // Fin-Fin
  SF = 'SF', // Inicio-Fin
}

@Entity('matrix_dependencies', { schema: 'matrix' })
@Unique(['predecessorId', 'successorId'])
export class MatrixDependency {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'predecessor_id', type: 'bigint' })
  predecessorId: number;

  @ManyToOne(() => MatrixItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'predecessor_id' })
  predecessor: MatrixItem;

  @Column({ name: 'successor_id', type: 'bigint' })
  successorId: number;

  @ManyToOne(() => MatrixItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'successor_id' })
  successor: MatrixItem;

  @Column({
    name: 'dependency_type',
    type: 'varchar',
    length: 2,
    default: DependencyType.FS,
  })
  type: DependencyType;

  @Column({ name: 'lag_days', type: 'int', default: 0 })
  lagDays: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
