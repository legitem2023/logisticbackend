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
  const nodemailer = await import('nodemailer');

  const transporter = nodemailer.createTransport({
    host: "smtp.mail.yahoo.com", // Changed from "yahoo.com" to correct Yahoo SMTP server
    port: 587,
    secure: false, // true for port 465
    auth: {
      user: 'robert_sanco_marquez1988@yahoo.com',
      pass: process.env.EMAIL_APIKEY, // Make sure this is a Yahoo APP PASSWORD, not your regular password
    },
    // Add these for better debugging and Yahoo compatibility
    debug: true,
    logger: true,
    tls: {
      rejectUnauthorized: false // Sometimes needed for Yahoo
    }
  });
console.log('APIKEY yahoo',process.env.EMAIL_APIKEY);
console.log(options);
  // Verify the connection first
  try {
    console.log("Verifying Yahoo SMTP connection...");
    await transporter.verify();
    console.log("Yahoo SMTP connection verified successfully");
  } catch (error) {
    console.error("Yahoo SMTP connection failed:", error);
    
    // Try alternative Yahoo SMTP settings
    console.log("Trying alternative Yahoo SMTP configuration...");
    return await this.sendWithYahooAlternative(options);
  }

  const mailOptions = {
    from: `"${this.config.appName}" <robert_sanco_marquez1988@yahoo.com>`, // From must match Yahoo account
    to: options.to,
    subject: options.subject,
    html: options.html,
    // Add text version as fallback
    text: options.html.replace(/<[^>]*>/g, ''),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Yahoo email sent successfully:", {
      messageId: info.messageId,
      response: info.response
    });
    return true;
  } catch (error: any) {
    console.error("❌ Yahoo email sending failed:", {
      error: error.message,
      code: error.code,
      response: error.response
    });
    
    // Check for common Yahoo errors
    if (error.code === 'EAUTH') {
      console.error("\n⚠️  AUTHENTICATION ERROR: You need to use a Yahoo APP PASSWORD.");
      console.error("1. Go to: https://login.yahoo.com/account/security");
      console.error("2. Enable 'Two-Step Verification'");
      console.error("3. Generate an 'App Password' for 'Mail'");
      console.error("4. Use that 16-character password in your EMAIL_APIKEY");
    }
    
    return false;
  }
}

// Alternative Yahoo SMTP configuration
private async sendWithYahooAlternative(options: EmailOptions): Promise<boolean> {
  const nodemailer = await import('nodemailer');

  try {
    // Try Yahoo on port 465 (SSL)
    const transporter = nodemailer.createTransport({
      host: "smtp.mail.yahoo.com",
      port: 465,
      secure: true, // SSL
      auth: {
        user: 'robert_sanco_marquez1988@yahoo.com',
        pass: process.env.EMAIL_APIKEY,
      },
      debug: true,
    });

    await transporter.verify();
    console.log("Yahoo SSL connection verified (port 465)");

    const mailOptions = {
      from: `"${this.config.appName}" <robert_sanco_marquez1988@yahoo.com>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.html.replace(/<[^>]*>/g, ''),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Yahoo SSL email sent:", info.messageId);
    return true;
  } catch (error: any) {
    console.error("Yahoo SSL also failed:", error.message);
    
    // Try one more alternative - sometimes Yahoo needs different TLS settings
    try {
      console.log("Trying final Yahoo configuration...");
      const transporter = nodemailer.createTransport({
        host: "smtp.mail.yahoo.com",
        port: 587,
        secure: false,
        auth: {
          user: 'robert_sanco_marquez1988@yahoo.com',
          pass: process.env.EMAIL_APIKEY,
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        },
        debug: true,
      });

      const mailOptions = {
        from: `"${this.config.appName}" <robert_sanco_marquez1988@yahoo.com>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("✅ Yahoo email sent with TLS fix:", info.messageId);
      return true;
    } catch (finalError) {
      console.error("All Yahoo SMTP attempts failed");
      throw finalError;
    }
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
