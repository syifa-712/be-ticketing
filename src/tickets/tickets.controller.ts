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
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { TicketsService } from './tickets.service';

import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { SubmitSatisfactionDto } from './dto/submit-satisfaction.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { EscalateTicketDto } from './dto/escalate-ticket.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { ReopenTicketDto } from './dto/reopen-ticket.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateTicketMessageDto } from './dto/ticket-message.dto';

import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // =========================================================
  // CREATE TICKET
  // =========================================================

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() createTicketDto: CreateTicketDto,
    @UploadedFile() file?: any,
  ) {
    return this.ticketsService.create(
      createTicketDto,
      file,
    );
  }

  // =========================================================
  // SATISFACTION
  // =========================================================

  @Post(':id/satisfaction')
  submitSatisfaction(
    @Param('id') id: string,
    @Body() submitSatisfactionDto: SubmitSatisfactionDto,
  ) {
    return this.ticketsService.submitSatisfaction(
      id,
      submitSatisfactionDto,
    );
  }

  // =========================================================
  // GET ALL TICKETS
  // =========================================================

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

  // =========================================================
  // TRACK TICKET
  // =========================================================

  @Get('track')
  track(
    @Query('ticketNumber') ticketNumber: string,
    @Query('requesterEmail') requesterEmail: string,
  ) {
    return this.ticketsService.track(
      ticketNumber,
      requesterEmail,
    );
  }

  // =========================================================
  // MESSAGE / CONVERSATION
  // =========================================================

  // PENTING:
  // Route static seperti conversations/inbox dan unread/count
  // harus diletakkan sebelum @Get(':id')

  @UseGuards(JwtAuthGuard)
  @Get('conversations/inbox')
  getInbox(@Request() req: any) {
    return this.ticketsService.getTicketsWithMessages(
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('unread/count')
  getUnreadCount(@Request() req: any) {
    return this.ticketsService.getUnreadCount(
      req.user,
    );
  }
  
  @Get('feedback/list')
  getFeedbackList() {
    return this.ticketsService.getFeedbackList();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/conversation')
  getConversation(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.ticketsService.getTicketConversation(
      id,
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() createMessageDto: CreateTicketMessageDto,
    @Request() req: any,
  ) {
    return this.ticketsService.sendMessage(
      {
        ...createMessageDto,
        ticketId: id,
      },
      req.user,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/messages/read')
  markMessagesAsRead(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.ticketsService.markMessagesAsRead(
      id,
      req.user,
    );
  }

  // =========================================================
  // SLA
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Get(':id/sla')
  getSla(@Param('id') id: string) {
    return this.ticketsService.getSla(id);
  }

  // =========================================================
  // ATTACHMENT CRUD
  // =========================================================

  // CREATE ATTACHMENT
  @UseGuards(JwtAuthGuard)
  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  createAttachment(
    @Param('id') id: string,
    @UploadedFile() file?: any,
  ) {
    return this.ticketsService.createAttachment(
      id,
      file,
    );
  }

  // READ ATTACHMENTS
  @UseGuards(JwtAuthGuard)
  @Get(':id/attachments')
  getAttachments(@Param('id') id: string) {
    return this.ticketsService.getAttachments(id);
  }

  // UPDATE ATTACHMENT
  @UseGuards(JwtAuthGuard)
  @Patch(':id/attachments/:attachmentId')
  @UseInterceptors(FileInterceptor('file'))
  updateAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
    @UploadedFile() file?: any,
  ) {
    return this.ticketsService.updateAttachment(
      id,
      attachmentId,
      file,
    );
  }

  // DELETE ATTACHMENT
  @UseGuards(JwtAuthGuard)
  @Delete(':id/attachments/:attachmentId')
  deleteAttachment(
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.ticketsService.deleteAttachment(
      id,
      attachmentId,
    );
  }

  // =========================================================
  // GET ONE TICKET
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  // =========================================================
  // UPDATE
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(
      id,
      updateTicketDto,
    );
  }

  // =========================================================
  // ASSIGN
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() assignTicketDto: AssignTicketDto,
  ) {
    return this.ticketsService.assign(
      id,
      assignTicketDto,
    );
  }

  // =========================================================
  // ESCALATE
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Post(':id/escalate')
  escalate(
    @Param('id') id: string,
    @Body() escalateTicketDto: EscalateTicketDto,
  ) {
    return this.ticketsService.escalate(
      id,
      escalateTicketDto,
    );
  }

  // =========================================================
  // RESOLVE
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Post(':id/resolve')
  resolve(
    @Param('id') id: string,
    @Body() resolveTicketDto: ResolveTicketDto,
  ) {
    return this.ticketsService.resolve(
      id,
      resolveTicketDto,
    );
  }

  // =========================================================
  // REOPEN
  // =========================================================

  @Post(':id/reopen')
  reopen(
    @Param('id') id: string,
    @Body() reopenTicketDto: ReopenTicketDto,
  ) {
    return this.ticketsService.reopen(
      id,
      reopenTicketDto,
    );
  }

  // =========================================================
  // COMMENTS / ACTIVITY
  // =========================================================

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.ticketsService.addComment(
      id,
      createCommentDto,
    );
  }

  // =========================================================
  // DELETE
  // =========================================================

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(id);
  }
}