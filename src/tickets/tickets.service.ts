import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SlaService } from '../sla/sla.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { SubmitSatisfactionDto } from './dto/submit-satisfaction.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private slaService: SlaService,
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

    const data: Prisma.TicketUpdateInput = { ...updateTicketDto };

    if (
      updateTicketDto.status &&
      (updateTicketDto.status === Status.resolved ||
        updateTicketDto.status === Status.closed)
    ) {
      data.slaBreached = false;
    }

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data,
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

  async assign(id: string, assignTicketDto: AssignTicketDto) {
    return this.prisma.ticket.update({
      where: { id },
      data: {
        assignedToId: assignTicketDto.assigned_to,
        status: 'in_progress',
      },
    });
  }

  async escalate(id: string, escalateTicketDto: EscalateTicketDto) {
  const ticket = await this.prisma.ticket.update({
    where: { id },
    data: {
      tier: escalateTicketDto.target_tier,
      status: 'escalated',
      escalationReason: escalateTicketDto.reason,
    },
  });

  await this.prisma.ticketActivity.create({
    data: {
      ticketId: id,
      type: 'escalation',
      actor: 'system',
      content: escalateTicketDto.reason,
    },
  });

  return ticket;
}
async resolve(id: string, resolveTicketDto: ResolveTicketDto) {
  const ticket = await this.prisma.ticket.update({
    where: { id },
    data: {
      status: 'resolved',
      resolutionNote: resolveTicketDto.resolution_note,
      resolvedAt: new Date(),
    },
  });

  await this.prisma.ticketActivity.create({
    data: {
      ticketId: id,
      type: 'resolution',
      actor: 'system',
      content: resolveTicketDto.resolution_note,
    },
  });

  return ticket;
}
async reopen(id: string, reopenTicketDto: ReopenTicketDto) {
  const ticket = await this.prisma.ticket.update({
    where: { id },
    data: {
      status: 'in_progress',
    },
  });

  await this.prisma.ticketActivity.create({
    data: {
      ticketId: id,
      type: 'reopen',
      actor: 'requester',
      content: reopenTicketDto.reason,
    },
  });

  return ticket;
}
async addComment(id: string, createCommentDto: CreateCommentDto) {
  return this.prisma.ticketActivity.create({
    data: {
      ticketId: id,
      type: 'comment',
      actor: createCommentDto.actor,
      content: createCommentDto.content,
    },
  });
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

    return {
      ticket_number: ticket.ticketNumber,
      priority: ticket.priority,
      ...this.slaService.getSlaInfo(ticket),
    };
  }
}
