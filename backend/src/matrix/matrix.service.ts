import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { MatrixItem, MatrixItemStatus } from './entities/matrix-item.entity';
import { MatrixAcceptanceCriteria } from './entities/matrix-acceptance-criteria.entity';
import { MatrixDependency } from './entities/matrix-dependency.entity';
import { ProjectBaseline } from './entities/project-baseline.entity';
import { BaselineSnapshot } from './entities/baseline-snapshot.entity';
import { Ticket, TicketStatus } from '../tickets/ticket.entity';
import { Project } from '../projects/project.entity';
import { CreateMatrixItemDto } from './dto/create-matrix-item.dto';
import { UpdateMatrixItemDto } from './dto/update-matrix-item.dto';
import { CreateAcceptanceCriteriaDto } from './dto/create-acceptance-criteria.dto';
import { UpdateAcceptanceCriteriaDto } from './dto/update-acceptance-criteria.dto';
import { CreateDependencyDto } from './dto/create-dependency.dto';
import { UpdateDependencyDto } from './dto/update-dependency.dto';
import { CreateBaselineDto } from './dto/create-baseline.dto';
import { DeliverablesService } from '../deliverables/deliverables.service';

@Injectable()
export class MatrixService {
  constructor(
    @InjectRepository(MatrixItem)
    private matrixItemsRepository: Repository<MatrixItem>,
    private deliverablesService: DeliverablesService,
    @InjectRepository(MatrixAcceptanceCriteria)
    private criteriaRepository: Repository<MatrixAcceptanceCriteria>,
    @InjectRepository(MatrixDependency)
    private dependenciesRepository: Repository<MatrixDependency>,
    @InjectRepository(ProjectBaseline)
    private baselinesRepository: Repository<ProjectBaseline>,
    @InjectRepository(BaselineSnapshot)
    private snapshotsRepository: Repository<BaselineSnapshot>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  // ==================== MATRIX ITEMS ====================

  async createItem(dto: CreateMatrixItemDto): Promise<MatrixItem> {
    const project = await this.projectsRepository.findOne({ where: { id: dto.projectId } });
    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${dto.projectId} no existe`);
    }

    await this.validateUniqueCode(dto.projectId, dto.code);

    // Validate parent belongs to same project
    if (dto.parentId) {
      await this.validateParentProject(dto.projectId, dto.parentId);
    }

    // Validate date consistency
    this.validateDates(dto.plannedStart, dto.plannedEnd);

    if (dto.deliverableEntryId != null) {
      const entry = await this.deliverablesService.findOne(dto.deliverableEntryId);
      if (Number(entry.projectId) !== Number(dto.projectId)) {
        throw new BadRequestException(
          'El proyecto entregable debe pertenecer al mismo proyecto',
        );
      }
    }

    const item = this.matrixItemsRepository.create({
      ...dto,
      plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : null,
      plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : null,
      deliverableEntryId: dto.deliverableEntryId ?? null,
    });
    return this.matrixItemsRepository.save(item);
  }

  async getProjectTree(projectId: number): Promise<MatrixItem[]> {
    const items = await this.matrixItemsRepository.find({
      where: { projectId },
      relations: ['acceptanceCriteria'],
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
    return this.buildTree(items);
  }

  async getProjectTreeFlat(projectId: number): Promise<MatrixItem[]> {
    return this.matrixItemsRepository.find({
      where: { projectId },
      relations: ['acceptanceCriteria'],
      order: { sortOrder: 'ASC', code: 'ASC' },
    });
  }

  async getItem(id: number): Promise<MatrixItem> {
    const item = await this.matrixItemsRepository.findOne({
      where: { id },
      relations: [
        'acceptanceCriteria',
        'acceptanceCriteria.verifiedBy',
        'children',
        'parent',
        'project',
      ],
    });
    if (!item) throw new NotFoundException('Ítem de matriz no encontrado');
    return item;
  }

  async getItemWithTickets(
    id: number,
  ): Promise<{ item: MatrixItem; tickets: Ticket[] }> {
    const item = await this.getItem(id);
    const tickets = await this.ticketsRepository.find({
      where: { matrixItemId: id },
      relations: ['assignments', 'assignments.user', 'createdBy', 'project'],
      order: { createdAt: 'DESC' },
    });
    return { item, tickets };
  }

  async updateItem(id: number, dto: UpdateMatrixItemDto): Promise<MatrixItem> {
    const item = await this.getItem(id);

    // Validate unique code if changed
    if (dto.code !== undefined && dto.code !== item.code) {
      await this.validateUniqueCode(item.projectId, dto.code, id);
    }

    // Validate parent
    if (dto.parentId !== undefined) {
      if (dto.parentId !== null) {
        if (Number(dto.parentId) === Number(id)) {
          throw new BadRequestException(
            'Un ítem no puede ser su propio padre',
          );
        }
        await this.validateParentProject(item.projectId, dto.parentId);
        await this.detectParentCycle(id, dto.parentId);
      }
    }

    // Validate dates
    const startStr = dto.plannedStart ?? (item.plannedStart ? item.plannedStart.toISOString() : undefined);
    const endStr = dto.plannedEnd ?? (item.plannedEnd ? item.plannedEnd.toISOString() : undefined);
    this.validateDates(startStr, endStr);

    // Only apply defined fields to avoid overwriting with undefined
    if (dto.code !== undefined) item.code = dto.code;
    if (dto.title !== undefined) item.title = dto.title;
    if (dto.description !== undefined) item.description = dto.description;
    if (dto.weight !== undefined) item.weight = Number(dto.weight);
    if (dto.plannedStart !== undefined) item.plannedStart = dto.plannedStart ? new Date(dto.plannedStart) : null;
    if (dto.plannedEnd !== undefined) item.plannedEnd = dto.plannedEnd ? new Date(dto.plannedEnd) : null;
    if (dto.isMilestone !== undefined) item.isMilestone = dto.isMilestone;
    if (dto.isCriticalPath !== undefined) item.isCriticalPath = dto.isCriticalPath;
    if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder;
    if (dto.parentId !== undefined) item.parentId = dto.parentId;
    if (dto.status !== undefined) item.status = dto.status;
    if (dto.isDeliverable !== undefined) item.isDeliverable = dto.isDeliverable;
    if (dto.deliverableEntryId !== undefined) {
      if (dto.deliverableEntryId != null) {
        const entry = await this.deliverablesService.findOne(dto.deliverableEntryId);
        if (Number(entry.projectId) !== Number(item.projectId)) {
          throw new BadRequestException(
            'El proyecto entregable debe pertenecer al mismo proyecto',
          );
        }
      }
      item.deliverableEntryId = dto.deliverableEntryId;
    }

    await this.matrixItemsRepository.save(item);

    // Trigger progress recalculation if status changed
    if (dto.status !== undefined) {
      await this.recalculateParentProgress(item.id);
    }

    return this.getItem(id);
  }

  async deleteItem(id: number): Promise<{ deleted: boolean; unlinkedTickets: number }> {
    const item = await this.getItem(id);

    // Count children
    const childrenCount = await this.matrixItemsRepository.count({
      where: { parentId: id },
    });

    // Unlink tickets (SET matrixItemId = null instead of failing)
    const linkedTickets = await this.ticketsRepository.find({
      where: { matrixItemId: id },
    });

    // Also unlink tickets from children recursively
    const allDescendantIds = await this.getAllDescendantIds(id);
    const allItemIds = [id, ...allDescendantIds];

    let unlinkedCount = 0;
    for (const itemId of allItemIds) {
      const tickets = await this.ticketsRepository.find({
        where: { matrixItemId: itemId },
      });
      for (const ticket of tickets) {
        ticket.matrixItemId = null;
        await this.ticketsRepository.save(ticket);
        unlinkedCount++;
      }
    }

    // Delete dependencies where this item or descendants are involved
    for (const itemId of allItemIds) {
      await this.dependenciesRepository.delete({ predecessorId: itemId });
      await this.dependenciesRepository.delete({ successorId: itemId });
    }

    await this.matrixItemsRepository.remove(item);
    return { deleted: true, unlinkedTickets: unlinkedCount };
  }

  // ==================== ACCEPTANCE CRITERIA ====================

  async addCriteria(
    matrixItemId: number,
    dto: CreateAcceptanceCriteriaDto,
  ): Promise<MatrixAcceptanceCriteria> {
    await this.getItem(matrixItemId);
    const criteria = this.criteriaRepository.create({
      matrixItemId,
      description: dto.description,
    });
    return this.criteriaRepository.save(criteria);
  }

  async updateCriteria(
    criteriaId: number,
    dto: UpdateAcceptanceCriteriaDto,
  ): Promise<MatrixAcceptanceCriteria> {
    const criteria = await this.criteriaRepository.findOne({
      where: { id: criteriaId },
    });
    if (!criteria) throw new NotFoundException('Criterio no encontrado');
    if (dto.description !== undefined) criteria.description = dto.description;
    return this.criteriaRepository.save(criteria);
  }

  async verifyCriteria(
    criteriaId: number,
    userId: number,
    isMet: boolean,
  ): Promise<MatrixAcceptanceCriteria> {
    const criteria = await this.criteriaRepository.findOne({
      where: { id: criteriaId },
    });
    if (!criteria) throw new NotFoundException('Criterio no encontrado');
    criteria.isMet = isMet;
    criteria.verifiedByUserId = userId;
    criteria.verifiedAt = isMet ? new Date() : null;
    return this.criteriaRepository.save(criteria);
  }

  async deleteCriteria(criteriaId: number): Promise<void> {
    const result = await this.criteriaRepository.delete(criteriaId);
    if (result.affected === 0)
      throw new NotFoundException('Criterio no encontrado');
  }

  // ==================== DEPENDENCIES ====================

  async createDependency(dto: CreateDependencyDto): Promise<MatrixDependency> {
    if (dto.predecessorId === dto.successorId) {
      throw new BadRequestException('Un ítem no puede depender de sí mismo');
    }

    const predecessor = await this.getItem(dto.predecessorId);
    const successor = await this.getItem(dto.successorId);

    // Validate same project
    if (predecessor.projectId !== successor.projectId) {
      throw new BadRequestException(
        'Predecesor y sucesor deben pertenecer al mismo proyecto',
      );
    }

    // Check for duplicate
    const existing = await this.dependenciesRepository.findOne({
      where: {
        predecessorId: dto.predecessorId,
        successorId: dto.successorId,
      },
    });
    if (existing) {
      throw new ConflictException('Esta dependencia ya existe');
    }

    // Detect cycles using DFS
    await this.detectDependencyCycle(
      dto.predecessorId,
      dto.successorId,
      predecessor.projectId,
    );

    const dep = this.dependenciesRepository.create(dto);
    return this.dependenciesRepository.save(dep);
  }

  async updateDependency(
    id: number,
    dto: UpdateDependencyDto,
  ): Promise<MatrixDependency> {
    const dep = await this.dependenciesRepository.findOne({ where: { id } });
    if (!dep) throw new NotFoundException('Dependencia no encontrada');
    if (dto.type !== undefined) dep.type = dto.type;
    if (dto.lagDays !== undefined) dep.lagDays = dto.lagDays;
    return this.dependenciesRepository.save(dep);
  }

  async getDependencies(projectId: number): Promise<MatrixDependency[]> {
    return this.dependenciesRepository
      .createQueryBuilder('dep')
      .innerJoin('dep.predecessor', 'pred')
      .innerJoin('dep.successor', 'succ')
      .leftJoinAndSelect('dep.predecessor', 'predecessor')
      .leftJoinAndSelect('dep.successor', 'successor')
      .where('pred.projectId = :projectId', { projectId })
      .getMany();
  }

  async deleteDependency(id: number): Promise<void> {
    const result = await this.dependenciesRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException('Dependencia no encontrada');
  }

  // ==================== BASELINES ====================

  async createBaseline(
    dto: CreateBaselineDto,
    userId: number,
  ): Promise<ProjectBaseline> {
    const items = await this.matrixItemsRepository.find({
      where: { projectId: dto.projectId },
    });

    if (items.length === 0) {
      throw new BadRequestException(
        'El proyecto no tiene ítems en la matriz',
      );
    }

    const baseline = this.baselinesRepository.create({
      projectId: dto.projectId,
      name: dto.name,
      createdByUserId: userId,
    });
    const savedBaseline = await this.baselinesRepository.save(baseline);

    const snapshots = items.map((item) =>
      this.snapshotsRepository.create({
        baselineId: savedBaseline.id,
        matrixItemId: item.id,
        plannedStart: item.plannedStart,
        plannedEnd: item.plannedEnd,
        weight: item.weight,
      }),
    );
    await this.snapshotsRepository.save(snapshots);

    for (const item of items) {
      item.baselineStart = item.plannedStart;
      item.baselineEnd = item.plannedEnd;
    }
    await this.matrixItemsRepository.save(items);

    return this.getBaseline(savedBaseline.id);
  }

  async getBaseline(id: number): Promise<ProjectBaseline> {
    const baseline = await this.baselinesRepository.findOne({
      where: { id },
      relations: ['snapshots', 'createdBy', 'project'],
    });
    if (!baseline) throw new NotFoundException('Línea base no encontrada');
    return baseline;
  }

  async getProjectBaselines(projectId: number): Promise<ProjectBaseline[]> {
    return this.baselinesRepository.find({
      where: { projectId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== PROGRESS CALCULATION ====================

  async recalculateItemProgress(matrixItemId: number): Promise<MatrixItem> {
    const item = await this.matrixItemsRepository.findOne({
      where: { id: matrixItemId },
    });
    if (!item) throw new NotFoundException('Ítem no encontrado');

    // Check if it has children — use weighted child progress
    const children = await this.matrixItemsRepository.find({
      where: { parentId: matrixItemId },
    });

    if (children.length > 0) {
      // Parent progress = weighted average of children
      const totalWeight = children.reduce(
        (sum, c) => sum + Number(c.weight || 1),
        0,
      );
      const weightedProgress =
        totalWeight > 0
          ? children.reduce(
              (sum, c) =>
                sum +
                (Number(c.progressPercentage) * Number(c.weight || 1)) /
                  totalWeight,
              0,
            )
          : 0;
      item.progressPercentage =
        Math.round(weightedProgress * 100) / 100;

      // Status from children
      const allCompleted = children.every(
        (c) => c.status === MatrixItemStatus.COMPLETED,
      );
      const anyInProgress = children.some(
        (c) =>
          c.status === MatrixItemStatus.IN_PROGRESS ||
          c.status === MatrixItemStatus.COMPLETED,
      );
      const anyDelayed = children.some(
        (c) => c.status === MatrixItemStatus.DELAYED,
      );

      if (allCompleted) {
        item.status = MatrixItemStatus.COMPLETED;
        if (!item.actualEnd) item.actualEnd = new Date();
      } else if (anyDelayed) {
        item.status = MatrixItemStatus.DELAYED;
      } else if (anyInProgress) {
        item.status = MatrixItemStatus.IN_PROGRESS;
      } else {
        item.status = MatrixItemStatus.NOT_STARTED;
      }
    } else {
      // Leaf node — progress from tickets
      const tickets = await this.ticketsRepository.find({
        where: { matrixItemId },
      });

      if (tickets.length === 0) {
        // Leaf without tickets: respect manual status — don't overwrite
        // Just propagate upwards so parent recalculates from its children
        if (item.parentId) {
          await this.recalculateItemProgress(item.parentId);
        }
        return item;
      } else {
        const closedCount = tickets.filter(
          (t) => t.status === TicketStatus.DONE,
        ).length;
        const progress = (closedCount / tickets.length) * 100;
        item.progressPercentage = Math.round(progress * 100) / 100;

        const inProgressTickets = tickets.filter(
          (t) => t.status !== TicketStatus.OPEN,
        );
        if (inProgressTickets.length > 0 && !item.actualStart) {
          const earliest = inProgressTickets.reduce((min, t) =>
            t.updatedAt < min.updatedAt ? t : min,
          );
          item.actualStart = earliest.updatedAt;
        }

        if (closedCount === tickets.length) {
          item.status = MatrixItemStatus.COMPLETED;
          item.actualEnd = new Date();
        } else if (closedCount > 0 || inProgressTickets.length > 0) {
          if (item.plannedEnd && new Date() > item.plannedEnd) {
            item.status = MatrixItemStatus.DELAYED;
          } else {
            item.status = MatrixItemStatus.IN_PROGRESS;
          }
        } else {
          item.status = MatrixItemStatus.NOT_STARTED;
        }
      }
    }

    await this.matrixItemsRepository.save(item);

    // Propagate upwards
    if (item.parentId) {
      await this.recalculateItemProgress(item.parentId);
    }

    return item;
  }

  async recalculateProjectProgress(projectId: number): Promise<MatrixItem[]> {
    // Find leaf nodes (items with no children)
    const allItems = await this.matrixItemsRepository.find({
      where: { projectId },
    });
    const parentIds = new Set(
      allItems.filter((i) => i.parentId).map((i) => i.parentId),
    );
    const leafItems = allItems.filter((i) => !parentIds.has(i.id));

    // Recalculate from leaves up
    for (const leaf of leafItems) {
      await this.recalculateItemProgress(leaf.id);
    }

    return this.getProjectTreeFlat(projectId);
  }

  async getProjectProgress(projectId: number): Promise<{
    totalItems: number;
    completedItems: number;
    overallProgress: number;
    byStatus: Record<string, number>;
  }> {
    const items = await this.matrixItemsRepository.find({
      where: { projectId },
    });

    const allIds = items.map((i) => i.id);
    const leafItems = items.filter(
      (i) => !allIds.some((id) => items.find((j) => j.parentId === i.id)),
    );

    const totalItems = leafItems.length;
    const completedItems = leafItems.filter(
      (i) => i.status === MatrixItemStatus.COMPLETED,
    ).length;

    const totalWeight = leafItems.reduce(
      (sum, i) => sum + Number(i.weight || 1),
      0,
    );
    const weightedProgress =
      totalWeight > 0
        ? leafItems.reduce(
            (sum, i) =>
              sum +
              (Number(i.progressPercentage) * Number(i.weight || 1)) /
                totalWeight,
            0,
          )
        : 0;

    const byStatus: Record<string, number> = {
      not_started: 0,
      in_progress: 0,
      delayed: 0,
      completed: 0,
    };
    for (const item of leafItems) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    }

    return {
      totalItems,
      completedItems,
      overallProgress: Math.round(weightedProgress * 100) / 100,
      byStatus,
    };
  }

  // ==================== VALIDATION HELPERS ====================

  private async validateUniqueCode(
    projectId: number,
    code: string,
    excludeId?: number,
  ): Promise<void> {
    const where: any = { projectId, code };
    if (excludeId) where.id = Not(excludeId);
    const existing = await this.matrixItemsRepository.findOne({ where });
    if (existing) {
      throw new ConflictException(
        `Ya existe un ítem con el código "${code}" en este proyecto`,
      );
    }
  }

  private async validateParentProject(
    projectId: number,
    parentId: number,
  ): Promise<void> {
    const parent = await this.matrixItemsRepository.findOne({
      where: { id: Number(parentId) },
    });
    if (!parent) {
      throw new NotFoundException('Ítem padre no encontrado');
    }
    if (Number(parent.projectId) !== Number(projectId)) {
      throw new BadRequestException(
        'El ítem padre debe pertenecer al mismo proyecto',
      );
    }
  }

  private validateDates(
    plannedStart?: string,
    plannedEnd?: string,
  ): void {
    if (plannedStart && plannedEnd) {
      if (new Date(plannedEnd) < new Date(plannedStart)) {
        throw new BadRequestException(
          'La fecha de fin no puede ser anterior a la fecha de inicio',
        );
      }
    }
  }

  private async detectParentCycle(
    itemId: number,
    newParentId: number,
  ): Promise<void> {
    // Walk up from newParentId; if we encounter itemId, it's a cycle
    let currentId: number | null = Number(newParentId);
    const visited = new Set<number>();
    while (currentId !== null) {
      if (Number(currentId) === Number(itemId)) {
        throw new BadRequestException(
          'No se puede asignar este padre: crearía un ciclo jerárquico',
        );
      }
      if (visited.has(Number(currentId))) break;
      visited.add(Number(currentId));
      const parent = await this.matrixItemsRepository.findOne({
        where: { id: currentId },
      });
      currentId = parent?.parentId !== null && parent?.parentId !== undefined
        ? Number(parent.parentId)
        : null;
    }
  }

  private async detectDependencyCycle(
    predecessorId: number,
    successorId: number,
    projectId: number,
  ): Promise<void> {
    // If adding predecessorId -> successorId, check that there is no path from successorId -> predecessorId
    const allDeps = await this.dependenciesRepository
      .createQueryBuilder('dep')
      .innerJoin('dep.predecessor', 'pred')
      .where('pred.projectId = :projectId', { projectId })
      .getMany();

    // Build adjacency list: predecessor -> [successors]
    const adj = new Map<number, number[]>();
    for (const dep of allDeps) {
      if (!adj.has(dep.predecessorId)) adj.set(dep.predecessorId, []);
      adj.get(dep.predecessorId)!.push(dep.successorId);
    }

    // Add the proposed edge temporarily
    if (!adj.has(predecessorId)) adj.set(predecessorId, []);
    adj.get(predecessorId)!.push(successorId);

    // DFS from successorId to see if we can reach predecessorId
    const visited = new Set<number>();
    const stack = [successorId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === predecessorId) {
        throw new BadRequestException(
          'No se puede crear esta dependencia: crearía un ciclo',
        );
      }
      if (visited.has(current)) continue;
      visited.add(current);
      const neighbors = adj.get(current) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) stack.push(n);
      }
    }
  }

  private async getAllDescendantIds(itemId: number): Promise<number[]> {
    const children = await this.matrixItemsRepository.find({
      where: { parentId: itemId },
    });
    const result: number[] = [];
    for (const child of children) {
      result.push(child.id);
      const grandChildren = await this.getAllDescendantIds(child.id);
      result.push(...grandChildren);
    }
    return result;
  }

  private async recalculateParentProgress(itemId: number): Promise<void> {
    const item = await this.matrixItemsRepository.findOne({
      where: { id: itemId },
    });
    if (item?.parentId) {
      await this.recalculateItemProgress(item.parentId);
    }
  }

  // ==================== TREE BUILDER ====================

  private buildTree(items: MatrixItem[]): MatrixItem[] {
    const map = new Map<number, MatrixItem>();
    const roots: MatrixItem[] = [];

    for (const item of items) {
      (item as any).children = [];
      map.set(item.id, item);
    }

    for (const item of items) {
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children.push(item);
      } else {
        roots.push(item);
      }
    }

    return roots;
  }
}
