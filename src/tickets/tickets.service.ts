import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

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
    const {
      status,
      priority,
      tier,
      assignedTo,
      page,
      limit,
    } = query;

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

  update(id: string, updateTicketDto: UpdateTicketDto) {
    return this.prisma.ticket.update({
      where: { id },
      data: updateTicketDto,
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
}