import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'El código OTP debe tener 6 dígitos' })
  code: string;
}
