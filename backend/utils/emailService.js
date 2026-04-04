const nodemailer = require('nodemailer');

/**
 * Creates a Nodemailer transporter using Gmail credentials from .env
 */
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use TLS (port 587) instead of SSL (port 465) which is often blocked by hosting providers
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS  // Gmail App Password
        }
    });
};

/**
 * Sends an OTP verification email
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit OTP code
 * @param {string} purpose - 'registration' or 'profile_update'
 */
const sendOtpEmail = async (to, otp, purpose = 'registration') => {
    const transporter = createTransporter();

    const isRegistration = purpose === 'registration';
    const subject = isRegistration
        ? 'SRIT Academic Portal — Verify your Email'
        : 'SRIT Academic Portal — Email Update Verification';

    const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8f9fa; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1a237e 0%, #283593 100%); padding: 32px 40px; text-align: center;">
            <div style="font-size: 36px; font-weight: 900; color: #ffffff; letter-spacing: 3px;">SRIT</div>
            <div style="color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px;">Srinivasa Ramanujan Institute of Technology</div>
        </div>
        <!-- Body -->
        <div style="padding: 36px 40px; background: #ffffff;">
            <h2 style="color: #1a237e; margin: 0 0 8px 0; font-size: 22px;">
                ${isRegistration ? '🎓 Email Verification' : '📧 Update Verification'}
            </h2>
            <p style="color: #555; font-size: 15px; margin: 0 0 24px 0; line-height: 1.6;">
                ${isRegistration
            ? 'Thank you for registering with the SRIT Academic Portal. Please use the OTP below to verify your email address:'
            : 'You have requested to update your email address. Use the OTP below to confirm this change:'
        }
            </p>
            <!-- OTP Box -->
            <div style="background: linear-gradient(135deg, #e8eaf6, #f3f4ff); border: 2px dashed #3f51b5; border-radius: 10px; padding: 24px; text-align: center; margin: 20px 0;">
                <div style="font-size: 11px; color: #7986cb; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Your Verification OTP</div>
                <div style="font-size: 42px; font-weight: 900; color: #1a237e; letter-spacing: 10px; font-family: 'Courier New', monospace;">${otp}</div>
                <div style="font-size: 12px; color: #9e9e9e; margin-top: 10px;">Valid for <strong>10 minutes</strong></div>
            </div>
            <p style="color: #888; font-size: 13px; margin-top: 24px; line-height: 1.6;">
                If you did not request this, please ignore this email. Do not share this OTP with anyone.
            </p>
        </div>
        <!-- Footer -->
        <div style="background: #f5f5f5; padding: 20px 40px; text-align: center; border-top: 1px solid #eeeeee;">
            <div style="color: #9e9e9e; font-size: 12px;">© 2024 SRIT Ananthapuramu | <a href="https://www.srit.ac.in" style="color: #5c6bc0; text-decoration: none;">www.srit.ac.in</a></div>
        </div>
    </div>`;

    await transporter.sendMail({
        from: `"SRIT Academic Portal" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
    });
};

module.exports = { sendOtpEmail };
