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

  findAll() {
    return this.prisma.ticket.findMany();
  }

  findOne(id: string) {
    return this.prisma.ticket.findUnique({
      where: { id },
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
}