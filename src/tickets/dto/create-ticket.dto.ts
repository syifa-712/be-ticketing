import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
} from 'class-validator';

import {
  Category,
  Priority,
  Source,
} from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsEnum(Category)
  category!: Category;

  @IsEnum(Priority)
  priority!: Priority;

  @IsString()
  @IsNotEmpty()
  requesterName!: string;

  @IsEmail()
  requesterEmail!: string;

  @IsEnum(Source)
  source!: Source;
}