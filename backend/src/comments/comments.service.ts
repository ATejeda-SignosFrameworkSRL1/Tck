import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Ticket } from '../tickets/ticket.entity';
import { TicketAssignment } from '../tickets/ticket-assignment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketAssignment)
    private assignmentsRepository: Repository<TicketAssignment>,
  ) {}

  async create(
    ticketId: number,
    createCommentDto: CreateCommentDto,
    userId: number,
  ): Promise<Comment> {
    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
    if (!ticket) throw new Error('Ticket no encontrado');

    // Permitir comentar a: creador, responsable, asignados y observadores
    const isCreator = Number(ticket.createdByUserId) === Number(userId);
    const assignment = await this.assignmentsRepository.findOne({
      where: { ticketId, userId },
    });

    if (!isCreator && !assignment) {
      throw new ForbiddenException('Solo los participantes del ticket pueden agregar comentarios');
    }

    const comment = this.commentsRepository.create({
      ...createCommentDto,
      ticketId,
      userId,
    });

    const savedComment = await this.commentsRepository.save(comment);
    
    // Retornar con relaciones
    const result = await this.commentsRepository.findOne({
      where: { id: savedComment.id },
      relations: ['user'],
    });

    if (!result) {
      throw new Error('Error al recuperar el comentario guardado');
    }

    return result;
  }

  async findByTicket(ticketId: number): Promise<Comment[]> {
    return this.commentsRepository.find({
      where: { ticketId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async update(
    ticketId: number,
    commentId: number,
    updateCommentDto: UpdateCommentDto,
    userId: number,
  ): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, ticketId },
      relations: ['user'],
    });
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    const isAuthor = Number(comment.userId) === Number(userId);
    if (!isAuthor) {
      throw new ForbiddenException('Solo el autor del comentario puede editarlo');
    }
    comment.content = updateCommentDto.content;
    await this.commentsRepository.save(comment);
    return comment;
  }

  async remove(
    ticketId: number,
    commentId: number,
    userId: number,
    userRole?: string,
  ): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId, ticketId },
    });
    if (!comment) throw new NotFoundException('Comentario no encontrado');
    const isAuthor = Number(comment.userId) === Number(userId);
    const isSystemAdmin = userRole === 'admin';

    const ticket = await this.ticketsRepository.findOne({ where: { id: ticketId } });
    const isTicketCreator = ticket && Number(ticket.createdByUserId) === Number(userId);
    const responsibleAssignment = await this.assignmentsRepository.findOne({
      where: { ticketId, userId, role: 'responsible' },
    });
    const isTicketAdmin = !!isTicketCreator || !!responsibleAssignment;

    if (!isAuthor && !isSystemAdmin && !isTicketAdmin) {
      throw new ForbiddenException('Solo el autor puede eliminar su comentario, o el creador/responsable del ticket puede eliminar comentarios de otros');
    }
    await this.commentsRepository.remove(comment);
  }
}
