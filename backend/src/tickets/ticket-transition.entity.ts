import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';
import { Department } from '../departments/department.entity';
import { User } from '../users/user.entity';

@Entity('ticket_transitions', { schema: 'tick' })
export class TicketTransition {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  // Ticket que se movió
  @ManyToOne(() => Ticket, (ticket) => ticket.transitions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticket_id' })
  ticket: Ticket;

  @Column({ name: 'ticket_id', type: 'bigint' })
  ticketId: number;

  // Departamento de origen (desde donde se movió)
  @ManyToOne(() => Department)
  @JoinColumn({ name: 'from_department_id' })
  fromDepartment: Department;

  @Column({ name: 'from_department_id', type: 'bigint' })
  fromDepartmentId: number;

  // Departamento destino (hacia donde se movió)
  @ManyToOne(() => Department)
  @JoinColumn({ name: 'to_department_id' })
  toDepartment: Department;

  @Column({ name: 'to_department_id', type: 'bigint' })
  toDepartmentId: number;

  // Usuario que realizó el movimiento
  @ManyToOne(() => User)
  @JoinColumn({ name: 'moved_by_user_id' })
  movedByUser: User;

  @Column({ name: 'moved_by_user_id', type: 'bigint' })
  movedByUserId: number;

  // Nota opcional del movimiento
  @Column('text', { nullable: true })
  note: string;

  // Fecha del movimiento
  @CreateDateColumn({ name: 'moved_at' })
  movedAt: Date;
}
