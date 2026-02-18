import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFiles,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { MoveTicketDto } from './dto/move-ticket.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { FilterTicketsDto } from './dto/filter-tickets.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TagsService } from '../tags/tags.service';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(
    private ticketsService: TicketsService,
    private tagsService: TagsService,
  ) {}

  @Post()
  create(@Body() createTicketDto: CreateTicketDto, @Request() req) {
    return this.ticketsService.create(createTicketDto, req.user.userId);
  }

  @Get()
  findAll(@Query() filters: FilterTicketsDto) {
    return this.ticketsService.findAll(filters);
  }

  @Get('my-departments')
  findByUserDepartments(@Request() req) {
    return this.ticketsService.findByUserDepartments(
      req.user.userId,
      req.user.role,
    );
  }

  @Get(':id/checklist')
  getChecklist(@Param('id') id: string) {
    return this.ticketsService.getChecklistItems(+id);
  }

  @Post(':id/checklist')
  addChecklistItem(
    @Param('id') id: string,
    @Body() dto: CreateChecklistItemDto,
    @Request() req,
  ) {
    return this.ticketsService.addChecklistItem(
      +id,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Patch(':id/checklist/:itemId')
  updateChecklistItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateChecklistItemDto,
    @Request() req,
  ) {
    return this.ticketsService.updateChecklistItem(
      +id,
      +itemId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Delete(':id/checklist/:itemId')
  deleteChecklistItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Request() req,
  ) {
    return this.ticketsService.deleteChecklistItem(
      +id,
      +itemId,
      req.user.userId,
      req.user.role,
    );
  }

  @Get(':id/attachments')
  getAttachments(@Param('id') id: string) {
    return this.ticketsService.getAttachments(+id);
  }

  @Post(':id/attachments')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadAttachments(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Request() req,
  ) {
    return this.ticketsService.uploadAttachments(
      +id,
      Array.isArray(files) ? files : [],
      req.user.userId,
      req.user.role,
    );
  }

  @Get(':id/attachments/:attachmentId/download')
  async downloadAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const attachment = await this.ticketsService.getAttachment(+id, +attachmentId);
    const filePath = attachment.storagePath;
    const stream = createReadStream(filePath);
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
    });
    return new StreamableFile(stream);
  }

  @Get(':id/attachments/:attachmentId/view')
  async viewAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const attachment = await this.ticketsService.getAttachment(+id, +attachmentId);
    const filePath = attachment.storagePath;
    const stream = createReadStream(filePath);
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.originalName)}"`,
    });
    return new StreamableFile(stream);
  }

  @Delete(':id/attachments/:attachmentId')
  deleteAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @Request() req,
  ) {
    return this.ticketsService.deleteAttachment(
      +id,
      +attachmentId,
      req.user.userId,
      req.user.role,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.update(
      +id,
      updateTicketDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Patch(':id/move')
  move(
    @Param('id') id: string,
    @Body() moveTicketDto: MoveTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.move(
      +id,
      moveTicketDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @Request() req,
  ) {
    return this.ticketsService.assign(
      +id,
      dto.assigneeIds ?? [],
      dto.observerIds ?? [],
      dto.responsibleId,
      req.user.userId,
      req.user.role,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.ticketsService.remove(+id, req.user.userId, req.user.role);
  }

  // ====== Tags ======

  @Get(':id/tags')
  getTicketTags(@Param('id') id: string) {
    return this.tagsService.getTagsForTicket(+id);
  }

  @Post(':id/tags/:tagId')
  async addTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @Request() req,
  ) {
    await this.ticketsService.assertCreatorCanEditTicket(+id, req.user.userId);
    return this.tagsService.addTagToTicket(+id, +tagId);
  }

  @Delete(':id/tags/:tagId')
  async removeTag(
    @Param('id') id: string,
    @Param('tagId') tagId: string,
    @Request() req,
  ) {
    await this.ticketsService.assertCreatorCanEditTicket(+id, req.user.userId);
    return this.tagsService.removeTagFromTicket(+id, +tagId);
  }
}
