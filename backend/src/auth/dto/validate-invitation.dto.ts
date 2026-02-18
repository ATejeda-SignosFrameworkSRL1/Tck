import { IsString, MinLength } from 'class-validator';

export class ValidateInvitationDto {
  @IsString()
  @MinLength(5, { message: 'El código PIN debe tener al menos 5 caracteres' })
  pinCode: string;
}
