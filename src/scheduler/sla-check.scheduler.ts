import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SlaService } from '../sla/sla.service';

@Injectable()
export class SlaCheckScheduler {
  private readonly logger = new Logger(SlaCheckScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slaService: SlaService,
  ) {}

  @Cron('0 */15 * * * *')
  async checkSlaBreaches() {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        status: {
          notIn: [Status.resolved, Status.closed],
        },
      },
      select: {
        id: true,
        ticketNumber: true,
        priority: true,
        createdAt: true,
        slaBreached: true,
      },
    });

    if (tickets.length === 0) {
      this.logger.log('Tidak ada tiket terbuka, SLA check dilewati');
      return;
    }

    let marked = 0;

    for (const ticket of tickets) {
      const breached = this.slaService.isSlaBreached(ticket);

      if (ticket.slaBreached !== breached) {
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: { slaBreached: breached },
        });
        marked++;
      }
    }

    this.logger.log(
      `SLA check selesai: ${tickets.length} tiket dicek, ${marked} diperbarui`,
    );
  }
}
