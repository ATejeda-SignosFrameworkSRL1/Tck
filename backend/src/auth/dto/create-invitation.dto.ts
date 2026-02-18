import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import type { InvitationRole } from '../entities/invitation.entity';

export class CreateInvitationDto {
  @IsString()
  @IsOptional()
  pinCode?: string; // Si no se proporciona, se genera automáticamente

  @IsEnum(['admin', 'dev', 'user'], { message: 'El rol debe ser admin, dev o user' })
  targetRole: 'admin' | 'dev' | 'user';

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
