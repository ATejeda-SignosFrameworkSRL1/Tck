import { IsEmail, IsString, MinLength, IsOptional, IsArray, IsNumber } from 'class-validator';

export class SecureRegisterDto {
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @IsString()
  @MinLength(5, { message: 'El código PIN de invitación es requerido' })
  pinCode: string;

  @IsString()
  otpVerificationToken: string; // Token que confirma que el OTP fue verificado

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  departmentIds?: number[];
}
