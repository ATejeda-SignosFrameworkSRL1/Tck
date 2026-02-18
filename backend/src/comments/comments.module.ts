import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { Comment } from './comment.entity';
import { Ticket } from '../tickets/ticket.entity';
import { TicketAssignment } from '../tickets/ticket-assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Ticket, TicketAssignment])],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
