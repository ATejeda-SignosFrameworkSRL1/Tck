import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './ticket.entity';
import { TicketAssignment } from './ticket-assignment.entity';
import { TicketTransition } from './ticket-transition.entity';
import { TicketChecklistItem } from './ticket-checklist-item.entity';
import { TicketAttachment } from './ticket-attachment.entity';
import { MatrixItem, MatrixItemStatus } from '../matrix/entities/matrix-item.entity';
import { Project } from '../projects/project.entity';
import { Department } from '../departments/department.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateChecklistItemDto } from './dto/create-checklist-item.dto';
import { UpdateChecklistItemDto } from './dto/update-checklist-item.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { MoveTicketDto } from './dto/move-ticket.dto';
import { FilterTicketsDto } from './dto/filter-tickets.dto';
import { UserRole } from '../users/user.entity';
import { UserDepartment } from '../users/user-department.entity';

/** Transiciones permitidas según el rol del usuario en el flujo SIPE */
const ALLOWED_TRANSITIONS: Record<string, Record<string, string[]>> = {
  // Ejecutor (user/dev): solo puede avanzar hasta En Revisión
  [UserRole.USER]: {
    [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS],
    [TicketStatus.IN_PROGRESS]: [TicketStatus.IN_REVIEW, TicketStatus.BLOCKED],
    [TicketStatus.BLOCKED]: [TicketStatus.IN_PROGRESS],
  },
  [UserRole.DEV]: {
    [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS],
    [TicketStatus.IN_PROGRESS]: [TicketStatus.IN_REVIEW, TicketStatus.BLOCKED],
    [TicketStatus.BLOCKED]: [TicketStatus.IN_PROGRESS],
  },
  // Supervisor: puede aprobar o rechazar desde En Revisión
  [UserRole.SUPERVISOR]: {
    [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS],
    [TicketStatus.IN_PROGRESS]: [TicketStatus.IN_REVIEW, TicketStatus.BLOCKED],
    [TicketStatus.BLOCKED]: [TicketStatus.IN_PROGRESS],
    [TicketStatus.IN_REVIEW]: [TicketStatus.DONE, TicketStatus.IN_PROGRESS],
  },
  // Admin (PM): puede hacer cualquier transición
  [UserRole.ADMIN]: {
    [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.BLOCKED, TicketStatus.DONE],
    [TicketStatus.IN_PROGRESS]: [TicketStatus.IN_REVIEW, TicketStatus.BLOCKED, TicketStatus.OPEN, TicketStatus.DONE],
    [TicketStatus.BLOCKED]: [TicketStatus.IN_PROGRESS, TicketStatus.OPEN],
    [TicketStatus.IN_REVIEW]: [TicketStatus.DONE, TicketStatus.IN_PROGRESS],
    [TicketStatus.DONE]: [TicketStatus.IN_PROGRESS, TicketStatus.OPEN],
  },
};

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketAssignment)
    private assignmentsRepository: Repository<TicketAssignment>,
    @InjectRepository(TicketTransition)
    private transitionsRepository: Repository<TicketTransition>,
    @InjectRepository(TicketChecklistItem)
    private checklistRepository: Repository<TicketChecklistItem>,
    @InjectRepository(TicketAttachment)
    private attachmentsRepository: Repository<TicketAttachment>,
    @InjectRepository(UserDepartment)
    private userDepartmentsRepository: Repository<UserDepartment>,
    @InjectRepository(MatrixItem)
    private matrixItemsRepository: Repository<MatrixItem>,
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) {}

  async create(
    createTicketDto: CreateTicketDto,
    userId: number,
  ): Promise<Ticket> {
    const { assignedUserIds, observerIds, responsibleId, checklistItems: checklistItemsDto, ...ticketData } = createTicketDto;

    // ── Validaciones de existencia (FK) ──
    const project = await this.projectsRepository.findOne({ where: { id: ticketData.projectId } });
    if (!project) {
      throw new BadRequestException(`El proyecto con ID ${ticketData.projectId} no existe.`);
    }

    const originDept = await this.departmentsRepository.findOne({ where: { id: ticketData.originDepartmentId } });
    if (!originDept) {
      throw new BadRequestException(`El departamento de origen con ID ${ticketData.originDepartmentId} no existe.`);
    }

    if (ticketData.targetDepartmentId) {
      const targetDept = await this.departmentsRepository.findOne({ where: { id: ticketData.targetDepartmentId } });
      if (!targetDept) {
        throw new BadRequestException(`El departamento destino con ID ${ticketData.targetDepartmentId} no existe.`);
      }
    }

    if (ticketData.matrixItemId) {
      const matrixItem = await this.matrixItemsRepository.findOne({ where: { id: ticketData.matrixItemId } });
      if (!matrixItem) {
        throw new BadRequestException(`El ítem de matriz con ID ${ticketData.matrixItemId} no existe.`);
      }
    }

    const payload: Record<string, unknown> = {
      ...ticketData,
      description: ticketData.description ?? '',
      createdByUserId: userId,
      currentDepartmentId: ticketData.originDepartmentId,
    };
    if (ticketData.startDate) payload.startDate = new Date(ticketData.startDate);
    if (ticketData.dueDate) payload.dueDate = new Date(ticketData.dueDate);

    let savedTicket: Ticket;
    try {
      const ticket = this.ticketsRepository.create(payload as Partial<Ticket>);
      savedTicket = await this.ticketsRepository.save(ticket);
    } catch (err: any) {
      // Capturar violaciones FK residuales
      if (err?.code === '23503') {
        const detail = err?.detail || '';
        this.logger.error(`FK violation al crear ticket: ${detail}`, err.stack);
        throw new BadRequestException(`Error de referencia: ${detail}`);
      }
      throw err;
    }

    if ((assignedUserIds?.length ?? 0) > 0 || (observerIds?.length ?? 0) > 0 || responsibleId) {
      await this.updateAssignments(savedTicket.id, assignedUserIds ?? [], observerIds ?? [], responsibleId);
    }

    if (checklistItemsDto && checklistItemsDto.length > 0) {
      const items = checklistItemsDto.map((item, idx) =>
        this.checklistRepository.create({
          ticketId: savedTicket.id,
          text: item.text,
          sortOrder: idx,
        }),
      );
      await this.checklistRepository.save(items);
    }

    return this.findOne(savedTicket.id);
  }

  async findAll(filters?: FilterTicketsDto): Promise<Ticket[]> {
    const query = this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.project', 'project')
      .leftJoinAndSelect('ticket.originDepartment', 'originDepartment')
      .leftJoinAndSelect('ticket.currentDepartment', 'currentDepartment')
      .leftJoinAndSelect('ticket.targetDepartment', 'targetDepartment')
      .leftJoinAndSelect('ticket.assignments', 'assignments')
      .leftJoinAndSelect('assignments.user', 'assignedUser')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .leftJoinAndSelect('ticket.ticketTags', 'ticketTags')
      .leftJoinAndSelect('ticketTags.tag', 'tag')
      .orderBy('ticket.createdAt', 'DESC');

    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim();
      const pattern = `%${term}%`;
      query.andWhere(
        '(ticket.title ILIKE :searchPattern OR ticket.description ILIKE :searchPattern OR CAST(ticket.id AS TEXT) LIKE :searchPattern)',
        { searchPattern: pattern },
      );
    }

    if (filters?.projectId) {
      query.andWhere('ticket.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }

    if (filters?.currentDepartmentId) {
      query.andWhere('ticket.currentDepartmentId = :currentDepartmentId', {
        currentDepartmentId: filters.currentDepartmentId,
      });
    }

    if (filters?.originDepartmentId) {
      query.andWhere('ticket.originDepartmentId = :originDepartmentId', {
        originDepartmentId: filters.originDepartmentId,
      });
    }

    if (filters?.targetDepartmentId) {
      query.andWhere('ticket.targetDepartmentId = :targetDepartmentId', {
        targetDepartmentId: filters.targetDepartmentId,
      });
    }

    if (filters?.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }

    if (filters?.priority) {
      query.andWhere('ticket.priority = :priority', { priority: filters.priority });
    }

    if (filters?.createdBy) {
      query.andWhere('ticket.createdByUserId = :createdBy', {
        createdBy: filters.createdBy,
      });
    }

    if (filters?.assignedTo) {
      query.andWhere('assignedUser.id = :assignedTo', {
        assignedTo: filters.assignedTo,
      });
    }

    if (filters?.dueDateFrom) {
      query.andWhere('ticket.dueDate >= :dueDateFrom', {
        dueDateFrom: filters.dueDateFrom,
      });
    }

    if (filters?.dueDateTo) {
      query.andWhere('ticket.dueDate <= :dueDateTo', {
        dueDateTo: filters.dueDateTo,
      });
    }

    if (filters?.tagIds) {
      const tagIdsArray = Array.isArray(filters.tagIds)
        ? filters.tagIds.map(Number)
        : [Number(filters.tagIds)];
      if (tagIdsArray.length > 0) {
      query.andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select('tt.ticket_id')
          .from('tick.ticket_tags', 'tt')
          .where('tt.tag_id IN (:...tagIds)')
          .groupBy('tt.ticket_id')
          .having('COUNT(DISTINCT tt.tag_id) = :tagCount')
          .getQuery();
        return `ticket.id IN ${subQuery}`;
      })
      .setParameter('tagIds', tagIdsArray)
      .setParameter('tagCount', tagIdsArray.length);
      }
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: [
        'project',
        'originDepartment',
        'currentDepartment',
        'targetDepartment',
        'assignments',
        'assignments.user',
        'createdBy',
        'transitions',
        'transitions.fromDepartment',
        'transitions.toDepartment',
        'transitions.movedByUser',
        'checklistItems',
        'attachments',
        'attachments.uploadedBy',
        'ticketTags',
        'ticketTags.tag',
      ],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    return ticket;
  }

  async update(
    id: number,
    updateTicketDto: UpdateTicketDto,
    userId: number,
    userRole: UserRole,
  ): Promise<Ticket> {
    const ticket = await this.findOne(id);
    this.assertCanEdit(ticket, userId, userRole);

    const { assignedUserIds, observerIds, responsibleId, ...ticketData } = updateTicketDto;

    // ====== QUALITY GATES: Validar transiciones de estado (SIPE) ======
    if (ticketData.status && ticketData.status !== ticket.status) {
      await this.validateStatusTransition(ticket, ticketData.status, userRole);
    }

    // Actualizar asignaciones si se proporcionaron
    if (assignedUserIds !== undefined || observerIds !== undefined || responsibleId !== undefined) {
      const currentAssignees = ticket.assignments?.filter((a) => a.role === 'assignee').map((a) => a.userId) ?? [];
      const currentObservers = ticket.assignments?.filter((a) => a.role === 'observer').map((a) => a.userId) ?? [];
      const currentResponsible = ticket.assignments?.find((a) => a.role === 'responsible')?.userId;
      const assignees = assignedUserIds ?? currentAssignees;
      const observers = observerIds ?? currentObservers;
      const responsible = responsibleId ?? currentResponsible;
      await this.updateAssignments(id, assignees, observers, responsible);
    }

    const previousStatus = ticket.status;
    Object.assign(ticket, ticketData);
    if (ticketData.startDate !== undefined) ticket.startDate = new Date(ticketData.startDate);
    if (ticketData.dueDate !== undefined) ticket.dueDate = new Date(ticketData.dueDate);
    await this.ticketsRepository.save(ticket);

    // ====== REGLAS SIPE: Auto-actualización de la Matriz ======
    if (ticketData.status && ticketData.status !== previousStatus) {
      await this.applyMatrixRules(ticket, previousStatus, ticketData.status);
    }

    return this.findOne(id);
  }

  async move(
    id: number,
    moveTicketDto: MoveTicketDto,
    userId: number,
    _userRole: UserRole,
  ): Promise<Ticket> {
    const ticket = await this.findOne(id);
    this.assertCanEdit(ticket, userId, _userRole);

    // Validar que el departamento destino es diferente al actual
    if (ticket.currentDepartmentId === moveTicketDto.toDepartmentId) {
      throw new BadRequestException(
        'El ticket ya está en ese departamento',
      );
    }

    // Registrar la transición
    const transition = this.transitionsRepository.create({
      ticketId: id,
      fromDepartmentId: ticket.currentDepartmentId,
      toDepartmentId: moveTicketDto.toDepartmentId,
      movedByUserId: userId,
      note: moveTicketDto.note,
    });

    await this.transitionsRepository.save(transition);

    // Actualizar departamento actual del ticket
    ticket.currentDepartmentId = moveTicketDto.toDepartmentId;
    await this.ticketsRepository.save(ticket);

    return this.findOne(id);
  }

  async assign(
    id: number,
    assigneeIds: number[],
    observerIds: number[],
    responsibleId: number | undefined,
    userId: number,
    _userRole: UserRole,
  ): Promise<Ticket> {
    const ticket = await this.findOne(id);
    this.assertCanEdit(ticket, userId, _userRole);

    await this.updateAssignments(id, assigneeIds, observerIds ?? [], responsibleId);
    return this.findOne(id);
  }

  async remove(id: number, userId: number, _userRole: UserRole): Promise<void> {
    const ticket = await this.findOne(id);
    this.assertCanEdit(ticket, userId, _userRole);
    await this.ticketsRepository.remove(ticket);
  }

  // ============ Métodos privados ============

  private async assignUsers(
    ticketId: number,
    userIds: number[],
    role: 'assignee' | 'observer' | 'responsible',
  ): Promise<void> {
    if (userIds.length === 0) return;
    const assignments = userIds.map((userId) =>
      this.assignmentsRepository.create({ ticketId, userId, role }),
    );
    await this.assignmentsRepository.save(assignments);
  }

  private async updateAssignments(
    ticketId: number,
    assigneeIds: number[],
    observerIds: number[] = [],
    responsibleId?: number,
  ): Promise<void> {
    await this.assignmentsRepository.delete({ ticketId });

    const assigneeUnique = [...new Set(assigneeIds)];
    const observerUnique = [...new Set(observerIds)].filter((id) => !assigneeUnique.includes(id));
    await this.assignUsers(ticketId, assigneeUnique, 'assignee');
    await this.assignUsers(ticketId, observerUnique, 'observer');

    // Responsable de seguimiento (un solo usuario con rol 'responsible')
    if (responsibleId) {
      await this.assignUsers(ticketId, [responsibleId], 'responsible');
    }
  }

  /**
   * Verifica si el usuario puede editar el ticket.
   * Admin y Supervisor pueden editar cualquier ticket.
   * Ejecutores solo pueden editar tickets que crearon o donde están asignados.
   */
  private assertCanEdit(ticket: Ticket, userId: number, userRole: UserRole): void {
    // Admin y Supervisor pueden editar cualquier ticket
    if (userRole === UserRole.ADMIN || userRole === UserRole.SUPERVISOR) {
      return;
    }
    // Creador puede editar
    if (ticket.createdByUserId === userId) {
      return;
    }
    // Usuarios asignados pueden editar
    const isAssigned = ticket.assignments?.some((a) => a.userId === userId);
    if (isAssigned) {
      return;
    }
    throw new ForbiddenException(
      'No tienes permiso para editar este ticket.',
    );
  }

  /** Comprueba que el usuario pueda editar el ticket. */
  async assertCreatorCanEditTicket(ticketId: number, userId: number): Promise<void> {
    const ticket = await this.findOne(ticketId);
    // Mantener compatibilidad: Admin siempre puede
    if (ticket.createdByUserId !== userId) {
      throw new ForbiddenException(
        'Solo el creador del ticket puede realizar esta acción.',
      );
    }
  }

  // ============ QUALITY GATES (SIPE) ============

  /**
   * REGLA 05: Valida que la transición de estado sea permitida según el rol.
   * También valida que se cumplan los requisitos de salida de cada estado.
   */
  private async validateStatusTransition(
    ticket: Ticket,
    newStatus: TicketStatus,
    userRole: UserRole,
  ): Promise<void> {
    const roleTransitions = ALLOWED_TRANSITIONS[userRole];
    if (!roleTransitions) {
      throw new ForbiddenException(
        `El rol "${userRole}" no tiene permitido cambiar estados de tickets.`,
      );
    }

    const allowed = roleTransitions[ticket.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Transición no permitida: ${ticket.status} → ${newStatus} para rol ${userRole}`,
      );
    }

    // REGLA 05: No permitir mover a "En Revisión" sin documentación anexa
    if (newStatus === TicketStatus.IN_REVIEW) {
      const attachmentCount = await this.attachmentsRepository.count({
        where: { ticketId: ticket.id },
      });
      if (attachmentCount === 0) {
        throw new BadRequestException(
          'No se puede mover a "En Revisión" sin documentación anexa. Suba al menos un archivo.',
        );
      }
    }

    // Validar que un ticket bloqueado tenga comentario justificando (verificado en frontend)
  }

  /**
   * Aplica las reglas de auto-actualización de la Matriz al cambiar el estado de un ticket.
   * REGLA 01: Al completar todos los tickets de un ítem → marcar ítem al 100%
   * REGLA 02: Al iniciar primer ticket → registrar fecha inicio real
   * REGLA 03: Si ticket en ruta crítica se bloquea → alertar (log + marca rojo)
   */
  private async applyMatrixRules(
    ticket: Ticket,
    previousStatus: TicketStatus,
    newStatus: TicketStatus,
  ): Promise<void> {
    if (!ticket.matrixItemId) return;

    try {
      const matrixItem = await this.matrixItemsRepository.findOne({
        where: { id: ticket.matrixItemId },
      });
      if (!matrixItem) return;

      // Obtener todos los tickets vinculados a este ítem
      const siblingTickets = await this.ticketsRepository.find({
        where: { matrixItemId: ticket.matrixItemId },
      });

      const totalTickets = siblingTickets.length;
      const closedTickets = siblingTickets.filter(
        (t) => t.status === TicketStatus.DONE || (t.id === ticket.id && newStatus === TicketStatus.DONE),
      ).length;

      // REGLA 02: Al iniciar el primer ticket, registrar fecha inicio real
      if (newStatus === TicketStatus.IN_PROGRESS && !matrixItem.actualStart) {
        matrixItem.actualStart = new Date();
        matrixItem.status = MatrixItemStatus.IN_PROGRESS;
        this.logger.log(
          `REGLA 02: Fecha inicio real registrada para ítem ${matrixItem.code}`,
        );
      }

      // REGLA 01: Al completar todos los tickets → 100%
      if (totalTickets > 0) {
        const progress = (closedTickets / totalTickets) * 100;
        matrixItem.progressPercentage = Math.round(progress * 100) / 100;

        if (closedTickets === totalTickets) {
          matrixItem.status = MatrixItemStatus.COMPLETED;
          matrixItem.actualEnd = new Date();
          this.logger.log(
            `REGLA 01: Ítem ${matrixItem.code} completado al 100%`,
          );
        }
      }

      // REGLA 03: Si ticket en ruta crítica se bloquea → marcar partida rojo
      if (newStatus === TicketStatus.BLOCKED && matrixItem.isCriticalPath) {
        matrixItem.status = MatrixItemStatus.DELAYED;
        this.logger.warn(
          `REGLA 03: ¡ALERTA! Ticket #${ticket.id} en ruta crítica bloqueado. Partida ${matrixItem.code} marcada como RETRASADA.`,
        );
      }

      // REGLA 04: Verificar desvío de tiempo
      if (matrixItem.plannedEnd && new Date() > matrixItem.plannedEnd && matrixItem.status !== MatrixItemStatus.COMPLETED) {
        if (matrixItem.status !== MatrixItemStatus.DELAYED) {
          matrixItem.status = MatrixItemStatus.DELAYED;
          this.logger.warn(
            `REGLA 04: Desvío detectado en ítem ${matrixItem.code}. Fecha fin planificada ya pasó.`,
          );
        }
      }

      await this.matrixItemsRepository.save(matrixItem);
    } catch (error) {
      this.logger.error(`Error aplicando reglas SIPE: ${error.message}`);
    }
  }

  private async userHasAccessToTicket(
    userId: number,
    userRole: UserRole,
    ticket: Ticket,
  ): Promise<boolean> {
    // Admin tiene acceso a todo (solo lectura para no-creadores; la edición se controla con assertCreatorCanEdit)
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // El creador tiene acceso
    if (ticket.createdByUserId === userId) {
      return true;
    }

    // Los usuarios asignados tienen acceso (vista)
    const isAssigned = ticket.assignments?.some((a) => a.userId === userId);
    if (isAssigned) {
      return true;
    }

    // Usuarios que pertenecen al departamento actual tienen acceso (vista)
    const belongsToDepartment = await this.userBelongsToDepartment(
      userId,
      ticket.currentDepartmentId,
    );
    if (belongsToDepartment) {
      return true;
    }

    return false;
  }

  private async userBelongsToDepartment(
    userId: number,
    departmentId: number,
  ): Promise<boolean> {
    const userDepartment = await this.userDepartmentsRepository.findOne({
      where: { userId, departmentId },
    });
    return !!userDepartment;
  }

  // Obtener tickets visibles para un usuario (según sus departamentos)
  async findByUserDepartments(userId: number, userRole: UserRole): Promise<Ticket[]> {
    // Admin ve todos los tickets
    if (userRole === UserRole.ADMIN) {
      return this.findAll();
    }

    // Obtener departamentos del usuario
    const userDepartments = await this.userDepartmentsRepository.find({
      where: { userId },
    });

    const departmentIds = userDepartments.map((ud) => ud.departmentId);

    if (departmentIds.length === 0) {
      // Si no tiene departamentos, solo ve los tickets que creó
      return this.findAll({ createdBy: userId });
    }

    // Ver tickets de sus departamentos o creados por él
    const query = this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.project', 'project')
      .leftJoinAndSelect('ticket.originDepartment', 'originDepartment')
      .leftJoinAndSelect('ticket.currentDepartment', 'currentDepartment')
      .leftJoinAndSelect('ticket.targetDepartment', 'targetDepartment')
      .leftJoinAndSelect('ticket.assignments', 'assignments')
      .leftJoinAndSelect('assignments.user', 'assignedUser')
      .leftJoinAndSelect('ticket.createdBy', 'createdBy')
      .where('ticket.currentDepartmentId IN (:...departmentIds)', { departmentIds })
      .orWhere('ticket.createdByUserId = :userId', { userId })
      .orderBy('ticket.createdAt', 'DESC');

    return query.getMany();
  }

  // --------------- Checklist ---------------
  async getChecklistItems(ticketId: number): Promise<TicketChecklistItem[]> {
    await this.findOne(ticketId);
    return this.checklistRepository.find({
      where: { ticketId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async addChecklistItem(
    ticketId: number,
    dto: CreateChecklistItemDto,
    userId: number,
    _userRole: UserRole,
  ): Promise<TicketChecklistItem> {
    const ticket = await this.findOne(ticketId);
    this.assertCanEdit(ticket, userId, _userRole);
    const maxOrder = await this.checklistRepository
      .createQueryBuilder('c')
      .select('COALESCE(MAX(c.sort_order), -1)', 'max')
      .where('c.ticket_id = :ticketId', { ticketId })
      .getRawOne<{ max: number }>();
    const item = this.checklistRepository.create({
      ticketId,
      text: dto.text,
      sortOrder: (maxOrder?.max ?? -1) + 1,
    });
    return this.checklistRepository.save(item);
  }

  async updateChecklistItem(
    ticketId: number,
    itemId: number,
    dto: UpdateChecklistItemDto,
    userId: number,
    _userRole: UserRole,
  ): Promise<TicketChecklistItem> {
    const ticket = await this.findOne(ticketId);
    this.assertCanEdit(ticket, userId, _userRole);
    const item = await this.checklistRepository.findOne({
      where: { id: itemId, ticketId },
    });
    if (!item) throw new NotFoundException('Ítem de checklist no encontrado');
    Object.assign(item, dto);
    return this.checklistRepository.save(item);
  }

  async deleteChecklistItem(
    ticketId: number,
    itemId: number,
    userId: number,
    _userRole: UserRole,
  ): Promise<void> {
    const ticket = await this.findOne(ticketId);
    this.assertCanEdit(ticket, userId, _userRole);
    const result = await this.checklistRepository.delete({ id: itemId, ticketId });
    if (result.affected === 0) throw new NotFoundException('Ítem de checklist no encontrado');
  }

  // --------------- Attachments ---------------
  async getAttachments(ticketId: number): Promise<TicketAttachment[]> {
    await this.findOne(ticketId);
    return this.attachmentsRepository.find({
      where: { ticketId },
      order: { createdAt: 'DESC' },
      relations: ['uploadedBy'],
    });
  }

  async uploadAttachments(
    ticketId: number,
    files: Express.Multer.File[],
    userId: number,
    _userRole: UserRole,
  ): Promise<TicketAttachment[]> {
    const ticket = await this.findOne(ticketId);
    this.assertCanEdit(ticket, userId, _userRole);
    if (!files?.length) throw new BadRequestException('No se enviaron archivos');
    const created: TicketAttachment[] = [];
    for (const file of files) {
      const attachment = this.attachmentsRepository.create({
        ticketId,
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: file.path,
        uploadedByUserId: userId,
      });
      created.push(await this.attachmentsRepository.save(attachment));
    }
    return created;
  }

  async getAttachment(ticketId: number, attachmentId: number): Promise<TicketAttachment> {
    const ticket = await this.findOne(ticketId);
    const attachment = await this.attachmentsRepository.findOne({
      where: { id: attachmentId, ticketId },
    });
    if (!attachment) throw new NotFoundException('Adjunto no encontrado');
    return attachment;
  }

  async deleteAttachment(
    ticketId: number,
    attachmentId: number,
    userId: number,
    _userRole: UserRole,
  ): Promise<void> {
    const attachment = await this.getAttachment(ticketId, attachmentId);
    const ticket = await this.findOne(ticketId);
    this.assertCanEdit(ticket, userId, _userRole);
    const fs = await import('fs/promises');
    try {
      await fs.unlink(attachment.storagePath);
    } catch {
      // ignorar si el archivo ya no existe
    }
    await this.attachmentsRepository.remove(attachment);
  }
}
