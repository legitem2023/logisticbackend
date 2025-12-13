// src/services/EmailService.ts
import { generatePasswordResetEmail } from '../emailTemplates/passwordResetEmail';

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

  const fromEmail = options.from; // VERIFIED DOMAIN EMAIL

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: `Adiviso App <${fromEmail}>`,
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

  // Get Google credentials from environment variables
  const gmailUser = options.from;
  const gmailPassword = process.env.EMAIL_APIKEY;

  if (!gmailUser || !gmailPassword) {
    throw new Error('Google SMTP credentials not found. Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.');
  }

  // Create transporter for Google SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use TLS
    auth: {
      user: gmailUser,
      pass: gmailPassword,
    }
  });

  // Verify the connection first
  try {
    console.log("Verifying Google SMTP connection...");
    await transporter.verify();
    console.log("✅ Google SMTP connection verified successfully");
  } catch (error: any) {
    console.error("❌ Google SMTP connection failed:", error.message);
    
    if (error.code === 'EAUTH') {
      console.error("\n⚠️  GOOGLE AUTHENTICATION ERROR: You need to use a Google App Password.");
      console.error("1. Enable 2-Step Verification at: https://myaccount.google.com/security");
      console.error("2. Generate an 'App Password' for 'Mail'");
      console.error("3. Use that 16-character password as GMAIL_APP_PASSWORD");
    }
    
    return false;
  }

  const mailOptions = {
    from: `"${this.config.appName}" <${gmailUser}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
    // Add text version as fallback
    text: options.html.replace(/<[^>]*>/g, ''),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Google email sent successfully:", {
      messageId: info.messageId,
      accepted: info.accepted,
      response: info.response
    });
    return true;
  } catch (error: any) {
    console.error("❌ Google email sending failed:", {
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
