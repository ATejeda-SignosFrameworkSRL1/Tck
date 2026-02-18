import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliverableEntry, DeliverableStatus } from './entities/deliverable-entry.entity';
import { DeliverableImageUpload } from './entities/deliverable-image-upload.entity';
import { Project } from '../projects/project.entity';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';

@Injectable()
export class DeliverablesService {
  constructor(
    @InjectRepository(DeliverableEntry)
    private deliverablesRepo: Repository<DeliverableEntry>,
    @InjectRepository(DeliverableImageUpload)
    private imageUploadsRepo: Repository<DeliverableImageUpload>,
    @InjectRepository(Project)
    private projectsRepo: Repository<Project>,
  ) {}

  async saveImageUpload(data: Buffer, mimetype: string, filename?: string): Promise<{ id: number }> {
    const row = this.imageUploadsRepo.create({ data, mimetype, filename: filename || null });
    const saved = await this.imageUploadsRepo.save(row);
    return { id: saved.id };
  }

  async getImageUpload(id: number): Promise<{ data: Buffer; mimetype: string }> {
    const row = await this.imageUploadsRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Upload no encontrado');
    return { data: row.data, mimetype: row.mimetype };
  }

  async deleteImageUpload(id: number): Promise<void> {
    await this.imageUploadsRepo.delete(id);
  }

  async getEntryPhotoData(entryId: number, kind: 'before' | 'after'): Promise<{ data: Buffer; mimetype: string }> {
    const entry = await this.deliverablesRepo
      .createQueryBuilder('d')
      .select('d.id')
      .addSelect('d.baselinePhotoBeforeData')
      .addSelect('d.baselinePhotoBeforeMimetype')
      .addSelect('d.baselinePhotoAfterData')
      .addSelect('d.baselinePhotoAfterMimetype')
      .where('d.id = :entryId', { entryId })
      .getOne();
    if (!entry) throw new NotFoundException('Entregable no encontrado');
    const data = kind === 'before' ? entry.baselinePhotoBeforeData : entry.baselinePhotoAfterData;
    const mimetype = kind === 'before' ? entry.baselinePhotoBeforeMimetype : entry.baselinePhotoAfterMimetype;
    if (!data || !mimetype) throw new NotFoundException('Imagen no encontrada');
    return { data, mimetype };
  }

  private async applyImageUploadToEntry(
    entry: DeliverableEntry,
    slot: 'before' | 'after',
    imageUploadId: number | undefined,
  ): Promise<void> {
    if (imageUploadId == null) return;
    const { data, mimetype } = await this.getImageUpload(imageUploadId);
    if (slot === 'before') {
      entry.baselinePhotoBeforeData = data;
      entry.baselinePhotoBeforeMimetype = mimetype;
      entry.baselinePhotoBefore = null;
    } else {
      entry.baselinePhotoAfterData = data;
      entry.baselinePhotoAfterMimetype = mimetype;
      entry.baselinePhotoAfter = null;
    }
    await this.deleteImageUpload(imageUploadId);
  }

