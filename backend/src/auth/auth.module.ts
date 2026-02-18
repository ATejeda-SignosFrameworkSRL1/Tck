import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

// Entidades
import { Invitation } from './entities/invitation.entity';
import { OtpVerification } from './entities/otp-verification.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { User } from '../users/user.entity';
import { UserDepartment } from '../users/user-department.entity';

// Servicios
import { OtpService } from './services/otp.service';
import { InvitationService } from './services/invitation.service';

@Module({
  imports: [
    UsersModule,
    MailModule,
    PassportModule,
    TypeOrmModule.forFeature([
      Invitation,
      OtpVerification,
      PasswordResetToken,
      User,
      UserDepartment,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
        signOptions: { 
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '7d') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    OtpService,
    InvitationService,
  ],
  exports: [AuthService, OtpService, InvitationService],
})
export class AuthModule {}
