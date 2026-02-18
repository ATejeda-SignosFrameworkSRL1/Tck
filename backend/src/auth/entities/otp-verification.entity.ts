import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export type OtpPurpose = 'registration' | 'password_recovery' | 'email_change';

@Entity('otp_verification', { schema: 'core' })
export class OtpVerification {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 6 })
  code: string;

  @Column({ length: 20, default: 'registration' })
  purpose: OtpPurpose;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date;

  @Column({ default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', default: 5 })
  maxAttempts: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  // Helper para verificar si el OTP es válido
  isValid(): boolean {
    if (this.isVerified) return false;
    if (new Date() > this.expiresAt) return false;
    if (this.attempts >= this.maxAttempts) return false;
    return true;
  }

  // Helper para verificar si se excedieron los intentos
  hasExceededAttempts(): boolean {
    return this.attempts >= this.maxAttempts;
  }
}
