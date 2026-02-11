import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    }
});

transporter.verify((error) => {
    if (error) {
        console.error('Error connecting to email server:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// OTP Email Template
const getOtpTemplate = (otp) => {
    return `
    <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px;">
        <div style="max-width:500px; margin:auto; background:white; padding:30px; border-radius:8px; text-align:center;">
            
            <h2 style="color:#2c3e50; margin-bottom:10px;">ImpactHub</h2>
            <p style="color:#555; font-size:16px;">
                Verify your email to complete your registration.
            </p>

            <div style="margin:25px 0;">
                <span style="
                    display:inline-block;
                    padding:15px 25px;
                    font-size:28px;
                    font-weight:bold;
                    letter-spacing:5px;
                    color:#2c3e50;
                    background:#ecf0f1;
                    border-radius:6px;
                ">
                    ${otp}
                </span>
            </div>

            <p style="color:#777; font-size:14px;">
                This OTP is valid for <strong>5 minutes</strong>.
            </p>

            <p style="color:#aaa; font-size:12px; margin-top:30px;">
                If you didn’t request this, you can safely ignore this email.
            </p>

        </div>
    </div>
    `;
};

// Send OTP Email
const sendOtpEmail = async (to, otp) => {
    try {
        const info = await transporter.sendMail({
            from: `"ImpactHub" <${process.env.EMAIL_USER}>`,
            to,
            subject: "Your ImpactHub Verification Code",
            text: `Your ImpactHub OTP is: ${otp}. It is valid for 5 minutes.`,
            html: getOtpTemplate(otp),
        });

        console.log('OTP email sent:', info.messageId);
    } catch (error) {
        console.error('Error sending OTP email:', error);
    }
};

export {
    transporter,
    sendOtpEmail,
};
