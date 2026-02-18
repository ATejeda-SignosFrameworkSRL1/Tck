import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService {
  private transporter: Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = this.configService.get<number>('MAIL_PORT', 465);
    const secure = this.configService.get<string>('MAIL_SECURE', 'true') === 'true';
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false, // Para desarrollo
      },
    });

    // Verificar conexión
    this.transporter.verify((error) => {
      if (error) {
        this.logger.warn(`Error al conectar con servidor SMTP: ${error.message}`);
      } else {
        this.logger.log('Servidor SMTP conectado correctamente');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const from = this.configService.get<string>('MAIL_FROM', 'noreply@sistema.com');

    try {
      const result = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      });

      this.logger.log(`Email enviado a ${options.to}: ${result.messageId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error al enviar email a ${options.to}: ${error.message}`);
      return false;
    }
  }

  // Plantilla para OTP de registro
  async sendOtpEmail(email: string, code: string, purpose: string = 'registro'): Promise<boolean> {
    const purposeText = {
      registration: 'completar tu registro',
      password_recovery: 'recuperar tu contraseña',
      email_change: 'cambiar tu email',
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #4F46E5; margin: 0; font-size: 24px; }
          .code-box { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; text-align: center; padding: 25px; border-radius: 10px; margin: 25px 0; }
          .code { font-size: 36px; letter-spacing: 8px; font-weight: bold; font-family: monospace; }
          .message { color: #374151; line-height: 1.6; }
          .footer { text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 20px 0; border-radius: 4px; color: #92400E; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Sistema de Tickets</h1>
          </div>
          
          <p class="message">Hola,</p>
          <p class="message">Utiliza el siguiente código para <strong>${purposeText[purpose] || purpose}</strong>:</p>
          
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          
          <div class="warning">
            ⚠️ Este código expira en <strong>10 minutos</strong>. No compartas este código con nadie.
          </div>
          
          <p class="message">Si no solicitaste este código, puedes ignorar este mensaje.</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Sistema de Tickets - Signos</p>
            <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Tu código de verificación: ${code}`,
      html,
    });
  }

  // Plantilla para bienvenida después del registro
  async sendWelcomeEmail(email: string, name: string, role: string): Promise<boolean> {
    const roleText = {
      admin: 'Administrador',
      dev: 'Desarrollador',
      user: 'Usuario',
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #4F46E5; margin: 0; font-size: 24px; }
          .welcome-box { background: linear-gradient(135deg, #10B981, #059669); color: white; text-align: center; padding: 25px; border-radius: 10px; margin: 25px 0; }
          .message { color: #374151; line-height: 1.6; }
          .role-badge { display: inline-block; background: #4F46E5; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; }
          .footer { text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; }
          .btn { display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Sistema de Tickets</h1>
          </div>
          
          <div class="welcome-box">
            <h2 style="margin: 0;">¡Bienvenido/a!</h2>
          </div>
          
          <p class="message">Hola <strong>${name}</strong>,</p>
          <p class="message">Tu cuenta ha sido creada exitosamente en el Sistema de Tickets.</p>
          
          <p class="message">
            Tu rol asignado es: <span class="role-badge">${roleText[role] || role}</span>
          </p>
          
          <p class="message">Ya puedes iniciar sesión y comenzar a utilizar el sistema.</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Sistema de Tickets - Signos</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `¡Bienvenido al Sistema de Tickets, ${name}!`,
      html,
    });
  }

  // Plantilla para confirmación de cambio de contraseña
  async sendPasswordChangedEmail(email: string, name: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #4F46E5; margin: 0; font-size: 24px; }
          .message { color: #374151; line-height: 1.6; }
          .success-box { background: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px 16px; margin: 20px 0; border-radius: 4px; color: #92400E; font-size: 14px; }
          .footer { text-align: center; color: #9CA3AF; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>Sistema de Tickets</h1>
          </div>
          
          <p class="message">Hola <strong>${name}</strong>,</p>
          
          <div class="success-box">
            <strong>✅ Tu contraseña ha sido cambiada exitosamente.</strong>
          </div>
          
          <p class="message">Este cambio se realizó el ${new Date().toLocaleString('es-DO')}.</p>
          
          <div class="warning">
            ⚠️ Si no realizaste este cambio, contacta inmediatamente al administrador del sistema.
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Sistema de Tickets - Signos</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Tu contraseña ha sido cambiada',
      html,
    });
  }
}
