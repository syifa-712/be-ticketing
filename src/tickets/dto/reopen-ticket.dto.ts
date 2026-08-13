import { IsString } from 'class-validator';

export class ReopenTicketDto {
  @IsString()
  reason!: string;
}