  async create(dto: CreateDeliverableDto): Promise<DeliverableEntry> {
    const project = await this.projectsRepo.findOne({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Proyecto no encontrado');

    const maxNumber = await this.deliverablesRepo
      .createQueryBuilder('d')
      .select('MAX(d.entryNumber)', 'max')
      .where('d.projectId = :projectId', { projectId: dto.projectId })
      .getRawOne();

    const entryNumber = (maxNumber?.max || 0) + 1;

    const entry = this.deliverablesRepo.create({
      projectId: dto.projectId,
      entryNumber,
      name: dto.name,
      description: dto.description || '',
      phase: dto.phase || 1,
      responsibleFront: dto.responsibleFront || '',
      plannedDeliveryDate: dto.plannedDeliveryDate ? new Date(dto.plannedDeliveryDate) : null,
      actualDeliveryDate: dto.actualDeliveryDate ? new Date(dto.actualDeliveryDate) : null,
      status: dto.status || DeliverableStatus.NOT_STARTED,
      progressPercentage: dto.progressPercentage || 0,
      elaborationResponsibleName: dto.elaborationResponsibleName || '',
      elaborationResponsibleOrg: dto.elaborationResponsibleOrg || '',
      acceptanceCriteria: dto.acceptanceCriteria || '',
      reviewInstanceName: dto.reviewInstanceName || '',
      approvalInstanceName: dto.approvalInstanceName || '',
      baselinePhotoBefore: dto.imageUploadIdBefore != null ? null : (dto.baselinePhotoBefore || null),
      baselinePhotoAfter: dto.imageUploadIdAfter != null ? null : (dto.baselinePhotoAfter || null),
      sortOrder: entryNumber,
    });

    const saved = await this.deliverablesRepo.save(entry);
    await this.applyImageUploadToEntry(saved, 'before', dto.imageUploadIdBefore);
    await this.applyImageUploadToEntry(saved, 'after', dto.imageUploadIdAfter);
    return this.deliverablesRepo.save(saved);
  }

  async findAllByProject(projectId: number): Promise<any[]> {
    const entries = await this.deliverablesRepo
      .createQueryBuilder('d')
      .addSelect('CASE WHEN d.baseline_photo_before_data IS NOT NULL THEN true ELSE false END', 'hasPhotoBefore')
      .addSelect('CASE WHEN d.baseline_photo_after_data IS NOT NULL THEN true ELSE false END', 'hasPhotoAfter')
      .where('d.projectId = :projectId', { projectId })
      .orderBy('d.sortOrder', 'ASC')
      .addOrderBy('d.entryNumber', 'ASC')
      .getRawAndEntities();

    const rawMap = new Map<string, { hasPhotoBefore: boolean; hasPhotoAfter: boolean }>();
    for (const raw of entries.raw) {
      rawMap.set(String(raw.d_id), {
        hasPhotoBefore: raw.hasPhotoBefore === true || raw.hasPhotoBefore === 't' || raw.hasPhotoBefore === 'true',
        hasPhotoAfter: raw.hasPhotoAfter === true || raw.hasPhotoAfter === 't' || raw.hasPhotoAfter === 'true',
      });
    }

    return entries.entities.map((e) => {
      const flags = rawMap.get(String(e.id)) || { hasPhotoBefore: false, hasPhotoAfter: false };
      return { ...e, hasPhotoBefore: flags.hasPhotoBefore, hasPhotoAfter: flags.hasPhotoAfter };
    });
  }

  async findOne(id: number): Promise<any> {
    const result = await this.deliverablesRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.project', 'project')
      .addSelect('CASE WHEN d.baseline_photo_before_data IS NOT NULL THEN true ELSE false END', 'hasPhotoBefore')
      .addSelect('CASE WHEN d.baseline_photo_after_data IS NOT NULL THEN true ELSE false END', 'hasPhotoAfter')
      .where('d.id = :id', { id })
      .getRawAndEntities();

    const entry = result.entities[0];
    if (!entry) throw new NotFoundException('Entregable no encontrado');
    const raw = result.raw[0];
    return {
      ...entry,
      hasPhotoBefore: raw?.hasPhotoBefore === true || raw?.hasPhotoBefore === 't' || raw?.hasPhotoBefore === 'true',
      hasPhotoAfter: raw?.hasPhotoAfter === true || raw?.hasPhotoAfter === 't' || raw?.hasPhotoAfter === 'true',
    };
  }

  async update(id: number, dto: UpdateDeliverableDto): Promise<DeliverableEntry> {
    const entry = await this.findOne(id);

    if (dto.name !== undefined) entry.name = dto.name;
    if (dto.description !== undefined) entry.description = dto.description;
    if (dto.phase !== undefined) entry.phase = dto.phase;
    if (dto.responsibleFront !== undefined) entry.responsibleFront = dto.responsibleFront;
    if (dto.plannedDeliveryDate !== undefined)
      entry.plannedDeliveryDate = dto.plannedDeliveryDate ? new Date(dto.plannedDeliveryDate) : null;
    if (dto.actualDeliveryDate !== undefined)
      entry.actualDeliveryDate = dto.actualDeliveryDate ? new Date(dto.actualDeliveryDate) : null;
    if (dto.status !== undefined) entry.status = dto.status;
    if (dto.progressPercentage !== undefined) entry.progressPercentage = dto.progressPercentage;
    if (dto.elaborationResponsibleName !== undefined) entry.elaborationResponsibleName = dto.elaborationResponsibleName;
    if (dto.elaborationResponsibleOrg !== undefined) entry.elaborationResponsibleOrg = dto.elaborationResponsibleOrg;
    if (dto.acceptanceCriteria !== undefined) entry.acceptanceCriteria = dto.acceptanceCriteria;
    if (dto.reviewInstanceName !== undefined) entry.reviewInstanceName = dto.reviewInstanceName;
    if (dto.approvalInstanceName !== undefined) entry.approvalInstanceName = dto.approvalInstanceName;
    if (dto.baselinePhotoBefore !== undefined) entry.baselinePhotoBefore = dto.baselinePhotoBefore;
    if (dto.baselinePhotoAfter !== undefined) entry.baselinePhotoAfter = dto.baselinePhotoAfter;
    if (dto.sortOrder !== undefined) entry.sortOrder = dto.sortOrder;

    if (dto.imageUploadIdBefore != null) {
      await this.applyImageUploadToEntry(entry, 'before', dto.imageUploadIdBefore);
    }
    if (dto.imageUploadIdAfter != null) {
      await this.applyImageUploadToEntry(entry, 'after', dto.imageUploadIdAfter);
    }

    return this.deliverablesRepo.save(entry);
  }

  async remove(id: number): Promise<{ deleted: boolean }> {
    const entry = await this.findOne(id);
    await this.deliverablesRepo.remove(entry);
    return { deleted: true };
  }

  async getSummary(projectId: number): Promise<{
    projectName: string;
    projectUpdatedAt: string;
    clientLogoUrl: string | null;
    companyLogoUrl: string | null;
    totalEntries: number;
    completedEntries: number;
    overallProgress: number;
    byStatus: Record<string, number>;
  }> {
    const project = await this.projectsRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Proyecto no encontrado');

    const entries = await this.findAllByProject(projectId);

    const byStatus: Record<string, number> = {
      sin_iniciar: 0,
      avanzado: 0,
      terminado: 0,
    };

    let totalProgress = 0;
    for (const e of entries) {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
      totalProgress += Number(e.progressPercentage);
    }

    const overallProgress = entries.length > 0
      ? Math.round((totalProgress / entries.length) * 100) / 100
      : 0;

    return {
      projectName: project.name,
      projectUpdatedAt: project.updatedAt?.toISOString() || new Date().toISOString(),
      clientLogoUrl: (project as any).clientLogoUrl || null,
      companyLogoUrl: (project as any).companyLogoUrl || null,
      totalEntries: entries.length,
      completedEntries: byStatus.terminado || 0,
      overallProgress,
      byStatus,
    };
  }

  async updateProjectLogos(
    projectId: number,
    data: { clientLogoUrl?: string; companyLogoUrl?: string },
  ): Promise<Project> {
    const project = await this.projectsRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Proyecto no encontrado');

    if (data.clientLogoUrl !== undefined) (project as any).clientLogoUrl = data.clientLogoUrl;
    if (data.companyLogoUrl !== undefined) (project as any).companyLogoUrl = data.companyLogoUrl;

    return this.projectsRepo.save(project);
  }
}
