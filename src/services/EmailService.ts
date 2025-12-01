// src/services/EmailService.ts
import { generatePasswordResetEmail } from '../../emailTemplates/passwordResetEmail.js';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailServiceConfig {
  service: 'sendgrid' | 'resend' | 'nodemailer' | 'console';
  apiKey?: string;
  fromEmail?: string;
  appName?: string;
  baseUrl?: string;
}

export class EmailService {
  private config: EmailServiceConfig;

  constructor(config: EmailServiceConfig) {
    this.config = {
      fromEmail: 'noreply@yourapp.com',
      appName: 'Our App',
      baseUrl: 'http://localhost:3000',
      ...config
    };
  }

  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      switch (this.config.service) {
        case 'sendgrid':
          return await this.sendWithSendGrid(options);
        case 'resend':
          return await this.sendWithResend(options);
        case 'nodemailer':
          return await this.sendWithNodemailer(options);
        case 'console':
        default:
          return await this.sendToConsole(options);
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  private async sendWithSendGrid(options: EmailOptions): Promise<boolean> {
    if (!this.config.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: options.from || this.config.fromEmail!, name: this.config.appName },
        subject: options.subject,
        content: [{ type: 'text/html', value: options.html }],
      }),
    });

    return response.ok;
  }

  private async sendWithResend(options: EmailOptions): Promise<boolean> {
    if (!this.config.apiKey) {
      throw new Error('Resend API key is required');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${this.config.appName} <${options.from || this.config.fromEmail}>`,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    return response.ok;
  }

  private async sendWithNodemailer(options: EmailOptions): Promise<boolean> {
    // This would require nodemailer to be installed
    console.log('Nodemailer would send email to:', options.to);
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }

  private async sendToConsole(options: EmailOptions): Promise<boolean> {
    console.log('📧 Email would be sent:');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('HTML Preview:', options.html.substring(0, 200) + '...');
    console.log('---');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }

  public async sendPasswordResetEmail(
    email: string, 
    resetToken: string,
    expiryTime: string = '1 hour'
  ): Promise<boolean> {
    const resetLink = `${this.config.baseUrl}/reset-password?token=${resetToken}`;
    
    const htmlContent = generatePasswordResetEmail({
      userEmail: email,
      resetLink,
      expiryTime,
      appName: this.config.appName
    });

    const emailOptions: EmailOptions = {
      to: email,
      subject: `Reset Your Password - ${this.config.appName}`,
      html: htmlContent,
      from: this.config.fromEmail,
    };

    return await this.sendEmail(emailOptions);
  }
}
