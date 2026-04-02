import dotenv from "dotenv";
import { BrevoClient } from "@getbrevo/brevo";

dotenv.config();

const BREVO_API_KEY = process.env.BREVO_API_KEY;

if (!BREVO_API_KEY) {
  throw new Error("Missing BREVO_API_KEY");
}

const brevo = new BrevoClient({ apiKey: BREVO_API_KEY });

const getOtpTemplate = (otp) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
    <h1 style="color: #333;">MindArchive</h1>
    <p style="font-size: 16px; color: #666;">Verify your email to complete your registration.</p>
    <div style="background-color: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
      <h2 style="color: #333; font-size: 32px; letter-spacing: 8px; margin: 0;">${otp}</h2>
    </div>
    <p style="color: #999; font-size: 14px;">This OTP is valid for 5 minutes.</p>
  </div>
</body>
</html>
`;

const sendEmail = async ({ to, subject, htmlContent, textContent }) => {
  return await brevo.transactionalEmails.sendTransacEmail({
    to: [{ email: to }],
    sender: { email: "productimpacthub@gmail.com", name: "ImpactHub" },
    subject,
    htmlContent,
    textContent,
  });
};

const sendOtpEmail = async (to, otp) => {
  return await sendEmail({
    to,
    subject: "Verify your email",
    htmlContent: getOtpTemplate(otp),
    textContent: `Your OTP is: ${otp}. Valid for 5 minutes.`,
  });
};

const transporter = {
  verify: () => {
    if (!BREVO_API_KEY) return Promise.resolve(false);
    return Promise.resolve(true);
  },
};

export { transporter, sendOtpEmail };