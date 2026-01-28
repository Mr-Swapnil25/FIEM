import * as nodemailer from 'nodemailer';
import * as functions from 'firebase-functions';

// Interface for Email Options
interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

// Singleton transporter instance
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize the Nodemailer transporter
 * Prioritizes Firebase Config, then Environment Variables, then Ethereal Fallback
 */
const getTransporter = async (): Promise<nodemailer.Transporter> => {
    if (transporter) return transporter;

    const config = functions.config().email;

    // 1. Production: Firebase Config (firebase functions:config:set email.service=...)
    if (config && config.user && config.pass) {
        console.log(`[EmailService] Initializing PRODUCTION transporter (${config.service || 'gmail'})...`);
        transporter = nodemailer.createTransport({
            service: config.service || 'gmail', // 'gmail', 'SendGrid', 'SES', etc.
            auth: {
                user: config.user,
                pass: config.pass
            }
        });

        // Verify connection on startup
        try {
            await transporter.verify();
            console.log('[EmailService] ✅ SMTP Connection Verified');
        } catch (error) {
            console.error('[EmailService] ❌ SMTP Connection Failed:', error);
            transporter = null; // Reset to retry later
            throw error;
        }

        return transporter;
    }

    // 2. Development: Ethereal Email
    console.warn('[EmailService] ⚠️ No production config found. Using ETHEREAL TEST ACCOUNT.');
    console.warn('[EmailService] Run `firebase functions:config:set email.user="..." email.pass="..."` to configure production.');

    try {
        const testAccount = await nodemailer.createTestAccount();
        console.log('[EmailService] Created Ethereal Account:', {
            user: testAccount.user,
            pass: '*****', // Don't log password
            web: `https://ethereal.email/messages`
        });

        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        return transporter;
    } catch (err) {
        console.error('[EmailService] Failed to create test account:', err);
        throw err;
    }
};

/**
 * Send an email with retry logic
 */
export const sendEmail = async (options: EmailOptions, retries = 2): Promise<void> => {
    try {
        const mailTransport = await getTransporter();

        const info = await mailTransport.sendMail({
            from: '"EventEase Team" <noreply@eventease.com>',
            ...options
        });

        console.log('[EmailService] ✅ Email sent:', info.messageId);

        // Log preview URL only if using Ethereal
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('[EmailService] 🔗 Preview URL:', previewUrl);
        }
    } catch (error) {
        console.error(`[EmailService] ❌ Failed to send email to ${options.to}:`, error);

        if (retries > 0) {
            console.log(`[EmailService] Retrying... (${retries} attempts left)`);
            await new Promise(res => setTimeout(res, 1000)); // Wait 1s
            return sendEmail(options, retries - 1);
        }
        throw error;
    }
};
