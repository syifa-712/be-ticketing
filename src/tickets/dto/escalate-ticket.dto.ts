import { IsInt, IsString, Min, Max } from 'class-validator';

export class EscalateTicketDto {
  @IsString()
  reason!: string;

  @IsInt()
  @Min(1)
  @Max(3)
  target_tier!: number;
}