import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import dns from "dns/promises";

dotenv.config();

// CRITICAL: Force IPv4 DNS resolution
dns.setDefaultResultOrder("ipv4first");

// Validate environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error('⚠️  Missing EMAIL_USER or EMAIL_PASS environment variables');
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // Use port 587 instead of 465
  secure: false, // false for port 587
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Force IPv4
  family: 4,
  // Additional options for Render
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  // Connection timeout
  connectionTimeout: 10000,
  greetingTimeout: 10000,
});

// Better verification with timeout
const verifyEmailServer = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email server connected successfully');
  } catch (error) {
    console.error('❌ Email server connection failed:', error.message);
    console.error('Error code:', error.code);
  }
};

// Call verification
verifyEmailServer();

const getOtpTemplate = (otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
        <h1 style="color: #333;">ImpactHub</h1>
        <p style="font-size: 16px; color: #666;">Verify your email to complete your registration.</p>
        <div style="background-color: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
          <h2 style="color: #333; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h2>
        </div>
        <p style="color: #999; font-size: 14px;">This OTP is valid for 5 minutes.</p>
        <p style="color: #999; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
  `;
};

const sendOtpEmail = async (to, otp) => {
  try {
    console.log(`📧 Sending OTP to ${to}`);
    
    const info = await transporter.sendMail({
      from: `"ImpactHub" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your ImpactHub Verification Code",
      text: `Your ImpactHub OTP is: ${otp}. It is valid for 5 minutes.`,
      html: getOtpTemplate(otp),
    });
    
    console.log('✅ OTP email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

export { transporter, sendOtpEmail };