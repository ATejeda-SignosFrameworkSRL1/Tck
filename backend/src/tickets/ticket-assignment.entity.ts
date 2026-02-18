import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { User } from '../users/user.entity';

@Entity('ticket_assignments', { schema: 'tick' })
@Unique(['ticketId', 'userId'])
export class TicketAssignment {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'ticket_id', type: 'bigint' })
  ticketId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @Column({ type: 'varchar', length: 20, default: 'assignee' })
  role: 'assignee' | 'observer' | 'responsible';

  @CreateDateColumn({ name: 'assigned_at' })
  assignedAt: Date;
}
