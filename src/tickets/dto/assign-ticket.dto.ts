import { IsUUID } from 'class-validator';

export class AssignTicketDto {
  @IsUUID()
  assigned_to!: string;
}