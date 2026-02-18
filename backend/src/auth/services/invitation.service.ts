import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull, Or } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Invitation, InvitationRole } from '../entities/invitation.entity';
import { CreateInvitationDto } from '../dto/create-invitation.dto';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    private configService: ConfigService,
  ) {}

  // Generar PIN único
  private generatePinCode(role: InvitationRole): string {
    const prefix = role.toUpperCase();
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${year}-${random}`;
  }

  // Crear nueva invitación (solo admins)
  async createInvitation(dto: CreateInvitationDto, createdByUserId?: number): Promise<Invitation> {
    const pinCode = dto.pinCode || this.generatePinCode(dto.targetRole);

    // Verificar que el PIN no exista
    const existing = await this.invitationRepository.findOne({
      where: { pinCode },
    });

    if (existing) {
      throw new BadRequestException('Este código PIN ya existe');
    }

    // Calcular fecha de expiración
    const defaultExpiryDays = this.configService.get<number>('INVITATION_DEFAULT_EXPIRY_DAYS', 30);
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(Date.now() + defaultExpiryDays * 24 * 60 * 60 * 1000);

    const invitation = this.invitationRepository.create({
      pinCode,
      targetRole: dto.targetRole,
      description: dto.description,
      expiresAt,
      createdByUserId,
    });

    await this.invitationRepository.save(invitation);
    this.logger.log(`Invitación creada: ${pinCode} (${dto.targetRole})`);

    return invitation;
  }

  // Validar invitación (devuelve info del rol si es válida)
  async validateInvitation(pinCode: string): Promise<{ valid: boolean; role: InvitationRole; description?: string }> {
    const invitation = await this.invitationRepository.findOne({
      where: { pinCode },
    });

    if (!invitation) {
      throw new NotFoundException('Código de invitación no encontrado');
    }

    // Permitir reutilizar el mismo PIN para registrar varios usuarios con el mismo rol
    if (invitation.expiresAt && new Date() > invitation.expiresAt) {
      throw new BadRequestException('Esta invitación ha expirado');
    }

    return {
      valid: true,
      role: invitation.targetRole,
      description: invitation.description,
    };
  }

  // Marcar invitación como usada (dentro de transacción)
  async markAsUsed(pinCode: string, userId: number): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { pinCode },
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    invitation.isUsed = true;
    invitation.usedByUserId = userId;
    invitation.usedAt = new Date();

    await this.invitationRepository.save(invitation);
    this.logger.log(`Invitación ${pinCode} marcada como usada por usuario ${userId}`);
  }

  // Obtener invitación por PIN (para uso interno en transacciones)
  async findByPinCode(pinCode: string): Promise<Invitation | null> {
    return this.invitationRepository.findOne({
      where: { pinCode },
    });
  }

  // Listar invitaciones (para panel de admin)
  async findAll(includeUsed: boolean = false): Promise<Invitation[]> {
    const where: any = {};
    if (!includeUsed) {
      where.isUsed = false;
    }

    return this.invitationRepository.find({
      where,
      order: { createdAt: 'DESC' },
      relations: ['usedByUser', 'createdByUser'],
    });
  }

  // Eliminar invitación
  async delete(id: number): Promise<void> {
    const invitation = await this.invitationRepository.findOne({ where: { id } });
    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    if (invitation.isUsed) {
      throw new BadRequestException('No se puede eliminar una invitación ya utilizada');
    }

    await this.invitationRepository.delete(id);
    this.logger.log(`Invitación ${id} eliminada`);
  }

  // Estadísticas de invitaciones
  async getStats(): Promise<{ total: number; used: number; available: number; expired: number }> {
    const total = await this.invitationRepository.count();
    const used = await this.invitationRepository.count({ where: { isUsed: true } });
    
    const now = new Date();
    const expired = await this.invitationRepository
      .createQueryBuilder('inv')
      .where('inv.is_used = false')
      .andWhere('inv.expires_at < :now', { now })
      .getCount();

    return {
      total,
      used,
      available: total - used - expired,
      expired,
    };
  }
}
