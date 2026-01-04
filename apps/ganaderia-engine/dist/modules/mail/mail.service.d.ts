export declare class MailService {
    private transporter;
    private readonly logger;
    constructor();
    sendEmail(to: string, subject: string, html: string): Promise<any>;
    sendReservationPending(reservation: any): Promise<void>;
    sendReservationConfirmed(reservation: any): Promise<void>;
    sendReservationCancelled(reservation: any): Promise<void>;
}
