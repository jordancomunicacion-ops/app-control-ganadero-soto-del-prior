import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER || 'user',
        pass: process.env.SMTP_PASS || 'pass',
    },
});

export async function sendEmail(to: string, subject: string, html: string) {
    if (!process.env.SMTP_HOST) {
        console.log('==================================================');
        console.log(`[MOCK EMAIL] To: ${to}`);
        console.log(`[MOCK EMAIL] Subject: ${subject}`);
        console.log(`[MOCK EMAIL] HTML: ${html}`);
        console.log('==================================================');
        return;
    }

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Soto del Prior" <noreply@sotodelprior.com>',
            to,
            subject,
            html,
        });
        console.log(`[EMAIL] Sent to ${to}`);
    } catch (error) {
        console.error('[EMAIL] Error sending email:', error);
        throw new Error('No se pudo enviar el correo.');
    }
}
