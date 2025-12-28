// src/services/PasswordResetService.ts
import { PrismaClient } from '@prisma/client';
import { EmailService, EmailServiceConfig } from './EmailService.js';
import crypto from 'crypto';

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
  email?: string | null;
  message: string;
  user?: any;
}

export class PasswordResetService {
  private emailService: EmailService;
  private prisma: PrismaClient;
  
  constructor(emailServiceConfig: EmailServiceConfig) {
    this.emailService = new EmailService(emailServiceConfig);
    this.prisma = new PrismaClient();
    
    // Clean up expired tokens every hour
    setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
  }

  private generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
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

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return { 
          success: true, 
          message: 'If an account exists with this email, password reset instructions will be sent' 
        };
      }

      // Generate reset token
      const token = this.generateResetToken();
      const expiresAt = this.generateExpiryDate();

      // Hash the token for storage
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Store token in database - FIXED: Added required fields
      await this.prisma.passwordReset.create({
        data: {
          userEmail: email,
          token: hashedToken,
          expiresAt,
          used: false,
          user: {
            connect: { email }
          }
        }
      });

      // Send email
      const emailSent = await this.emailService.sendPasswordResetEmail(email, token);

      if (emailSent) {
        return { 
          success: true, 
          message: 'Password reset instructions sent to your email'
        };
      } else {
        // Remove token if email failed
        await this.prisma.passwordReset.deleteMany({
          where: {
            userEmail: email
          }
        });

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


  public async validateResetToken(token: string): Promise<PasswordValidationResult> {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Get token data regardless of expiration
    const tokenData = await this.prisma.passwordReset.findUnique({
      where: {
        token: hashedToken,
      },
      include: {
        user: true
      }
    });
    
    if (!tokenData) {
      return { 
        valid: false, 
        message: `Invalid reset token: ${ hashedToken }`,
        email:''
      };
    }
    
    if (tokenData.used === true) {
      return { 
        valid: false, 
        message: 'This reset token has already been used.',
        email:''
      };
    }
    
    const now = new Date();
    if (tokenData.expiresAt <= now) {
      return { 
        valid: false, 
        message: 'Reset token has expired.',
        email:''
      };
    }
    
    return { 
      valid: true, 
      message: 'Token is valid.',
      email:tokenData.userEmail
    };
    
  } catch (error: unknown) {
  let errorMessage = 'Error validating token';
  
  if (error instanceof Error) {
    errorMessage += ': ' + error.message;
  }
  
  return { 
    valid: false, 
    message: errorMessage,
    email:''
  };
}
}

  public async resetPassword(
  token: string, 
  newPassword: string
): Promise<PasswordResetResult> {
  try {
    const validation = await this.validateResetToken(token);
    
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    // Check if email exists and cast to string
    if (!validation.email) {
      return { success: false, message: 'Invalid token data' };
    }

    const email = validation.email as string;

    // Validate password strength
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return { success: false, message: passwordValidation.message };
    }

    // Hash the token to find it
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find the token first
    const tokenData = await this.prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        userEmail: email,
        used: false
      }
    });

    if (!tokenData) {
      return { success: false, message: 'Token not found or already used' };
    }

    // FIXED: Update user password FIRST
    // Hash the new password
    const hashedPassword = crypto
      .createHash('sha256')
      .update(newPassword + (process.env.PASSWORD_SALT || ''))
      .digest('hex');

    // Update user password - do this before marking token as used
    await this.prisma.user.update({
      where: { 
        email: email 
      },
      data: { 
        passwordHash: hashedPassword
      }
    });

    // FIXED: Mark token as used AFTER successful password update
/*    await this.prisma.passwordReset.update({
      where: { id: tokenData.id },
      data: { used: true }
    });
*/
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

  private async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = new Date();
      
      // Delete expired tokens
      await this.prisma.passwordReset.deleteMany({
        where: {
          expiresAt: { lt: now }
        }
      });
    } catch (error) {
      console.error('Token cleanup failed:', error);
    }
  }

  public async getStats(): Promise<{ activeTokens: number }> {
    const now = new Date();
    
    const activeTokens = await this.prisma.passwordReset.count({
      where: {
        used: false,
        expiresAt: { gt: now }
      }
    });

    return {
      activeTokens
    };
  }
  }
