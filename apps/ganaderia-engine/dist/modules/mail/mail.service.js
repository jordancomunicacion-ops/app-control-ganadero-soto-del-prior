"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
let MailService = MailService_1 = class MailService {
    transporter;
    logger = new common_1.Logger(MailService_1.name);
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '1025'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER || 'user',
                pass: process.env.SMTP_PASS || 'pass',
            },
            tls: {
                rejectUnauthorized: false
            }
        });
    }
    async sendEmail(to, subject, html) {
        try {
            const info = await this.transporter.sendMail({
                from: '"SOTO DEL PRIOR" <reservas@sotodelprior.com>',
                to,
                subject,
                html,
            });
            this.logger.log(`Message sent: ${info.messageId}`);
            return info;
        }
        catch (error) {
            this.logger.error('Error sending email', error);
            return null;
        }
    }
    async sendReservationPending(reservation) {
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
    async sendReservationConfirmed(reservation) {
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
    async sendReservationCancelled(reservation) {
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
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MailService);
//# sourceMappingURL=mail.service.js.map