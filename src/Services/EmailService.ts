// src/services/EmailService.ts
import { generatePasswordResetEmail } from '../emailTemplates/passwordResetEmail.js';

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
  
  // Add nodemailer specific properties
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: {
    user?: string;
    pass?: string;
  };
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

    const fromEmail = options.from || this.config.fromEmail!;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: `${this.config.appName} <${fromEmail}>`,
          to: [options.to],
          subject: options.subject,
          html: options.html
        })
      });

      const data = await response.json();
      console.log("Resend response:", JSON.stringify(data, null, 2));

      return response.ok;
    } catch (error) {
      console.error("Resend error:", error);
      return false;
    }
  }

  private async sendWithNodemailer(options: EmailOptions): Promise<boolean> {
    const nodemailer = await import('nodemailer');

    // Use config values or environment variables
    const host = this.config.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = this.config.port || parseInt(process.env.SMTP_PORT || '587');
    const secure = this.config.secure !== undefined ? this.config.secure : (process.env.SMTP_SECURE === 'true' || port === 465);
    const user = this.config.auth?.user || process.env.SMTP_USER || process.env.EMAIL_USER;
    const pass = this.config.auth?.pass || process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;

    if (!user || !pass) {
      throw new Error('SMTP credentials not found. Please configure auth.user and auth.pass or set SMTP_USER/SMTP_PASSWORD environment variables.');
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      // Optional: Add TLS options
      tls: {
        rejectUnauthorized: false // For self-signed certificates
      }
    });

    // Verify the connection first
    try {
      console.log("Verifying SMTP connection...");
      await transporter.verify();
      console.log("✅ SMTP connection verified successfully");
    } catch (error: any) {
      console.error("❌ SMTP connection failed:", error.message);
      
      if (error.code === 'EAUTH') {
        console.error("\n⚠️  AUTHENTICATION ERROR:");
        console.error(`Host: ${host}`);
        console.error(`Port: ${port}`);
        console.error(`User: ${user}`);
        console.error("Check your credentials and ensure they're correct");
        
        if (host.includes('gmail.com')) {
          console.error("\nFor Gmail:");
          console.error("1. Enable 2-Step Verification at: https://myaccount.google.com/security");
          console.error("2. Generate an 'App Password' for 'Mail'");
          console.error("3. Use that 16-character password as your SMTP password");
        }
      }
      
      return false;
    }

    const mailOptions = {
      from: `"${this.config.appName}" <${user}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      // Add text version as fallback
      text: options.html.replace(/<[^>]*>/g, ''),
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Email sent successfully:", {
        messageId: info.messageId,
        accepted: info.accepted,
        response: info.response
      });
      return true;
    } catch (error: any) {
      console.error("❌ Email sending failed:", {
        error: error.message,
        code: error.code,
        response: error.response
      });
      return false;
    }
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
