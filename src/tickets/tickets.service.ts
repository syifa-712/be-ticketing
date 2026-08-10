import { Injectable, NotFoundException } from '@nestjs/common';
import { Priority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { SubmitSatisfactionDto } from './dto/submit-satisfaction.dto';

type SlaTarget = {
  minutes?: number;
  businessDays?: number;
};

@Injectable()
export class TicketsService {
  private readonly WORK_HOURS_PER_DAY = 8;

  private readonly slaTargets: Record<
    Priority,
    { response: SlaTarget; resolution: SlaTarget }
  > = {
    urgent: {
      response: { minutes: 15 },
      resolution: { minutes: 4 * 60 },
    },
    high: {
      response: { minutes: 60 },
      resolution: { businessDays: 1 },
    },
    medium: {
      response: { minutes: 4 * 60 },
      resolution: { businessDays: 3 },
    },
    low: {
      response: { businessDays: 1 },
      resolution: { businessDays: 5 },
    },
  };
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async create(createTicketDto: CreateTicketDto) {
    const now = new Date();

    const date =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');

    const total = await this.prisma.ticket.count();

    const ticketNumber = `TCK-${date}-${String(total + 1).padStart(3, '0')}`;

    const ticket = await this.prisma.ticket.create({
      data: {
        ...createTicketDto,
        ticketNumber,
      },
    });

    await this.mailService.sendTicketCreated(ticket);

    return {
      ticket_number: ticket.ticketNumber,
      id: ticket.id,
    };
  }

  async findAll(query: {
    status?: string;
    priority?: string;
    tier?: string;
    assignedTo?: string;
    page: number;
    limit: number;
  }) {
    const { status, priority, tier, assignedTo, page, limit } = query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (tier) {
      where.tier = Number(tier);
    }

    if (assignedTo) {
      where.assignedToId = assignedTo;
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const total = await this.prisma.ticket.count({
      where,
    });

    return {
      data: tickets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  findOne(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });
  }

  async update(id: string, updateTicketDto: UpdateTicketDto) {
    const existing = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: updateTicketDto,
    });

    if (updateTicketDto.status && updateTicketDto.status !== existing.status) {
      await this.mailService.sendTicketStatusUpdated(ticket, existing.status);
    }

    if (
      updateTicketDto.tier !== undefined &&
      updateTicketDto.tier !== existing.tier
    ) {
      const agents = await this.prisma.user.findMany({
        where: {
          role: 'agent',
          tier: updateTicketDto.tier,
        },
        select: {
          email: true,
        },
      });

      await this.mailService.sendTicketEscalated(
        ticket,
        existing.tier,
        agents.map((agent) => agent.email),
      );
    }

    return ticket;
  }

  remove(id: string) {
    return this.prisma.ticket.delete({
      where: { id },
    });
  }

  async track(ticketNumber: string, requesterEmail: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: {
        ticketNumber,
        requesterEmail,
      },
      include: {
        activities: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!ticket) {
      return {
        message: 'Ticket tidak ditemukan',
      };
    }

    return {
      status: ticket.status,
      history: ticket.activities,
    };
  }

  async submitSatisfaction(id: string, dto: SubmitSatisfactionDto) {
    const { rating, comment } = dto;

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }

    await this.prisma.$transaction([
      this.prisma.ticket.update({
        where: { id },
        data: {
          satisfactionRating: rating,
        },
      }),
      this.prisma.ticketActivity.create({
        data: {
          ticketId: id,
          type: 'resolution',
          actor: ticket.requesterName,
          content: comment
            ? `Satisfaction rating: ${rating} - ${comment}`
            : `Satisfaction rating: ${rating}`,
        },
      }),
    ]);

    return this.findOne(id);
  }

  async getSla(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }

    const target = this.slaTargets[ticket.priority];

    const targetResponse = this.calculateSlaTarget(
      ticket.createdAt,
      target.response,
    );
    const targetResolution = this.calculateSlaTarget(
      ticket.createdAt,
      target.resolution,
    );

    const now = new Date();

    const status = this.getSlaStatus(
      now,
      targetResponse,
      targetResolution,
      target,
    );

    return {
      ticket_number: ticket.ticketNumber,
      priority: ticket.priority,
      target_response: targetResponse,
      target_resolution: targetResolution,
      sisa_waktu: {
        response: this.formatRemaining(
          Math.max(
            0,
            Math.floor((targetResponse.getTime() - now.getTime()) / 60000),
          ),
        ),
        resolution: this.formatRemaining(
          Math.max(
            0,
            Math.floor((targetResolution.getTime() - now.getTime()) / 60000),
          ),
        ),
      },
      status_sla: status,
    };
  }

  private calculateSlaTarget(from: Date, target: SlaTarget): Date {
    if (target.businessDays) {
      return this.addBusinessHours(
        from,
        target.businessDays * this.WORK_HOURS_PER_DAY,
      );
    }

    return new Date(from.getTime() + (target.minutes ?? 0) * 60000);
  }

  private addBusinessHours(from: Date, hours: number): Date {
    const workStart = 9;
    const workEnd = 17;

    const date = new Date(from);

    const moveToNextWorkingDay = () => {
      do {
        date.setDate(date.getDate() + 1);
      } while (date.getDay() === 0 || date.getDay() === 6);

      date.setHours(workStart, 0, 0, 0);
    };

    while (date.getDay() === 0 || date.getDay() === 6) {
      moveToNextWorkingDay();
    }

    let currentMinutes =
      date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

    if (currentMinutes < workStart * 60) {
      date.setHours(workStart, 0, 0, 0);
      currentMinutes = workStart * 60;
    } else if (currentMinutes >= workEnd * 60) {
      moveToNextWorkingDay();
      currentMinutes = workStart * 60;
    }

    let remainingMinutes = hours * 60;

    while (remainingMinutes > 0) {
      const availableToday = workEnd * 60 - currentMinutes;

      if (remainingMinutes <= availableToday) {
        date.setMinutes(date.getMinutes() + remainingMinutes);
        remainingMinutes = 0;
      } else {
        remainingMinutes -= availableToday;
        moveToNextWorkingDay();
        currentMinutes = workStart * 60;
      }
    }

    return date;
  }

  private getSlaStatus(
    now: Date,
    targetResponse: Date,
    targetResolution: Date,
    target: { response: SlaTarget; resolution: SlaTarget },
  ): string {
    if (now.getTime() >= targetResolution.getTime()) {
      return 'terlampaui';
    }

    if (now.getTime() >= targetResponse.getTime()) {
      return 'mendekati batas';
    }

    const totalMinutes =
      (target.resolution.businessDays ?? 0) * this.WORK_HOURS_PER_DAY * 60 +
      (target.resolution.minutes ?? 0);

    const remainingMinutes =
      (targetResolution.getTime() - now.getTime()) / 60000;

    if (remainingMinutes <= totalMinutes * 0.2) {
      return 'mendekati batas';
    }

    return 'aman';
  }

  private formatRemaining(totalMinutes: number) {
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    return { days, hours, minutes };
  }
}
