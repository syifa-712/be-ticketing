import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class TrackTicketDto {
  @IsString()
  @IsNotEmpty()
  ticketNumber!: string;

  @IsEmail()
  requesterEmail!: string;
}