import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
} from 'typeorm';
import { Ticket } from '../tickets/ticket.entity';
import { Tag } from './tag.entity';

@Entity('ticket_tags', { schema: 'tick' })
@Unique(['ticketId', 'tagId'])
export class TicketTag {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.ticketTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'ticket_id', type: 'bigint' })
  ticketId: number;

  @ManyToOne(() => Tag, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;

  @Column({ name: 'tag_id', type: 'bigint' })
  tagId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
