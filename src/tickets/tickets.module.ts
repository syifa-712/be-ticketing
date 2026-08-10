import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SlaModule } from '../sla/sla.module';

@Module({
  imports: [PrismaModule, SlaModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
