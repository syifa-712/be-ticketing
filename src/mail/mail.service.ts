import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { Ticket } from '@prisma/client';

type MailPayload = {
  to: string;
  cc?: string[];
  subject: string;
  text: string;
};

@Injectable()
export class MailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  async sendTicketCreated(ticket: Ticket) {
    await this.send({
      to: ticket.requesterEmail,
      subject: `[${ticket.ticketNumber}] Konfirmasi tiket diterima`,
      text:
        `Halo ${ticket.requesterName},\n\n` +
        `Tiket Anda telah kami terima dengan detail berikut:\n` +
        `- Nomor tiket: ${ticket.ticketNumber}\n` +
        `- Subjek: ${ticket.subject}\n` +
        `- Kategori: ${ticket.category}\n` +
        `- Prioritas: ${ticket.priority}\n` +
        `- Status: ${ticket.status}\n\n` +
        `Kami akan segera memproses tiket Anda. Terima kasih.`,
    });
  }

  async sendTicketStatusUpdated(ticket: Ticket, previousStatus: string) {
    await this.send({
      to: ticket.requesterEmail,
      subject: `[${ticket.ticketNumber}] Update status tiket`,
      text:
        `Halo ${ticket.requesterName},\n\n` +
        `Status tiket ${ticket.ticketNumber} telah diperbarui:\n` +
        `- Status sebelumnya: ${previousStatus}\n` +
        `- Status saat ini: ${ticket.status}\n\n` +
        `Detail tiket: ${ticket.subject}`,
    });
  }

  async sendTicketEscalated(
    ticket: Ticket,
    previousTier: number,
    agentEmails: string[],
  ) {
    const subject = `[${ticket.ticketNumber}] Tiket dieskalasi ke Tier ${ticket.tier}`;

    await this.send({
      to: 'agents@ticketing.dev',
      cc: agentEmails,
      subject,
      text:
        `Tiket berikut telah dieskalasi ke Tier ${ticket.tier}:\n\n` +
        `- Nomor tiket: ${ticket.ticketNumber}\n` +
        `- Subjek: ${ticket.subject}\n` +
        `- Kategori: ${ticket.category}\n` +
        `- Prioritas: ${ticket.priority}\n` +
        `- Tier sebelumnya: ${previousTier}\n` +
        `- Tier saat ini: ${ticket.tier}\n` +
        `- Alasan eskalasi: ${ticket.escalationReason ?? '-'}\n\n` +
        `Mohon segera ditangani oleh agen Tier ${ticket.tier}.`,
    });
  }

  private async send(mail: MailPayload) {
    try {
      const info = (await this.transporter.sendMail({
        from: 'no-reply@ticketing.dev',
        ...mail,
      })) as { message: string };

      console.log('\n[MailService] ==============================');
      console.log('[MailService] Email simulasi terkirim');
      console.log(`[MailService] To: ${mail.to}`);
      console.log(`[MailService] Cc: ${mail.cc?.join(', ') ?? '-'}`);
      console.log(`[MailService] Subject: ${mail.subject}`);
      console.log('[MailService] Body:');
      console.log(mail.text);
      console.log('[MailService] ==============================\n');
      console.log(`[MailService] Payload JSON: ${info.message}`);
    } catch (error) {
      console.error('[MailService] Gagal mengirim email (simulasi):', error);
    }
  }
}
