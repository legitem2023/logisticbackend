// src/emailTemplates/passwordResetEmail.ts
export interface PasswordResetEmailProps {
  userEmail: string;
  resetLink: string;
  expiryTime?: string;
  appName?: string;
}

export const generatePasswordResetEmail = ({
  userEmail,
  resetLink,
  expiryTime = '1 hour',
  appName = 'Our App'
}: PasswordResetEmailProps): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #374151;
            background-color: #f9fafb;
            margin: 0;
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            border: 1px solid #d1fae5;
        }
        
        .email-header {
            background: linear-gradient(135deg, #065f46 0%, #047857 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .email-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" fill="%23059661"><polygon points="0,0 1000,40 1000,100 0,100" /></svg>') no-repeat;
            background-size: cover;
            opacity: 0.3;
        }
        
        .email-title {
            font-size: 28px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 8px;
            position: relative;
            z-index: 2;
        }
        
        .email-subtitle {
            font-size: 16px;
            color: #d1fae5;
            font-weight: 400;
            position: relative;
            z-index: 2;
        }
        
        .email-content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 16px;
        }
        
        .message {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 24px;
            line-height: 1.7;
        }
        
        .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #065f46 0%, #047857 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 24px 0;
            box-shadow: 0 4px 12px rgba(5, 95, 70, 0.3);
            transition: all 0.3s ease;
        }
        
        .reset-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(5, 95, 70, 0.4);
        }
        
        .info-box {
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }
        
        .info-title {
            font-weight: 600;
            color: #065f46;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .info-text {
            color: #047857;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .link-alternative {
            word-break: break-all;
            color: #065f46;
            text-decoration: none;
            font-size: 14px;
        }
        
        .expiry-notice {
            background: #fef3c7;
            border: 1px solid #fcd34d;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            text-align: center;
        }
        
        .expiry-text {
            color: #92400e;
            font-size: 14px;
            font-weight: 500;
        }
        
        .support-text {
            text-align: center;
            color: #9ca3af;
            font-size: 14px;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
        }
        
        .support-link {
            color: #065f46;
            text-decoration: none;
            font-weight: 500;
        }
        
        @media (max-width: 600px) {
            .email-content {
                padding: 30px 20px;
            }
            
            .email-header {
                padding: 30px 20px;
            }
            
            .email-title {
                fontSize: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1 class="email-title">Reset Your Password</h1>
            <p class="email-subtitle">Secure your account with a new password</p>
        </div>
        
        <div class="email-content">
            <p class="greeting">Hello,</p>
            
            <p class="message">
                We received a request to reset your password for your ${appName} account. 
                Click the button below to create a new password:
            </p>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="reset-button">
                    Reset Your Password
                </a>
            </div>
            
            <div class="expiry-notice">
                <p class="expiry-text">
                    ⏰ This link will expire in ${expiryTime}. If you didn't request this, you can safely ignore this email.
                </p>
            </div>
            
            <div class="info-box">
                <div class="info-title">Trouble with the button?</div>
                <p class="info-text">
                    Copy and paste this link into your browser:
                </p>
                <a href="${resetLink}" class="link-alternative">${resetLink}</a>
            </div>
            
            <p class="message">
                If you didn't request a password reset, please ignore this email or 
                contact our support team if you have concerns about your account's security.
            </p>
            
            <div class="support-text">
                Need help? <a href="mailto:support@${appName.toLowerCase().replace(/\s+/g, '')}.com" class="support-link">Contact our support team</a>
            </div>
        </div>
    </div>
</body>
</html>
  `;
};
