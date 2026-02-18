import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  email: string;
}
