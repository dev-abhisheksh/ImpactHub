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
  <body style="margin:0; padding:0; background-color:#0b1220; font-family:Arial, sans-serif;">
    
    <div style="max-width:600px; margin:40px auto; background:#0f172a; border-radius:16px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.5);">
      
      <!-- Header -->
      <div style="padding:24px 32px; background:linear-gradient(135deg, #22c55e, #3b82f6); text-align:center;">
        <h1 style="margin:0; color:white; font-size:24px; letter-spacing:1px;">
          ImpactHub
        </h1>
        <p style="margin:8px 0 0; color:#d1fae5; font-size:14px;">
          Connecting Problems to Solutions 🌍
        </p>
      </div>

      <!-- Content -->
      <div style="padding:32px; color:#e5e7eb;">
        
        <h2 style="margin-top:0; font-size:20px; color:white;">
          Verify Your Email
        </h2>

        <p style="font-size:15px; color:#9ca3af; line-height:1.6;">
          You're one step away from joining ImpactHub.  
          Use the OTP below to verify your email and start making an impact.
        </p>

        <!-- OTP BOX -->
        <div style="
          margin:30px 0;
          padding:20px;
          text-align:center;
          background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:12px;
        ">
          <span style="
            font-size:36px;
            letter-spacing:12px;
            font-weight:bold;
            color:#22c55e;
          ">
            ${otp}
          </span>
        </div>

        <p style="font-size:14px; color:#facc15;">
          ⏳ This OTP is valid for 5 minutes.
        </p>

        <p style="font-size:13px; color:#6b7280; margin-top:20px;">
          If you didn’t request this, you can safely ignore this email.
        </p>

      </div>

      <!-- Footer -->
      <div style="padding:20px; text-align:center; border-top:1px solid rgba(255,255,255,0.1);">
        <p style="margin:0; font-size:12px; color:#6b7280;">
          © ${new Date().getFullYear()} ImpactHub. All rights reserved.
        </p>
      </div>

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