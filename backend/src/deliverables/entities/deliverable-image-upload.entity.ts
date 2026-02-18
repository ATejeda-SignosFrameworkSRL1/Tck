import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('deliverable_image_uploads', { schema: 'matrix' })
export class DeliverableImageUpload {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bytea' })
  data: Buffer;

  @Column({ type: 'varchar', length: 100 })
  mimetype: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filename: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
