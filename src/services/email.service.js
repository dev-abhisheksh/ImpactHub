import dotenv from 'dotenv';
import { Resend } from 'resend';

dotenv.config();

if (!process.env.RESEND_API_KEY) {
  console.error('⚠️  Missing RESEND_API_KEY environment variable');
}

const resend = new Resend(process.env.RESEND_API_KEY);

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
    console.log(`📧 Sending OTP to ${to} via Resend`);
    
    const { data, error } = await resend.emails.send({
      from: 'ImpactHub <onboarding@resend.dev>', // Use resend.dev for testing
      to: [to],
      subject: 'Your ImpactHub Verification Code',
      html: getOtpTemplate(otp),
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }

    console.log('✅ OTP email sent successfully via Resend:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// Export a dummy transporter for compatibility
const transporter = {
  verify: () => Promise.resolve(true)
};

export { transporter, sendOtpEmail };