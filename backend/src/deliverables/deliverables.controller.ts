import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { DeliverablesService } from './deliverables.service';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

const UPLOADS_DELIVERABLES = join(process.cwd(), 'uploads', 'deliverables');

@Controller('deliverables')
@UseGuards(JwtAuthGuard)
export class DeliverablesController {
  constructor(private readonly deliverablesService: DeliverablesService) {}

  @Post('upload/image')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @UsePipes(new ValidationPipe({ transform: false }))
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se envió ninguna imagen');
    const allowed =
      /^image\/(png|jpeg|jpg|gif|webp|svg\+xml|svg|x-png)$/i.test(file.mimetype) ||
      file.mimetype?.startsWith('image/');
    if (!allowed) throw new BadRequestException('Solo se permiten imágenes (PNG, JPG, SVG, etc.)');
    if (!file.buffer) throw new BadRequestException('Imagen no disponible en memoria');
    return this.deliverablesService.saveImageUpload(file.buffer, file.mimetype || 'image/png', file.originalname);
  }

  @Get('upload/:id')
  async serveUploadImage(@Param('id') id: string, @Res() res: Response) {
    const { data, mimetype } = await this.deliverablesService.getImageUpload(+id);
    res.set('Content-Type', mimetype);
    return res.send(data);
  }

  @Get('entry/:entryId/photo/before')
  async serveEntryPhotoBefore(@Param('entryId') entryId: string, @Res() res: Response) {
    const { data, mimetype } = await this.deliverablesService.getEntryPhotoData(+entryId, 'before');
    res.set('Content-Type', mimetype);
    return res.send(data);
  }

  @Get('entry/:entryId/photo/after')
  async serveEntryPhotoAfter(@Param('entryId') entryId: string, @Res() res: Response) {
    const { data, mimetype } = await this.deliverablesService.getEntryPhotoData(+entryId, 'after');
    res.set('Content-Type', mimetype);
    return res.send(data);
  }

  @Get('serve/:filename')
  serveImage(@Param('filename') filename: string, @Res() res: Response) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = join(UPLOADS_DELIVERABLES, safe);
    if (!existsSync(filePath)) return res.status(404).send('No encontrado');
    const ext = (safe.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
    const mime: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
    res.set('Content-Type', mime[ext] || 'application/octet-stream');
    return createReadStream(filePath).pipe(res);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  create(@Body() dto: CreateDeliverableDto) {
    return this.deliverablesService.create(dto);
  }

  @Get('project/:projectId')
  findAllByProject(@Param('projectId') projectId: string) {
    return this.deliverablesService.findAllByProject(+projectId);
  }

  @Get('project/:projectId/summary')
  getSummary(@Param('projectId') projectId: string) {
    return this.deliverablesService.getSummary(+projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliverablesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  update(@Param('id') id: string, @Body() dto: UpdateDeliverableDto) {
    return this.deliverablesService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  remove(@Param('id') id: string) {
    return this.deliverablesService.remove(+id);
  }

  @Patch('project/:projectId/logos')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  updateLogos(
    @Param('projectId') projectId: string,
    @Body() data: { clientLogoUrl?: string; companyLogoUrl?: string },
  ) {
    return this.deliverablesService.updateProjectLogos(+projectId, data);
  }
}
