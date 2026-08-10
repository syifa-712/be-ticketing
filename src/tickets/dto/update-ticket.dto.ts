import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { CreateTicketDto } from './create-ticket.dto';
import { Status } from '@prisma/client';

export class UpdateTicketDto extends PartialType(CreateTicketDto) {
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsInt()
  @Min(1)
  tier?: number;

  @IsOptional()
  @IsString()
  escalationReason?: string;

  @IsOptional()
  @IsString()
  resolutionNote?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
