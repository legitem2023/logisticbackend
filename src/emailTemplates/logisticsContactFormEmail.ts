// src/emailTemplates/logisticsContactFormEmail.ts
export interface LogisticsContactEmailProps {
  formData: {
    name: string;
    email: string;
    phone: string;
    company: string;
    service: string;
    message: string;
  };
  submissionTime?: string;
  referenceNumber?: string;
  appName?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export const generateLogisticsContactEmail = ({
  formData,
  submissionTime = new Date().toLocaleString(),
  referenceNumber = `LOG-${Date.now().toString().slice(-8)}`,
  appName = 'Pramatiso Express',
  logoUrl = 'https://adiviso.com/Motogo.png',
  contactEmail = 'logistics@pramatisoexpress.com',
  contactPhone = '+1 (800) 123-4567'
}: LogisticsContactEmailProps): string => {
  // Service type mapping for better display
  const serviceTypes: { [key: string]: string } = {
    air: 'Air Freight',
    sea: 'Sea Freight',
    ground: 'Ground Transport',
    warehousing: 'Warehousing',
    customs: 'Customs Clearance',
    other: 'Other Services'
  };

  const serviceDisplay = serviceTypes[formData.service] || formData.service;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Logistics Inquiry - ${appName}</title>
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
            max-width: 700px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            border: 1px solid #d1fae5;
        }
        
