import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export enum OtpPurposeEnum {
  REGISTRATION = 'registration',
  PASSWORD_RECOVERY = 'password_recovery',
  EMAIL_CHANGE = 'email_change',
}

export class SendOtpDto {
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;

  @IsEnum(OtpPurposeEnum)
  @IsOptional()
  purpose?: OtpPurposeEnum = OtpPurposeEnum.REGISTRATION;
}
