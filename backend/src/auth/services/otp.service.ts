import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OtpVerification, OtpPurpose } from '../entities/otp-verification.entity';
import { MailService } from '../../mail/mail.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(OtpVerification)
    private otpRepository: Repository<OtpVerification>,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  // Generar código OTP de 6 dígitos
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generar token de verificación único
  private generateVerificationToken(): string {
    return Buffer.from(`${Date.now()}-${Math.random().toString(36)}`).toString('base64');
  }

  // Enviar OTP por email
  async sendOtp(email: string, purpose: OtpPurpose = 'registration'): Promise<{ message: string; expiresAt: Date }> {
    // Invalidar OTPs anteriores del mismo email y propósito
    await this.otpRepository.update(
      { email, purpose, isVerified: false },
      { isVerified: true }, // Marcar como usado para invalidar
    );

    // Generar nuevo código
    const code = this.generateCode();
    const expiryMinutes = this.configService.get<number>('OTP_EXPIRY_MINUTES', 10);
    const maxAttempts = this.configService.get<number>('OTP_MAX_ATTEMPTS', 5);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Guardar en base de datos
    const otp = this.otpRepository.create({
      email,
      code,
      purpose,
      expiresAt,
      maxAttempts,
    });
    await this.otpRepository.save(otp);

    // Enviar email
    const emailSent = await this.mailService.sendOtpEmail(email, code, purpose);

    if (!emailSent) {
      this.logger.warn(`No se pudo enviar OTP a ${email}, pero se guardó en BD`);
    }

    this.logger.log(`OTP generado para ${email} (${purpose}): ${code}`);

    return {
      message: 'Código OTP enviado a tu correo electrónico',
      expiresAt,
    };
  }

  // Verificar OTP
  async verifyOtp(email: string, code: string, purpose: OtpPurpose = 'registration'): Promise<{ verified: boolean; verificationToken?: string }> {
    // Buscar OTP válido más reciente
    const otp = await this.otpRepository.findOne({
      where: {
        email,
        purpose,
        isVerified: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!otp) {
      throw new BadRequestException('No hay un código OTP válido para este email. Solicita uno nuevo.');
    }

    // Verificar intentos
    if (otp.hasExceededAttempts()) {
      throw new BadRequestException('Has excedido el número máximo de intentos. Solicita un nuevo código.');
    }

    // Incrementar intentos
    otp.attempts += 1;
    await this.otpRepository.save(otp);

    // Verificar código
    if (otp.code !== code) {
      const remainingAttempts = otp.maxAttempts - otp.attempts;
      throw new BadRequestException(`Código incorrecto. Te quedan ${remainingAttempts} intentos.`);
    }

    // Marcar como verificado
    otp.isVerified = true;
    otp.verifiedAt = new Date();
    await this.otpRepository.save(otp);

    // Generar token de verificación
    const verificationToken = this.generateVerificationToken();

    this.logger.log(`OTP verificado exitosamente para ${email}`);

    return {
      verified: true,
      verificationToken,
    };
  }

  // Verificar si un email tiene un OTP verificado recientemente (para el flujo de registro)
  async isEmailVerified(email: string, purpose: OtpPurpose = 'registration'): Promise<boolean> {
    // Buscar OTP verificado en los últimos 30 minutos
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const verifiedOtp = await this.otpRepository.findOne({
      where: {
        email,
        purpose,
        isVerified: true,
        verifiedAt: MoreThan(thirtyMinutesAgo),
      },
      order: { verifiedAt: 'DESC' },
    });

    return !!verifiedOtp;
  }

  // Limpiar OTPs expirados (para ejecutar con cron)
  async cleanExpiredOtps(): Promise<number> {
    const result = await this.otpRepository.delete({
      expiresAt: MoreThan(new Date(0)), // Todos
      isVerified: false,
    });

    // Solo eliminar los que ya expiraron y no fueron verificados
    const deleted = await this.otpRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .andWhere('is_verified = false')
      .execute();

    this.logger.log(`Limpiados ${deleted.affected} OTPs expirados`);
    return deleted.affected || 0;
  }
}
