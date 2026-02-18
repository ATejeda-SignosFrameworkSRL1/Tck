import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tickets/:ticketId/comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post()
  create(
    @Param('ticketId') ticketId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req,
  ) {
    return this.commentsService.create(+ticketId, createCommentDto, req.user.userId);
  }

  @Get()
  findByTicket(@Param('ticketId') ticketId: string) {
    return this.commentsService.findByTicket(+ticketId);
  }

  @Patch(':commentId')
  update(
    @Param('ticketId') ticketId: string,
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req,
  ) {
    return this.commentsService.update(+ticketId, +commentId, updateCommentDto, req.user.userId);
  }

  @Delete(':commentId')
  remove(
    @Param('ticketId') ticketId: string,
    @Param('commentId') commentId: string,
    @Request() req,
  ) {
    return this.commentsService.remove(+ticketId, +commentId, req.user.userId, req.user.role);
  }
}
