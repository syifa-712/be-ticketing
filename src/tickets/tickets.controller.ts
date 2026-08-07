import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';
import { AssignTicketDto } from './dto/assign-ticket.dto';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('tier') tier?: string,
    @Query('assigned_to') assignedTo?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.ticketsService.findAll({
      status,
      priority,
      tier,
      assignedTo,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('track')
  track(
    @Query('ticketNumber') ticketNumber: string,
    @Query('requesterEmail') requesterEmail: string,
  ) {
    return this.ticketsService.track(ticketNumber, requesterEmail);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, updateTicketDto);
  }

  @UseGuards(JwtAuthGuard)
@Patch(':id/assign')
assign(
  @Param('id') id: string,
  @Body() assignTicketDto: AssignTicketDto,
) {
  return this.ticketsService.assign(id, assignTicketDto);
}
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }
}