        /* HEADER STYLE - Matching your Navigation component */
        .email-header {
           background: #088936;
           background: linear-gradient(301deg, rgba(8, 137, 54, 1) 0%, rgba(0, 44, 16, 1) 50%);
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
        
        .email-title {
            font-size: 24px;
            font-weight: 700;
            color: #065f46;
            margin-bottom: 10px;
            text-align: center;
        }
        
        .email-subtitle {
            font-size: 16px;
            color: #047857;
            margin-bottom: 30px;
            text-align: center;
            font-weight: 500;
        }
        
        .reference-badge {
            display: inline-block;
            background: linear-gradient(135deg, #065f46 0%, #047857 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        
        .form-data-container {
            background: #f0fdf4;
            border: 1px solid #a7f3d0;
            border-radius: 10px;
            padding: 25px;
            margin: 25px 0;
        }
        
        .data-section {
            margin-bottom: 20px;
        }
        
        .data-section:last-child {
            margin-bottom: 0;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #065f46;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .section-title i {
            font-size: 18px;
        }
        
        .data-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .data-item {
            background: white;
            border: 1px solid #d1fae5;
            border-radius: 8px;
            padding: 15px;
        }
        
        .data-label {
            font-size: 12px;
            font-weight: 500;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        
        .data-value {
            font-size: 16px;
            font-weight: 500;
            color: #111827;
            word-break: break-word;
        }
        
        .message-container {
            background: white;
            border: 1px solid #d1fae5;
            border-radius: 8px;
            padding: 20px;
            margin-top: 15px;
        }
        
        .message-value {
            font-size: 15px;
            color: #374151;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        
        .action-box {
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        
        .action-title {
            font-weight: 600;
            color: #065f46;
            margin-bottom: 15px;
            font-size: 18px;
        }
        
        .action-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .action-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #065f46 0%, #047857 100%);
            color: white !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            font-size: 14px;
            transition: all 0.3s ease;
            cursor: pointer;
            border: none;
            font-family: inherit;
        }
        
        .action-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(5, 95, 70, 0.3);
        }
        
        .action-button.call {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        }
        
        .contact-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 25px 0;
            text-align: center;
        }
        
        .contact-item {
            padding: 15px;
        }
        
        .contact-icon {
            font-size: 24px;
            color: #065f46;
            margin-bottom: 10px;
        }
        
        .contact-label {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 5px;
        }
        
        .contact-value {
            font-size: 16px;
            font-weight: 500;
            color: #065f46;
        }
        
        .footer {
            text-align: center;
            color: #9ca3af;
            font-size: 14px;
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer-links {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 15px;
        }
        
        .footer-link {
            color: #065f46;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s ease;
        }
        
        .footer-link:hover {
            color: #047857;
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
            
            .data-grid {
                grid-template-columns: 1fr;
            }
            
            .action-buttons {
                flex-direction: column;
            }
            
            .contact-info {
                grid-template-columns: 1fr;
            }
            
            .footer-links {
                flex-direction: column;
                gap: 10px;
            }
        }
        
        @media (max-width: 400px) {
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
                         alt="${appName} Logo" 
                         class="logo-image"
                         style="height: 100%; width: 100%;">
                </div>
            </div>
        </div>
        
        <div class="email-content">
            <h1 class="email-title">New Logistics Inquiry</h1>
            <p class="email-subtitle">A new contact form submission has been received</p>
            
            <div style="text-align: center;">
                <div class="reference-badge">
                    Reference #: ${referenceNumber}
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">
                    Submitted on ${submissionTime}
                </p>
            </div>
            
            <div class="form-data-container">
                <!-- Contact Information -->
                <div class="data-section">
                    <h3 class="section-title">
                        <span style="font-size: 18px;">👤</span>
                        Contact Information
                    </h3>
                    <div class="data-grid">
                        <div class="data-item">
                            <div class="data-label">Full Name</div>
                            <div class="data-value">${formData.name}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Email Address</div>
                            <div class="data-value">
                                <a href="mailto:${formData.email}" style="color: #065f46; text-decoration: none;">
                                    ${formData.email}
                                </a>
                            </div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Phone Number</div>
                            <div class="data-value">
                                ${formData.phone ? `<a href="tel:${formData.phone}" style="color: #065f46; text-decoration: none;">${formData.phone}</a>` : 'Not provided'}
                            </div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Company</div>
                            <div class="data-value">${formData.company || 'Not provided'}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Service Details -->
                <div class="data-section">
                    <h3 class="section-title">
                        <span style="font-size: 18px;">🚚</span>
                        Service Details
                    </h3>
                    <div class="data-grid">
                        <div class="data-item">
                            <div class="data-label">Service Type</div>
                            <div class="data-value">
                                <span style="display: inline-block; padding: 4px 12px; background: #d1fae5; border-radius: 12px; color: #065f46; font-weight: 500;">
                                    ${serviceDisplay}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Message -->
                <div class="data-section">
                    <h3 class="section-title">
                        <span style="font-size: 18px;">💬</span>
                        Customer Message
                    </h3>
                    <div class="message-container">
                        <div class="message-value">${formData.message}</div>
                    </div>
                </div>
            </div>
            
            <!-- Action Box -->
            <div class="action-box">
                <h3 class="action-title">Take Action</h3>
                <div class="action-buttons">
                    <a href="mailto:${formData.email}" class="action-button">
                        <span style="font-size: 16px;">✉️</span>
                        Reply via Email
                    </a>
                    ${formData.phone ? `
                    <a href="tel:${formData.phone}" class="action-button call">
                        <span style="font-size: 16px;">📞</span>
                        Call Customer
                    </a>
                    ` : ''}
                </div>
            </div>
            
            <!-- Contact Information -->
            <div class="contact-info">
                <div class="contact-item">
                    <div class="contact-icon">📧</div>
                    <div class="contact-label">Logistics Team Email</div>
                    <div class="contact-value">
                        <a href="mailto:${contactEmail}" style="color: #065f46; text-decoration: none;">
                            ${contactEmail}
                        </a>
                    </div>
                </div>
                <div class="contact-item">
                    <div class="contact-icon">📞</div>
                    <div class="contact-label">Logistics Hotline</div>
                    <div class="contact-value">
                        <a href="tel:${contactPhone}" style="color: #065f46; text-decoration: none;">
                            ${contactPhone}
                        </a>
                    </div>
                </div>
                <div class="contact-item">
                    <div class="contact-icon">🆔</div>
                    <div class="contact-label">Reference Number</div>
                    <div class="contact-value">${referenceNumber}</div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p>
                    This inquiry was submitted through the ${appName} logistics contact form.
                    <br>
                    Please respond within 24 hours for best customer service.
                </p>
                <div class="footer-links">
                    <a href="#" class="footer-link">View in CRM</a>
                    <a href="#" class="footer-link">View All Inquiries</a>
                    <a href="mailto:${contactEmail}" class="footer-link">Contact Support</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `;
};
