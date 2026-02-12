import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import dns from 'dns';
import { promisify } from 'util';

dotenv.config();

const resolve4 = promisify(dns.resolve4);

// Validate environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('⚠️  Missing EMAIL_USER or EMAIL_PASS environment variables');
}

// Multiple fallback Gmail SMTP IPv4 addresses
const GMAIL_FALLBACK_IPS = [
    '142.251.12.108',
    '142.251.111.108',
    '172.253.115.108',
    '74.125.68.108'
];

// Function to get IPv4 address for Gmail SMTP
const getGmailIPv4 = async () => {
    try {
        const addresses = await resolve4('smtp.gmail.com');
        console.log('✅ Resolved Gmail SMTP to IPv4:', addresses[0]);
        return addresses[0];
    } catch (error) {
        console.warn('⚠️  DNS resolution failed, using fallback IP:', error.message);
        // Return first fallback IP
        return GMAIL_FALLBACK_IPS[0];
    }
};

// Create transporter with IPv4 address
let transporter;

const initializeTransporter = async () => {
    const gmailIP = await getGmailIPv4();

    transporter = nodemailer.createTransport({
        host: gmailIP,
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        tls: {
            rejectUnauthorized: false,
            minVersion: 'TLSv1.2',
            servername: 'smtp.gmail.com'
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
    });

    // Verify connection
    try {
        await transporter.verify();
        console.log('✅ Email server connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Email server verification failed:', error.message);

        // Try fallback IPs
        for (let i = 1; i < GMAIL_FALLBACK_IPS.length; i++) {
            console.log(`🔄 Trying fallback IP ${i}:`, GMAIL_FALLBACK_IPS[i]);
            try {
                transporter = nodemailer.createTransport({
                    host: GMAIL_FALLBACK_IPS[i],
                    port: 587,
                    secure: false,
                    requireTLS: true,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                    tls: {
                        rejectUnauthorized: false,
                        minVersion: 'TLSv1.2',
                        servername: 'smtp.gmail.com'
                    },
                    connectionTimeout: 15000,
                    greetingTimeout: 15000,
                    socketTimeout: 15000,
                });

                await transporter.verify();
                console.log('✅ Email server connected with fallback IP');
                return true;
            } catch (fallbackError) {
                console.error(`❌ Fallback IP ${i} failed:`, fallbackError.message);
            }
        }

        return false;
    }
};

// Initialize on module load
initializeTransporter();

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
        // Ensure transporter is initialized
        if (!transporter) {
            console.log('⚠️  Transporter not ready, initializing...');
            const initialized = await initializeTransporter();
            if (!initialized) {
                throw new Error('Failed to initialize email transporter');
            }
        }

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
        console.error('Error code:', error.code);

        // Retry once with reinitialization
        try {
            console.log('🔄 Retrying email send with fresh connection...');
            await initializeTransporter();

            const info = await transporter.sendMail({
                from: `"ImpactHub" <${process.env.EMAIL_USER}>`,
                to,
                subject: "Your ImpactHub Verification Code",
                text: `Your ImpactHub OTP is: ${otp}. It is valid for 5 minutes.`,
                html: getOtpTemplate(otp),
            });

            console.log('✅ OTP email sent successfully on retry:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (retryError) {
            console.error('❌ Retry failed:', retryError.message);
            throw new Error(`Email sending failed: ${error.message}`);
        }
    }
};

export { transporter, sendOtpEmail };