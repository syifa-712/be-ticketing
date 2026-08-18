import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, Status } from '@prisma/client';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
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

import {
  CreateTicketMessageDto,
  TicketMessageResponseDto,
  TicketConversationResponseDto,
} from './dto/ticket-message.dto';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private slaService: SlaService,
  ) {}

  async create(
    createTicketDto: CreateTicketDto,
    file?: any,
  ) {
    console.log('FILE:', file);
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

    // =========================================================
    // ATTACHMENT
    // =========================================================

    if (file) {
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

      const maxFileSize = 5 * 1024 * 1024; // 5 MB

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Tipe file tidak diperbolehkan. Gunakan JPG, JPEG, PNG, atau WEBP.',
        );
      }

      if (file.size > maxFileSize) {
        throw new BadRequestException(
          'Ukuran file terlalu besar. Maksimal 5 MB.',
        );
      }

      const uploadDir = join(process.cwd(), 'uploads');

      await mkdir(uploadDir, {
        recursive: true,
      });

      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = join(uploadDir, fileName);

      await writeFile(filePath, file.buffer);

      await this.prisma.ticketAttachment.create({
        data: {
          ticketId: ticket.id,
          fileName: file.originalname,
          fileUrl: `/uploads/${fileName}`,
          mimeType: file.mimetype,
          fileSize: file.size,
        },
      });
    }

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
        attachments: {
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
      await this.mailService.sendTicketStatusUpdated(
        ticket,
        existing.status,
      );
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

  /*
   * =========================================================
   * TICKET MESSAGE / CONVERSATION
   * =========================================================
   */

  async getTicketConversation(
    ticketId: string,
    currentUser: any,
  ): Promise<TicketConversationResponseDto> {
    const ticket = await this.prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }

    // User hanya boleh melihat tiket miliknya sendiri
    if (
      currentUser.role === 'user' &&
      ticket.requesterEmail !== currentUser.email
    ) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }

    const unreadCount = ticket.messages.filter(
      (message) =>
        !message.isRead &&
        message.senderId !== currentUser.id,
    ).length;

    const lastMessage =
      ticket.messages[ticket.messages.length - 1];

    return {
      ticketId: ticket.id,
      ticketSubject: ticket.subject,
      ticketStatus: ticket.status,
      canUserReply: !['closed', 'resolved'].includes(ticket.status),
      lastMessageAt:
        lastMessage?.createdAt || ticket.createdAt,
      unreadCount,
      messages: ticket.messages as TicketMessageResponseDto[],
    };
  }

  async sendMessage(
    createMessageDto: CreateTicketMessageDto,
    currentUser: any,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: {
        id: createMessageDto.ticketId,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }

    // User hanya boleh mengirim pesan pada tiket miliknya
    if (
      currentUser.role === 'user' &&
      ticket.requesterEmail !== currentUser.email
    ) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }

    // Ticket yang sudah closed tidak boleh menerima pesan
    if (ticket.status === 'closed') {
      throw new Error(
        'Ticket sudah ditutup dan tidak dapat dibalas',
      );
    }

    const sender = await this.prisma.user.findUnique({
      where: {
        id: currentUser.id,
      },
    });

    if (!sender) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: sender.id,
        senderRole: sender.role,
        senderName: sender.name,
        senderEmail: sender.email,
        message: createMessageDto.message,
      },
    });

    return message;
  }

  async getUnreadCount(currentUser: any): Promise<number> {
    const where: any = {
      isRead: false,
      senderId: {
        not: currentUser.id,
      },
    };

    // User hanya menghitung pesan dari tiket miliknya
    if (currentUser.role === 'user') {
      where.ticket = {
        requesterEmail: currentUser.email,
      };
    }

    return this.prisma.ticketMessage.count({
      where,
    });
  }

  async markMessagesAsRead(
    ticketId: string,
    currentUser: any,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: {
        id: ticketId,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }

    // User hanya boleh mengakses tiket miliknya
    if (
      currentUser.role === 'user' &&
      ticket.requesterEmail !== currentUser.email
    ) {
      throw new NotFoundException('Ticket tidak ditemukan');
    }

    await this.prisma.ticketMessage.updateMany({
      where: {
        ticketId,
        senderId: {
          not: currentUser.id,
        },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return {
      message: 'Pesan berhasil ditandai sudah dibaca',
    };
  }

  async getTicketsWithMessages(currentUser: any) {
    const where: any = {
      messages: {
        some: {},
      },
    };

    // User hanya melihat tiket miliknya
    if (currentUser.role === 'user') {
      where.requesterEmail = currentUser.email;
    }

    const tickets = await this.prisma.ticket.findMany({
      where,
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return tickets.map((ticket) => ({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      lastMessage: ticket.messages[0] || null,
      unreadCount: 0,
    }));
  }

  /*
   * =========================================================
   * LAINNYA
   * =========================================================
   */

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

  async submitSatisfaction(
    id: string,
    dto: SubmitSatisfactionDto,
  ) {
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