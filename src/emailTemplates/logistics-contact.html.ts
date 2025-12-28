// src/templates/logistics-contact.html.ts
export const generateLogisticsContactEmail = (data: {
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
}): string => {
  const serviceTypes: Record<string, string> = {
    air: 'Air Freight',
    sea: 'Sea Freight',
    ground: 'Ground Transport',
    warehousing: 'Warehousing',
    customs: 'Customs Clearance',
    other: 'Other Services',
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Logistics Inquiry - ${data.appName || 'Pramatiso Express'}</title>
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
        
        .logo-image {
            height: 60px;
            width: 60px;
            object-fit: contain;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
            margin-right: 15px;
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
        
        .reference-badge {
            display: inline-block;
            background: linear-gradient(135deg, #065f46 0%, #047857 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin: 0 auto 20px;
            text-align: center;
        }
        
        .form-data-container {
            background: #f0fdf4;
            border: 1px solid #a7f3d0;
            border-radius: 10px;
            padding: 25px;
            margin: 25px 0;
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
        
        .service-badge {
            display: inline-block;
            padding: 6px 12px;
            background: #d1fae5;
            border-radius: 12px;
            color: #065f46;
            font-weight: 600;
            font-size: 14px;
        }
        
        .message-container {
            background: white;
            border: 1px solid #d1fae5;
            border-radius: 8px;
            padding: 20px;
            margin-top: 15px;
        }
        
        .action-box {
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            border-radius: 8px;
            padding: 25px;
            margin: 25px 0;
            text-align: center;
        }
        
        .action-button {
            display: inline-block;
            background: linear-gradient(135deg, #065f46 0%, #047857 100%);
            color: white;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 14px;
            margin: 0 10px;
        }
        
        .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <div class="logo-container">
                <img src="${data.logoUrl || 'https://adiviso.com/Motogo.png'}" 
                     alt="${data.appName || 'Pramatiso Express'} Logo" 
                     class="logo-image">
                <div class="logo-title">${data.appName || 'Pramatiso Express'}</div>
            </div>
        </div>
        
        <div class="email-content">
            <h1 class="email-title">New Logistics Inquiry</h1>
            <div class="reference-badge">Reference #: ${data.referenceNumber}</div>
            
            <div class="form-data-container">
                <div style="margin-bottom: 20px;">
                    <div class="data-grid">
                        <div class="data-item">
                            <div class="data-label">Full Name</div>
                            <div class="data-value">${data.formData.name}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Email Address</div>
                            <div class="data-value">
                                <a href="mailto:${data.formData.email}" style="color: #065f46; text-decoration: none;">
                                    ${data.formData.email}
                                </a>
                            </div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Phone Number</div>
                            <div class="data-value">${data.formData.phone || 'Not provided'}</div>
                        </div>
                        <div class="data-item">
                            <div class="data-label">Company</div>
                            <div class="data-value">${data.formData.company || 'Not provided'}</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <div class="data-label">Service Type</div>
                    <div class="service-badge">
                        ${serviceTypes[data.formData.service] || data.formData.service}
                    </div>
                </div>
                
                <div>
                    <div class="data-label">Message</div>
                    <div class="message-container">
                        ${data.formData.message.replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>
            
            <div class="action-box">
                <a href="mailto:${data.formData.email}" class="action-button">
                    Reply via Email
                </a>
                ${data.formData.phone ? `
                <a href="tel:${data.formData.phone}" class="action-button">
                    Call Customer
                </a>
                ` : ''}
            </div>
            
            <div class="footer">
                <p>Submitted on ${data.submissionTime}</p>
                <p>Please respond within 24 hours</p>
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

export const generateCustomerNotificationEmail = (data: {
  name: string;
  referenceNumber: string;
  appName?: string;
  logoUrl?: string;
}): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You for Your Inquiry - ${data.appName || 'Pramatiso Express'}</title>
    <style>
        /* Same styles as above, simplified for brevity */
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f9fafb;
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(301deg, rgba(8, 137, 54, 1) 0%, rgba(0, 44, 16, 1) 50%);
            padding: 30px;
            text-align: center;
            color: white;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        
        .reference-box {
            background: #f0fdf4;
            border: 2px solid #10b981;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>${data.appName || 'Pramatiso Express'}</h1>
            <p>Logistics & Supply Chain Solutions</p>
        </div>
        
        <div class="content">
            <div class="success-icon">✅</div>
            <h2>Thank You, ${data.name}!</h2>
            <p>We've received your logistics inquiry and our team is reviewing it now.</p>
            
            <div class="reference-box">
                <p style="color: #6b7280; font-size: 14px;">Your Reference Number</p>
                <h3 style="color: #065f46; margin: 10px 0;">${data.referenceNumber}</h3>
                <p style="color: #6b7280; font-size: 14px;">Please quote this number in any correspondence</p>
            </div>
            
            <p>One of our logistics specialists will contact you within 24 hours.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p>Best regards,</p>
                <p><strong>The ${data.appName || 'Pramatiso Express'} Logistics Team</strong></p>
            </div>
        </div>
    </div>
</body>
</html>
  `;
};
