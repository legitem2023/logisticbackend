// src/emailTemplates/passwordResetEmail.ts
export interface PasswordResetEmailProps {
  userEmail: string;
  resetLink: string;
  expiryTime?: string;
  appName?: string;
  logoUrl?: string; // Added logo URL parameter
}

export const generatePasswordResetEmail = ({
  userEmail,
  resetLink,
  expiryTime = '1 hour',
  appName = 'Pramatiso Express',
  logoUrl = 'https://adiviso.com/Motogo.png' // Default logo URL
}: PasswordResetEmailProps): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Pramatiso Express</title>
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
        
        /* HEADER STYLE - Matching your Navigation component */
        .email-header {
            background: linear-gradient(135deg, rgba(10, 10, 20, 0.98) 0%, rgba(20, 20, 30, 0.98) 50%, rgba(10, 10, 20, 0.98) 100%);
            padding: 20px 30px;
            border-bottom: 1px solid rgba(212, 175, 55, 0.2);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25), 0 0 15px rgba(255, 215, 0, 0.15);
        }
        
        .logo-container {
            display: flex;
            align-items: center;
            text-decoration: none;
        }
        
        .logo-image-container {
            position: relative;
            height: 60px;
            width: 60px;
            margin-right: 15px;
        }
        
        .logo-image {
            object-fit: contain;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
        }
        
        .logo-text-container {
            display: flex;
            flex-direction: column;
        }
        
        .logo-title {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(135deg, #FDF6B2 0%, #FCE96A 25%, #FACA15 50%, #E3A008 75%, #C27803 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.5px;
        }
        
        .logo-subtitle {
            font-size: 11px;
            color: #FACA15;
            font-weight: 500;
            letter-spacing: 1.5px;
            margin-top: 2px;
            text-transform: uppercase;
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
            cursor: pointer;
            border: none;
            font-family: inherit;
        }
        
        .reset-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(5, 95, 70, 0.4);
        }
        
        .reset-button:active {
            transform: translateY(0);
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
            margin-bottom: 12px;
            font-size: 14px;
        }
        
        .info-text {
            color: #047857;
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 15px;
        }
        
        .link-container {
            background: white;
            border: 1px solid #a7f3d0;
            border-radius: 6px;
            padding: 12px;
            margin: 12px 0;
            word-break: break-all;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 13px;
            color: #065f46;
            position: relative;
            padding-right: 110px;
        }
        
        .copy-button {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: linear-gradient(135deg, #065f46 0%, #047857 100%);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: 'Inter', sans-serif;
        }
        
        .copy-button:hover {
            background: linear-gradient(135deg, #054732 0%, #036449 100%);
        }
        
        .copy-button.copied {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        }
        
        .status-message {
            text-align: center;
            margin: 10px 0;
            font-size: 13px;
            font-weight: 500;
            min-height: 20px;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .status-message.show {
            opacity: 1;
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
                padding: 15px 20px;
            }
            
            .logo-image-container {
                height: 50px;
                width: 50px;
                margin-right: 12px;
            }
            
            .logo-title {
                font-size: 24px;
            }
            
            .link-container {
                padding-right: 100px;
                font-size: 12px;
            }
            
            .copy-button {
                padding: 5px 10px;
                font-size: 11px;
            }
        }
        
        @media (max-width: 400px) {
            .link-container {
                padding-right: 90px;
            }
            
            .logo-image-container {
                height: 45px;
                width: 45px;
            }
            
            .logo-title {
                font-size: 22px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- HEADER SECTION - Matches your Navigation style with logo image -->
        <div class="email-header">
            <div class="logo-container">
                <!-- Logo Image - Using the same image as your Navigation component -->
                <div class="logo-image-container">
                    <img src="${logoUrl}" 
                         alt="Pramatiso Logo" 
                         class="logo-image"
                         style="height: 100%; width: 100%;">
                </div>
                
                <!-- Logo Text -->
                <div class="logo-text-container">
                    <div class="logo-title">Pramatiso</div>
                    <div class="logo-subtitle">Express Delivery</div>
                </div>
            </div>
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
                
                <div class="link-container">
                    ${resetLink}
                    <button class="copy-button" onclick="copyResetLink()">
                        Copy Link
                    </button>
                </div>
                
                <div class="status-message" id="copyStatus"></div>
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
    
    <script>
        function copyResetLink() {
            const resetLink = "${resetLink}";
            const copyButton = event.target;
            const statusMessage = document.getElementById('copyStatus');
            
            // Create a temporary textarea element
            const textArea = document.createElement('textarea');
            textArea.value = resetLink;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            
            // Select and copy the text
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                
                if (successful) {
                    // Show success state
                    copyButton.textContent = 'Copied!';
                    copyButton.classList.add('copied');
                    
                    statusMessage.textContent = '✓ Link copied to clipboard!';
                    statusMessage.style.color = '#059669';
                    statusMessage.classList.add('show');
                    
                    // Reset button after 2 seconds
                    setTimeout(() => {
                        copyButton.textContent = 'Copy Link';
                        copyButton.classList.remove('copied');
                    }, 2000);
                    
                    // Hide status message after 3 seconds
                    setTimeout(() => {
                        statusMessage.classList.remove('show');
                        setTimeout(() => {
                            statusMessage.textContent = '';
                        }, 300);
                    }, 3000);
                } else {
                    throw new Error('Copy command failed');
                }
            } catch (err) {
                // Fallback for browsers that don't support execCommand
                try {
                    navigator.clipboard.writeText(resetLink).then(() => {
                        copyButton.textContent = 'Copied!';
                        copyButton.classList.add('copied');
                        
                        statusMessage.textContent = '✓ Link copied to clipboard!';
                        statusMessage.style.color = '#059669';
                        statusMessage.classList.add('show');
                        
                        setTimeout(() => {
                            copyButton.textContent = 'Copy Link';
                            copyButton.classList.remove('copied');
                        }, 2000);
                        
                        setTimeout(() => {
                            statusMessage.classList.remove('show');
                            setTimeout(() => {
                                statusMessage.textContent = '';
                            }, 300);
                        }, 3000);
                    }).catch(fallbackCopy);
                } catch (err) {
                    fallbackCopy();
                }
            } finally {
                // Clean up
                document.body.removeChild(textArea);
            }
            
            function fallbackCopy() {
                // Last resort fallback
                copyButton.textContent = 'Click to select';
                copyButton.classList.remove('copied');
                
                // Select the text in the container
                const linkContainer = copyButton.parentElement;
                const range = document.createRange();
                range.selectNodeContents(linkContainer.firstChild);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                statusMessage.textContent = 'Text selected. Press Ctrl+C to copy.';
                statusMessage.style.color = '#92400e';
                statusMessage.classList.add('show');
                
                setTimeout(() => {
                    copyButton.textContent = 'Copy Link';
                    statusMessage.classList.remove('show');
                    setTimeout(() => {
                        statusMessage.textContent = '';
                    }, 300);
                }, 3000);
            }
        }
    </script>
</body>
</html>
  `;
};
