import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'yahoo',
  auth: {
    user: process.env.YAHOO_EMAIL_USER as string,
    pass: process.env.YAHOO_EMAIL_PASS as string,
  },
});

export const sendMail = async (email: string, fullname: string) => { 
  const mailOptions = {
    from: process.env.YAHOO_EMAIL_USER,
    to: email,
    subject: 'Welcome to Legitem - Your Account is Ready!',
    html: `
      <div style="
        max-width: 600px;
        margin: 0 auto;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-radius: 10px;
      ">
        <!-- Header -->
        <div style="
          text-align: center;
          padding: 30px 20px;
          background: white;
          border-radius: 10px 10px 0 0;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
          <img 
            src="https://hokei-storage.s3.ap-northeast-1.amazonaws.com/images/Legit/IconImages/Legitem-svg.svg" 
            alt="Legitem Logo"
            style="height: 80px; width: 80px; margin-bottom: 20px;"
          />
          <h1 style="
            color: #333;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          ">Welcome to Legitem!</h1>
        </div>

        <!-- Content -->
        <div style="
          background: white;
          padding: 40px 30px;
          border-radius: 0 0 10px 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
          <p style="
            font-size: 16px;
            line-height: 1.6;
            color: #555;
            margin-bottom: 25px;
          ">
            Hello <strong style="color: #764ba2;">${fullname}</strong>,
          </p>

          <p style="
            font-size: 16px;
            line-height: 1.6;
            color: #555;
            margin-bottom: 25px;
          ">
            Thank you for joining the Legitem community! We're thrilled to have you on board.
          </p>

          <div style="
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #764ba2;
            margin: 30px 0;
          ">
            <p style="
              font-size: 16px;
              line-height: 1.6;
              color: #555;
              margin: 0;
            ">
              <strong>What you can do now:</strong><br>
              ✅ Log in to your account<br>
              ✅ Browse and shop with confidence<br>
              ✅ Track your purchases<br>
              ✅ Enjoy secure and verified shopping
            </p>
          </div>

          <p style="
            font-size: 16px;
            line-height: 1.6;
            color: #555;
            margin-bottom: 30px;
          ">
            Get ready to discover amazing products and enjoy a seamless shopping experience!
          </p>

          <div style="text-align: center; margin-top: 40px;">
            <a href="#" style="
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
              transition: all 0.3s ease;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.6)';" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.4)';">
              Start Shopping Now
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="
          text-align: center;
          padding: 20px;
          color: white;
          font-size: 14px;
        ">
          <p style="margin: 5px 0;">Need help? Contact our support team</p>
          <p style="margin: 5px 0; opacity: 0.8;">© 2024 Legitem. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `Hello ${fullname}, thank you for joining us! You can now log in, check out your purchases, and enjoy shopping.`
  };
  
  const data = await transporter.sendMail(mailOptions);
  return data;
}

export const ContactUs = async (body: any) => {
  const { emailAddress, fullname, contactNo, details } = body;

  const mailOptions = {
    from: process.env.YAHOO_EMAIL_USER,
    to: process.env.YAHOO_EMAIL_USER,
    subject: 'New Contact Form Submission - Legitem',
    html: `
      <div style="
        max-width: 600px;
        margin: 0 auto;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-radius: 10px;
      ">
        <!-- Header -->
        <div style="
          text-align: center;
          padding: 30px 20px;
          background: white;
          border-radius: 10px 10px 0 0;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
          <img 
            src="https://hokei-storage.s3.ap-northeast-1.amazonaws.com/images/Legit/IconImages/Legitem-svg.svg" 
            alt="Legitem Logo"
            style="height: 80px; width: 80px; margin-bottom: 20px;"
          />
          <h1 style="
            color: #333;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          ">New Contact Form Submission</h1>
          <p style="color: #666; margin: 10px 0 0 0; font-size: 16px;">
            From Legitem Contact Us
          </p>
        </div>

        <!-- Content -->
        <div style="
          background: white;
          padding: 40px 30px;
          border-radius: 0 0 10px 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
          <div style="margin-bottom: 30px;">
            <h2 style="
              color: #764ba2;
              margin-bottom: 25px;
              font-size: 20px;
              border-bottom: 2px solid #f0f0f0;
              padding-bottom: 10px;
            ">Contact Information</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
              <div style="
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
              ">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #333;">Full Name</p>
                <p style="margin: 0; color: #764ba2; font-size: 18px;">${fullname}</p>
              </div>
              <div style="
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                text-align: center;
              ">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #333;">Contact Number</p>
                <p style="margin: 0; color: #764ba2; font-size: 18px;">${contactNo}</p>
              </div>
            </div>

            <div style="
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 25px;
            ">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #333;">Email Address</p>
              <p style="margin: 0; color: #764ba2; font-size: 16px;">${emailAddress}</p>
            </div>
          </div>

          <div>
            <h2 style="
              color: #764ba2;
              margin-bottom: 15px;
              font-size: 20px;
              border-bottom: 2px solid #f0f0f0;
              padding-bottom: 10px;
            ">Message Details</h2>
            <div style="
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              border-left: 4px solid #764ba2;
            ">
              <p style="
                margin: 0;
                font-size: 16px;
                line-height: 1.6;
                color: #555;
                white-space: pre-wrap;
              ">${details}</p>
            </div>
          </div>

          <div style="
            margin-top: 30px;
            padding: 15px;
            background: #e8f4fd;
            border-radius: 8px;
            border: 1px solid #b6e0fe;
          ">
            <p style="
              margin: 0;
              color: #2c5aa0;
              font-size: 14px;
              text-align: center;
            ">
              ⏰ This message was submitted through the Legitem contact form. Please respond within 24 hours.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="
          text-align: center;
          padding: 20px;
          color: white;
          font-size: 14px;
        ">
          <p style="margin: 5px 0;">Legitem Contact Management System</p>
          <p style="margin: 5px 0; opacity: 0.8;">Automated Notification - Do not reply to this email</p>
        </div>
      </div>
    `,
    text: `Fullname: ${fullname}\nEmail: ${emailAddress}\nContact No.: ${contactNo}\nDetails: ${details}`
  };
  
  const data = await transporter.sendMail(mailOptions);
  return data;
}
