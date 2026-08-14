import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateTicketMessageDto {
  @IsUUID()
  @IsNotEmpty()
  ticketId!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class TicketMessageResponseDto {
  id!: string;
  ticketId!: string;
  senderId!: string;
  senderRole!: 'user' | 'admin' | 'agent';
  senderName!: string;
  senderEmail?: string;
  message!: string;
  isRead!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class TicketConversationResponseDto {
  ticketId!: string;
  ticketSubject!: string;
  ticketStatus!: string;
  canUserReply!: boolean;
  lastMessageAt!: Date;
  unreadCount!: number;
  messages!: TicketMessageResponseDto[];
}