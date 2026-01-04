import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(MailService.name);

    constructor() {
        // Initialize Transporter
        // TO-DO: Use Environment Variables for production
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '1025'), // Default to Mailhog/Mailpit port or 587
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER || 'user',
                pass: process.env.SMTP_PASS || 'pass',
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }

    async sendEmail(to: string, subject: string, html: string) {
        try {
            const info = await this.transporter.sendMail({
                from: '"SOTO DEL PRIOR" <reservas@sotodelprior.com>', // sender address
                to,
                subject,
                html,
            });
            this.logger.log(`Message sent: ${info.messageId}`);
            return info;
        } catch (error) {
            this.logger.error('Error sending email', error);
            // Don't throw to prevent breaking the flow, but log it
            return null;
        }
    }

    async sendReservationPending(reservation: any) {
        const confirmUrl = `http://localhost:3000/confirm-reservation?id=${reservation.id}`;
        const cancelUrl = `http://localhost:3000/cancel-reservation?id=${reservation.id}`;

        const html = `
            <div style="font-family: 'Lato', sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <div style="background-color: #0A0A0A; padding: 20px; text-align: center;">
                    <h1 style="color: #C59D5F; margin: 0; font-family: 'Oswald', sans-serif;">SOTO DEL PRIOR</h1>
                </div>
                <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
                    <h2 style="color: #0A0A0A; font-family: 'Oswald', sans-serif;">Solicitud de Reserva Recibida</h2>
                    <p>Hola ${reservation.name},</p>
                    <p>Hemos recibido correctamente tu solicitud de reserva. Aquí tienes los detalles:</p>
                    
                    <ul style="background: #f9f9f9; padding: 15px 30px; list-style: none;">
                        <li><strong>Fecha:</strong> ${new Date(reservation.date).toLocaleDateString()}</li>
                        <li><strong>Hora:</strong> ${new Date(reservation.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}h</li>
                        <li><strong>Personas:</strong> ${reservation.pax}</li>
                        <li><strong>Estada:</strong> SOTO DEL PRIOR (Navarra)</li>
                    </ul>

                    <p>Para confirmar definitivamente tu mesa, por favor haz clic en el siguiente botón:</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${confirmUrl}" style="background-color: #C59D5F; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; text-transform: uppercase; font-family: 'Oswald', sans-serif;">CONFIRMAR RESERVA</a>
                    </div>
                     <p style="text-align: center; font-size: 12px;">
                        <a href="${cancelUrl}" style="color: #999; text-decoration: underline;">Cancelar solicitud</a>
                    </p>
                </div>
                <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
                    <p>SOTO DEL PRIOR - Finca Soto del Prior, Navarra</p>
                </div>
            </div>
        `;

        await this.sendEmail(reservation.email, 'Confirma tu reserva en SOTO DEL PRIOR', html);
    }

    async sendReservationConfirmed(reservation: any) {
        const cancelUrl = `http://localhost:3000/cancel-reservation?id=${reservation.id}`;
        const html = `
            <div style="font-family: 'Lato', sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <div style="background-color: #0A0A0A; padding: 20px; text-align: center;">
                    <h1 style="color: #C59D5F; margin: 0; font-family: 'Oswald', sans-serif;">SOTO DEL PRIOR</h1>
                </div>
                <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
                    <h2 style="color: #0A0A0A; font-family: 'Oswald', sans-serif;">¡Reserva Confirmada!</h2>
                    <p>Tu mesa está reservada y te estamos esperando.</p>
                    
                    <ul style="background: #f9f9f9; padding: 15px 30px; list-style: none;">
                        <li><strong>Fecha:</strong> ${new Date(reservation.date).toLocaleDateString()}</li>
                         <li><strong>Hora:</strong> ${new Date(reservation.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}h</li>
                        <li><strong>Personas:</strong> ${reservation.pax}</li>
                    </ul>

                    <p>Si necesitas modificar o cancelar tu reserva, utiliza el siguiente enlace:</p>
                     <div style="text-align: center; margin: 30px 0;">
                        <a href="${cancelUrl}" style="color: #666; text-decoration: underline;">Gestionar mi reserva</a>
                    </div>
                </div>
                <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
                    <p>SOTO DEL PRIOR - Finca Soto del Prior, Navarra</p>
                </div>
            </div>
        `;
        await this.sendEmail(reservation.email, '¡Reserva Confirmada! - SOTO DEL PRIOR', html);
    }

    async sendReservationCancelled(reservation: any) {
        const html = `
             <div style="font-family: 'Lato', sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <div style="background-color: #0A0A0A; padding: 20px; text-align: center;">
                    <h1 style="color: #C59D5F; margin: 0; font-family: 'Oswald', sans-serif;">SOTO DEL PRIOR</h1>
                </div>
                <div style="padding: 20px; border: 1px solid #eee; border-top: none;">
                    <h2 style="color: #999; font-family: 'Oswald', sans-serif;">Reserva Cancelada</h2>
                    <p>Tu reserva ha sido cancelada correctamente.</p>
                     <ul style="background: #f9f9f9; padding: 15px 30px; list-style: none; color: #999;">
                        <li><strong>Fecha:</strong> ${new Date(reservation.date).toLocaleDateString()}</li>
                    </ul>
                    <p>Esperamos verte en otra ocasión.</p>
                </div>
            </div>
        `;
        await this.sendEmail(reservation.email, 'Reserva Cancelada - SOTO DEL PRIOR', html);
    }
}
