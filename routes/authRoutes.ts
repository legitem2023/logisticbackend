// routes/authRoutes.ts
import { Request, Response, Router } from 'express';
import { PasswordResetService } from '../services/passwordResetService';
import { EmailServiceConfig } from '../services/emailService';

export class AuthRoutes {
  public router: Router;
  private passwordResetService: PasswordResetService;

  constructor(emailServiceConfig: EmailServiceConfig) {
    this.router = Router();
    this.passwordResetService = new PasswordResetService(emailServiceConfig);
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post('/forgot-password', this.forgotPassword.bind(this));
    this.router.post('/reset-password', this.resetPassword.bind(this));
    this.router.post('/validate-token', this.validateToken.bind(this));
    this.router.get('/stats', this.getStats.bind(this));
  }

  private async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required'
        });
        return;
      }

      const result = await this.passwordResetService.requestPasswordReset(email);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  private async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          message: 'Token and new password are required'
        });
        return;
      }

      // Validate password strength (basic example)
      if (newPassword.length < 8) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
        return;
      }

      const result = await this.passwordResetService.resetPassword(token, newPassword);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  private async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({
          success: false,
          message: 'Token is required'
        });
        return;
      }

      const result = this.passwordResetService.validateResetToken(token);
      res.status(200).json(result);
    } catch (error) {
      console.error('Validate token error:', error);
      res.status(500).json({
        valid: false,
        message: 'Internal server error'
      });
    }
  }

  private async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = this.passwordResetService.getStats();
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
