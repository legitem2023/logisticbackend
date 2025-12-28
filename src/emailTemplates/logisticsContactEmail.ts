// src/emailTemplates/logisticsContactEmail.ts
export interface LogisticsContactEmailProps {
  formData: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    service: string;
    message: string;
  };
  referenceNumber: string;
  submissionTime: string;
  appName?: string;
  logoUrl?: string;
}

export interface CustomerNotificationEmailProps {
  name: string;
  referenceNumber: string;
  appName?: string;
  logoUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
}

export const generateLogisticsContactEmail = ({
  formData,
  referenceNumber,
  submissionTime,
  appName = 'Pramatiso Express',
  logoUrl = 'https://adiviso.com/Motogo.png',
}: LogisticsContactEmailProps): string => {
  const serviceTypes: Record<string, string> = {
    air: 'Air Freight',
    sea: 'Sea Freight',
    ground: 'Ground Transport',
    warehousing: 'Warehousing',
    customs: 'Customs Clearance',
    other: 'Other Services'
  };

  const serviceDisplay = serviceTypes[formData.service] || formData.service;

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Logistics Inquiry - ${appName}</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(301deg, rgba(8, 137, 54, 1) 0%, rgba(0, 44, 16, 1) 50%); padding: 20px 30px; color: white; }
        .logo { height: 60px; width: 60px; object-fit: contain; }
        .title { font-size: 24px; font-weight: 700; margin: 20px 0 10px; text-align: center; color: #065f46; }
        .reference { background: #065f46; color: white; padding: 10px; text-align: center; font-weight: 600; margin: 20px 0; border-radius: 6px; }
        .info-box { background: #f0fdf4; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 15px 0; }
        .data-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin: 15px 0; }
        .data-item { background: white; border: 1px solid #d1fae5; border-radius: 8px; padding: 15px; }
        .data-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
        .data-value { font-size: 16px; font-weight: 500; color: #111827; }
        .service-badge { display: inline-block; padding: 8px 16px; background: #d1fae5; color: #065f46; border-radius: 20px; font-weight: 600; }
        .action-buttons { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; background: #065f46; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 0 10px; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="${appName} Logo" class="logo">
            <h1 style="margin: 10px 0 0; color: white;">${appName}</h1>
        </div>
        
        <div style="padding: 30px;">
            <h2 class="title">New Logistics Inquiry</h2>
            <div class="reference">Reference #: ${referenceNumber}</div>
            
            <div class="info-box">
                <h3 style="color: #065f46; margin-top: 0;">Contact Information</h3>
                <div class="data-grid">
                    <div class="data-item">
                        <div class="data-label">Full Name</div>
                        <div class="data-value">${formData.name}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Email Address</div>
                        <div class="data-value">
                            <a href="mailto:${formData.email}" style="color: #065f46; text-decoration: none;">${formData.email}</a>
                        </div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Phone Number</div>
                        <div class="data-value">${formData.phone || 'Not provided'}</div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Company</div>
                        <div class="data-value">${formData.company || 'Not provided'}</div>
                    </div>
                </div>
            </div>
            
            <div class="info-box">
                <div class="data-label">Service Type</div>
                <div class="service-badge">${serviceDisplay}</div>
            </div>
            
            <div class="info-box">
                <div class="data-label">Message</div>
                <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 10px;">
                    ${formData.message.replace(/\n/g, '<br>')}
                </div>
            </div>
            
            <div class="action-buttons">
                <a href="mailto:${formData.email}" class="btn">Reply via Email</a>
                ${formData.phone ? `<a href="tel:${formData.phone}" class="btn">Call Customer</a>` : ''}
            </div>
            
            <div class="footer">
                <p>Submitted: ${submissionTime}</p>
                <p>Please respond within 24 hours</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

export const generateCustomerNotificationEmail = ({
  name,
  referenceNumber,
  appName = 'Pramatiso Express',
  logoUrl = 'https://adiviso.com/Motogo.png',
  supportEmail = 'support@example.com',
  supportPhone = '+1 (800) 123-4567'
}: CustomerNotificationEmailProps): string => {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You for Your Inquiry - ${appName}</title>
    <style>
        body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f9fafb; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(301deg, rgba(8, 137, 54, 1) 0%, rgba(0, 44, 16, 1) 50%); padding: 30px; text-align: center; color: white; }
        .content { padding: 40px; text-align: center; }
        .reference-box { background: #f0fdf4; border: 2px solid #10b981; border-radius: 10px; padding: 25px; margin: 25px 0; }
        .contact-info { margin: 30px 0; padding: 20px; background: #ecfdf5; border-radius: 8px; }
        .btn { display: inline-block; background: #065f46; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUrl}" alt="${appName} Logo" style="height: 80px; width: 80px; object-fit: contain;">
            <h1 style="margin: 15px 0 5px; color: white;">${appName}</h1>
            <p style="margin: 0; color: #FACA15; font-weight: 500;">Logistics & Supply Chain Solutions</p>
        </div>
        
        <div class="content">
            <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
            <h2 style="color: #065f46; margin-bottom: 10px;">Thank You, ${name}!</h2>
            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
                We've received your logistics inquiry and our team is reviewing it now.
            </p>
            
            <div class="reference-box">
                <p style="color: #6b7280; font-size: 14px; margin: 0;">Your Reference Number</p>
                <h3 style="color: #065f46; margin: 10px 0; font-size: 24px; font-family: monospace;">${referenceNumber}</h3>
                <p style="color: #6b7280; font-size: 14px; margin: 10px 0 0;">
                    Please quote this number in any correspondence with us
                </p>
            </div>
            
            <p style="color: #374151; font-size: 16px; margin: 25px 0;">
                One of our logistics specialists will contact you within 24 hours 
                to discuss your requirements and provide you with the best solution.
            </p>
            
            <div class="contact-info">
                <p style="color: #065f46; font-weight: 600; margin-bottom: 15px;">Need immediate assistance?</p>
                <p style="margin: 10px 0;">
                    📧 Email: <a href="mailto:${supportEmail}" style="color: #065f46; text-decoration: none;">${supportEmail}</a>
                </p>
                <p style="margin: 10px 0;">
                    📞 Phone: <a href="tel:${supportPhone}" style="color: #065f46; text-decoration: none;">${supportPhone}</a>
                </p>
            </div>
            
            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb;">
                <p style="color: #374151;">Best regards,</p>
                <p style="color: #065f46; font-weight: 600;">The ${appName} Logistics Team</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};
