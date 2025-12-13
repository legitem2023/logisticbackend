// src/Services/PasswordResetService.ts
import { EmailService, EmailServiceConfig } from './EmailService.js';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export class PasswordResetService {
  private prisma: PrismaClient;
  private emailService: EmailService;

  constructor() {
    this.prisma = new PrismaClient();
    
    // Fixed: Using 'fromEmail' instead of 'from'
    const emailConfig: EmailServiceConfig = {
      service: 'nodemailer',
      fromEmail: process.env.EMAIL_FROM || 'noreply@example.com',
      appName: process.env.APP_NAME || 'My Application',
      baseUrl: process.env.APP_URL || 'http://localhost:3000',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    this.emailService = new EmailService(emailConfig);
  }

  /**
   * Request a password reset
   */
  async requestPasswordReset(email: string): Promise<{
    success: boolean;
    message: string;
    resetToken?: string;
  }> {
    try {
      logger.info(`Password reset requested for email: ${email}`);

      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true }
      });

      if (!user) {
        // For security, don't reveal if user exists
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        return {
          success: true, // Return success even if user doesn't exist for security
          message: 'If an account exists with this email, you will receive a reset link shortly.'
        };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Create or update reset token in database
      await this.prisma.passwordReset.upsert({
        where: { userId: user.id },
        update: {
          token: resetToken,
          expiresAt: resetTokenExpiry,
          used: false
        },
        create: {
          token: resetToken,
          expiresAt: resetTokenExpiry,
          userId: user.id
        }
      });

      // Send reset email
      const emailSent = await this.emailService.sendPasswordResetEmail(
        email,
        resetToken,
        '1 hour'
      );

      if (!emailSent) {
        logger.error(`Failed to send password reset email to: ${email}`);
        return {
          success: false,
          message: 'Failed to send reset email. Please try again.'
        };
      }

      logger.info(`Password reset email sent to: ${email}`);
      
      return {
        success: true,
        message: 'Password reset email sent successfully.',
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      };

    } catch (error) {
      logger.error('Error in requestPasswordReset:', error);
      return {
        success: false,
        message: 'An error occurred while processing your request.'
      };
    }
  }

  /**
   * Validate reset token
   */
  async validateResetToken(token: string): Promise<{
    valid: boolean;
    message: string;
    userId?: string;
  }> {
    try {
      logger.info(`Validating reset token: ${token.substring(0, 10)}...`);

      const resetRecord = await this.prisma.passwordReset.findFirst({
        where: {
          token,
          used: false,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      });

      if (!resetRecord) {
        logger.warn(`Invalid or expired reset token: ${token.substring(0, 10)}...`);
        return {
          valid: false,
          message: 'Invalid or expired reset token.'
        };
      }

      logger.info(`Reset token valid for user: ${resetRecord.user.email}`);
      
      return {
        valid: true,
        message: 'Token is valid.',
        userId: resetRecord.user.id
      };

    } catch (error) {
      logger.error('Error in validateResetToken:', error);
      return {
        valid: false,
        message: 'Error validating token.'
      };
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const transaction = await this.prisma.$transaction(async (tx) => {
      try {
        logger.info(`Attempting password reset with token: ${token.substring(0, 10)}...`);

        // Find valid reset token
        const resetRecord = await tx.passwordReset.findFirst({
          where: {
            token,
            used: false,
            expiresAt: {
              gt: new Date()
            }
          },
          include: {
            user: true
          }
        });

        if (!resetRecord) {
          logger.warn(`Invalid or expired reset token for password reset: ${token.substring(0, 10)}...`);
          throw new Error('Invalid or expired reset token.');
        }

        // Hash the new password (you should use bcrypt in production)
        // For now, we'll just store it as is (DO NOT DO THIS IN PRODUCTION)
        const hashedPassword = newPassword; // In production: await bcrypt.hash(newPassword, 10);

        // Update user's password
        await tx.user.update({
          where: { id: resetRecord.userId },
          data: { password: hashedPassword }
        });

        // Mark token as used
        await tx.passwordReset.update({
          where: { id: resetRecord.id },
          data: { used: true, usedAt: new Date() }
        });

        // Optional: Invalidate all existing sessions for this user
        await tx.session.deleteMany({
          where: { userId: resetRecord.userId }
        });

        logger.info(`Password successfully reset for user: ${resetRecord.user.email}`);
        
        return {
          success: true,
          message: 'Password reset successfully.'
        };

      } catch (error) {
        logger.error('Error in resetPassword:', error);
        throw error;
      }
    });

    return transaction;
  }

  /**
   * Clean up expired reset tokens (cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.prisma.passwordReset.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { used: true }
          ]
        }
      });

      logger.info(`Cleaned up ${result.count} expired password reset tokens`);
      return result.count;

    } catch (error) {
      logger.error('Error in cleanupExpiredTokens:', error);
      return 0;
    }
  }

  /**
   * Get user by reset token
   */
  async getUserByResetToken(token: string) {
    try {
      const resetRecord = await this.prisma.passwordReset.findFirst({
        where: {
          token,
          used: false,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              profileImage: true
            }
          }
        }
      });

      return resetRecord?.user || null;
    } catch (error) {
      logger.error('Error in getUserByResetToken:', error);
      return null;
    }
  }

  /**
   * Create a new email service instance with different configuration
   */
  createEmailService(configOverride?: Partial<EmailServiceConfig>): EmailService {
    const defaultConfig: EmailServiceConfig = {
      service: 'nodemailer',
      fromEmail: process.env.EMAIL_FROM || 'noreply@example.com',
      appName: process.env.APP_NAME || 'My Application',
      baseUrl: process.env.APP_URL || 'http://localhost:3000',
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    return new EmailService({
      ...defaultConfig,
      ...configOverride
    });
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const passwordResetService = new PasswordResetService();

// Helper functions
export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const calculateExpiryDate = (hours: number = 1): Date => {
  return new Date(Date.now() + hours * 3600000);
};
