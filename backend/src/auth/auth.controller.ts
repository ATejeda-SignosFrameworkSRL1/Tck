import { Controller, Post, Body, UseGuards, Get, Request, Delete, Param, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { OtpService } from './services/otp.service';
import { InvitationService } from './services/invitation.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ValidateInvitationDto } from './dto/validate-invitation.dto';
import { SecureRegisterDto } from './dto/secure-register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private otpService: OtpService,
    private invitationService: InvitationService,
  ) {}

  // ==================== REGISTRO LEGACY ====================
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  // ==================== SECURE ONBOARDING FLOW ====================

  /**
   * Paso 1: Enviar OTP para registro
   * POST /auth/otp/send
   */
  @Post('otp/send')
  async sendOtp(@Body() dto: SendOtpDto) {
    if (dto.purpose === 'registration' || !dto.purpose) {
      return this.authService.sendRegistrationOtp(dto.email);
    }
    return this.otpService.sendOtp(dto.email, dto.purpose);
  }

  /**
   * Paso 2: Verificar OTP
   * POST /auth/otp/verify
   */
  @Post('otp/verify')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyRegistrationOtp(dto.email, dto.code);
  }

  /**
   * Paso 3: Validar código de invitación
   * POST /auth/invitation/validate
   */
  @Post('invitation/validate')
  async validateInvitation(@Body() dto: ValidateInvitationDto) {
    return this.authService.validateInvitationCode(dto.pinCode);
  }

  /**
   * Paso 4: Registro seguro completo
   * POST /auth/secure-register
   */
  @Post('secure-register')
  async secureRegister(@Body() dto: SecureRegisterDto) {
    return this.authService.secureRegister(dto);
  }

  // ==================== PASSWORD RECOVERY FLOW ====================

  /**
   * Solicitar recuperación de contraseña
   * POST /auth/forgot-password
   */
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordRecovery(dto.email);
  }

  /**
   * Resetear contraseña con OTP
   * POST /auth/reset-password
   */
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ==================== LOGIN ====================
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  // ==================== GESTIÓN DE INVITACIONES (ADMIN) ====================

  /**
   * Crear nueva invitación (solo admin)
   * POST /auth/invitations
   */
  @Post('invitations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createInvitation(@Body() dto: CreateInvitationDto, @Request() req) {
    return this.invitationService.createInvitation(dto, req.user.id);
  }

  /**
   * Listar invitaciones (solo admin)
   * GET /auth/invitations?includeUsed=false
   */
  @Get('invitations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listInvitations(@Query('includeUsed') includeUsed: string) {
    return this.invitationService.findAll(includeUsed === 'true');
  }

  /**
   * Estadísticas de invitaciones (solo admin)
   * GET /auth/invitations/stats
   */
  @Get('invitations/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getInvitationStats() {
    return this.invitationService.getStats();
  }

  /**
   * Eliminar invitación (solo admin)
   * DELETE /auth/invitations/:id
   */
  @Delete('invitations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteInvitation(@Param('id') id: string) {
    return this.invitationService.delete(+id);
  }
}
