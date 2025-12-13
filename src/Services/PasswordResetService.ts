// src/services/PasswordResetService.ts
import { EmailService, EmailServiceConfig } from './EmailService';

export interface ResetTokenData {
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  token?: string;
}

export interface PasswordValidationResult {
  valid: boolean;
  email?: string;
  message: string;
}

export class PasswordResetService {
  private emailService: EmailService;
  private resetTokens: Map<string, ResetTokenData> = new Map();
  
  constructor(emailServiceConfig: EmailServiceConfig) {
    this.emailService = new EmailService(emailServiceConfig);
    
    // Clean up expired tokens every hour
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  private generateResetToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private generateExpiryDate(hours: number = 1): Date {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
  }

  public async requestPasswordReset(email: string): Promise<PasswordResetResult> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, message: 'Invalid email format' };
      }

      // Generate reset token
      const token = this.generateResetToken();
      const expiresAt = this.generateExpiryDate();

      // Store token (in production, use a database)
      this.resetTokens.set(token, {
        email,
        token,
        expiresAt,
        used: false
      });

      // Send email
      const emailSent = await this.emailService.sendPasswordResetEmail(email, token);

      if (emailSent) {
        return { 
          success: true, 
          message: 'Password reset instructions sent to your email',
          token // In production, you might not want to return the token
        };
      } else {
        // Remove token if email failed
        this.resetTokens.delete(token);
        return { 
          success: false, 
          message: 'Failed to send reset instructions' 
        };
      }
    } catch (error) {
      console.error('Password reset request failed:', error);
      return { 
        success: false, 
        message: 'An error occurred while processing your request' 
      };
    }
  }

  public validateResetToken(token: string): PasswordValidationResult {
    const tokenData = this.resetTokens.get(token);
    
    if (!tokenData) {
      return { valid: false, message: 'Invalid or expired reset token' };
    }

    if (tokenData.used) {
      return { valid: false, message: 'This reset token has already been used' };
    }

    if (new Date() > tokenData.expiresAt) {
      this.resetTokens.delete(token);
      return { valid: false, message: 'Reset token has expired' };
    }

    return { 
      valid: true, 
      email: tokenData.email,
      message: 'Token is valid' 
    };
  }

  public async resetPassword(
    token: string, 
    newPassword: string
  ): Promise<PasswordResetResult> {
    try {
      const validation = this.validateResetToken(token);
      
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return { success: false, message: passwordValidation.message };
      }

      // In production, you would:
      // 1. Hash the new password
      // 2. Update user record in database
      
      // Mark token as used
      const tokenData = this.resetTokens.get(token);
      if (tokenData) {
        tokenData.used = true;
        this.resetTokens.set(token, tokenData);
      }

      return { 
        success: true, 
        message: 'Password has been successfully reset' 
      };
    } catch (error) {
      console.error('Password reset failed:', error);
      return { 
        success: false, 
        message: 'An error occurred while resetting your password' 
      };
    }
  }

  private validatePasswordStrength(password: string): { valid: boolean; message: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }

    return { valid: true, message: 'Password is strong' };
  }

  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.resetTokens.entries()) {
      if (now > data.expiresAt) {
        this.resetTokens.delete(token);
      }
    }
  }

  public getStats(): { activeTokens: number } {
    return {
      activeTokens: this.resetTokens.size
    };
  }

  // ============ STATIC METHODS ADDED BELOW ============
  
  /**
   * Static method to generate a reset token
   * This is used by resolvers expecting static methods
   */
  static async generateResetToken(userId: string): Promise<string> {
    // Create a temporary instance with minimal config
    const tempConfig: EmailServiceConfig = {
      host: process.env.EMAIL_HOST || '',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      },
      from: process.env.EMAIL_FROM || 'noreply@example.com'
    };
    
    try {
      const tempService = new PasswordResetService(tempConfig);
      // Access the private method via type assertion
      const token = (tempService as any).generateResetToken();
      return token;
    } catch (error) {
      console.error('Error generating reset token:', error);
      // Fallback token generation
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
  }

  /**
   * Static method to send reset email
   * This is used by resolvers expecting static methods
   */
  static async sendResetEmail(email: string, token: string): Promise<void> {
    // Create a temporary instance with minimal config
    const tempConfig: EmailServiceConfig = {
      host: process.env.EMAIL_HOST || '',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      },
      from: process.env.EMAIL_FROM || 'noreply@example.com'
    };
    
    try {
      const tempService = new PasswordResetService(tempConfig);
      const emailSent = await tempService.emailService.sendPasswordResetEmail(email, token);
      
      if (!emailSent) {
        throw new Error('Failed to send reset email');
      }
    } catch (error) {
      console.error('Error sending reset email:', error);
      throw error;
    }
  }
}

// Singleton instance for convenience
let _passwordResetServiceInstance: PasswordResetService | null = null;

/**
 * Helper function to get or create singleton instance
 */
export function getPasswordResetService(): PasswordResetService {
  if (!_passwordResetServiceInstance) {
    const config: EmailServiceConfig = {
      host: process.env.EMAIL_HOST || '',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
      },
      from: process.env.EMAIL_FROM || 'noreply@example.com'
    };
    _passwordResetServiceInstance = new PasswordResetService(config);
  }
  return _passwordResetServiceInstance;
}

/**
 * Convenience export of singleton instance
 */
export const passwordResetService = getPasswordResetService();
