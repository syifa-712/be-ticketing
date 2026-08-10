import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SlaModule } from '../sla/sla.module';
import { SlaCheckScheduler } from './sla-check.scheduler';

@Module({
  imports: [PrismaModule, SlaModule],
  providers: [SlaCheckScheduler],
})
export class SchedulerModule {}
