import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'yahoo',
  auth: {
    user: process.env.YAHOO_EMAIL_USER as string, // Yahoo email from .env.local
    pass: process.env.YAHOO_EMAIL_PASS as string, // Yahoo app password from .env.local
  },
});

export const sendMail = async (email:string,fullname:string) => { 
    const mailOptions = {
        from: process.env.YAHOO_EMAIL_USER, // Yahoo email address used to send the email
        to: email, // Recipient email address
        subject: 'From Legitem SignUp',
        text: `Hello ${fullname}, thank you for joining us! You can now log in, check out your purchases, and enjoy shopping.`,
      };
      const data = await transporter.sendMail(mailOptions);
      return data;
}



export const ContactUs = async (body:any) =>{
 const {emailAddress,fullname,contactNo,details} = body;


  const mailOptions = {
    from: process.env.YAHOO_EMAIL_USER, // Yahoo email address used to send the email
    to: process.env.YAHOO_EMAIL_USER, // Recipient email address
    subject: 'From Legitem Contact Us',
    text: `Fullname: ${fullname}\nEmail: ${body.emailAddress}\nContact No.: ${contactNo}\nDetails: ${details}`,
    html: `
      <h1>From Motogo.inc Contact Us</h1>
      <img height="100px" width="100px" src='https://hokei-storage.s3.ap-northeast-1.amazonaws.com/images/Legit/IconImages/Legitem-svg.svg'/>
      <p>Fullname: ${fullname}</p>
      <p>Email: ${emailAddress}</p>
      <p>Contact No.: ${contactNo}</p>
      <p>Details: ${details}</p>
    `,
  };
  const data = await transporter.sendMail(mailOptions);
  return data;
}
