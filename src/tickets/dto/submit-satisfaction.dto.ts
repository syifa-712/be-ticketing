import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SubmitSatisfactionDto {
  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
