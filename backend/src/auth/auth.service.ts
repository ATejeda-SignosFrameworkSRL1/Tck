import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/user.entity';
import { UserDepartment } from '../users/user-department.entity';
import { Invitation } from './entities/invitation.entity';
import { OtpVerification } from './entities/otp-verification.entity';
import { OtpService } from './services/otp.service';
import { InvitationService } from './services/invitation.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SecureRegisterDto } from './dto/secure-register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private otpService: OtpService,
    private invitationService: InvitationService,
    private mailService: MailService,
    private dataSource: DataSource,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Invitation)
    private invitationRepository: Repository<Invitation>,
    @InjectRepository(UserDepartment)
    private userDepartmentRepository: Repository<UserDepartment>,
  ) {}

  // ==================== REGISTRO SIMPLE (legacy) ====================
  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  // ==================== SECURE ONBOARDING FLOW ====================

  /**
   * Paso 1: Enviar OTP al email
   */
  async sendRegistrationOtp(email: string) {
    // Verificar que el email no esté registrado
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Este email ya está registrado');
    }

    return this.otpService.sendOtp(email, 'registration');
  }

  /**
   * Paso 2: Verificar OTP
   */
  async verifyRegistrationOtp(email: string, code: string) {
    return this.otpService.verifyOtp(email, code, 'registration');
  }

  /**
   * Paso 3: Validar código de invitación
   */
  async validateInvitationCode(pinCode: string) {
    return this.invitationService.validateInvitation(pinCode);
  }

  /**
   * Paso 4: Registro completo con transacción atómica
   * - Crear usuario con rol de la invitación
   * - Marcar invitación como usada
   * - Asignar departamentos (opcional)
   * - Generar JWT
   */
  async secureRegister(dto: SecureRegisterDto) {
    // Validaciones previas
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new BadRequestException('Este email ya está registrado');
    }

    // Verificar que el OTP fue verificado
    const otpVerified = await this.otpService.isEmailVerified(dto.email, 'registration');
    if (!otpVerified) {
      throw new BadRequestException('Debes verificar tu email antes de completar el registro');
    }

    // Obtener invitación
    const invitation = await this.invitationService.findByPinCode(dto.pinCode);
    if (!invitation || !invitation.isValid()) {
      throw new BadRequestException('Código de invitación inválido o expirado');
    }

    // ========== TRANSACCIÓN ATÓMICA ==========
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Crear usuario con rol de la invitación
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = queryRunner.manager.create(User, {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: invitation.targetRole as UserRole,
      });
      await queryRunner.manager.save(user);

      // La invitación no se marca como usada: el mismo PIN puede usarse para registrar varios usuarios con el mismo rol

      // 2. Asignar departamentos si se proporcionan
      if (dto.departmentIds && dto.departmentIds.length > 0) {
        for (const deptId of dto.departmentIds) {
          const userDept = queryRunner.manager.create(UserDepartment, {
            userId: user.id,
            departmentId: deptId,
          });
          await queryRunner.manager.save(userDept);
        }
      }

      // Commit de la transacción
      await queryRunner.commitTransaction();

      this.logger.log(`Usuario registrado exitosamente: ${user.email} (${user.role})`);

      // 4. Enviar email de bienvenida (fuera de transacción)
      await this.mailService.sendWelcomeEmail(user.email, user.name, user.role);

      // 5. Generar JWT
      const payload = { email: user.email, sub: user.id, role: user.role };
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        message: 'Registro completado exitosamente',
      };
    } catch (error) {
      // Rollback en caso de error
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error en registro: ${error.message}`);
      throw new BadRequestException('Error al procesar el registro. Intenta nuevamente.');
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== PASSWORD RECOVERY FLOW ====================

  /**
   * Paso 1: Solicitar recuperación de contraseña (enviar OTP)
   */
  async requestPasswordRecovery(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Por seguridad, no revelamos si el email existe o no
      return {
        message: 'Si el email existe, recibirás un código de verificación',
      };
    }

    return this.otpService.sendOtp(email, 'password_recovery');
  }

  /**
   * Paso 2: Resetear contraseña con OTP
   */
  async resetPassword(dto: ResetPasswordDto) {
    // Verificar OTP
    const verification = await this.otpService.verifyOtp(
      dto.email,
      dto.otpCode,
      'password_recovery',
    );

    if (!verification.verified) {
      throw new BadRequestException('Código OTP inválido');
    }

    // Buscar usuario
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    // Actualizar contraseña
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    this.logger.log(`Contraseña cambiada para: ${user.email}`);

    // Enviar notificación por email
    await this.mailService.sendPasswordChangedEmail(user.email, user.name);

    return {
      message: 'Contraseña actualizada exitosamente',
    };
  }

  // ==================== LOGIN ====================
  async login(loginDto: LoginDto) {
    try {
      const user = await this.usersService.findByEmail(loginDto.email);

      if (!user) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      if (!user.password || typeof user.password !== 'string') {
        this.logger.warn(`Login: usuario ${loginDto.email} sin contraseña válida en BD`);
        throw new UnauthorizedException('Credenciales inválidas');
      }

      const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      const sub = typeof user.id === 'bigint' ? Number(user.id) : user.id;
      const payload = { email: user.email, sub, role: user.role };
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: sub,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error(`Login error: ${err?.message ?? err}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }
  }

  async validateUser(userId: number) {
    return this.usersService.findOne(userId);
  }
}
