import { Injectable } from '@nestjs/common';
import { Priority } from '@prisma/client';

type SlaTarget = {
  minutes?: number;
  businessDays?: number;
};

type SlaTicket = {
  priority: Priority;
  createdAt: Date;
};

@Injectable()
export class SlaService {
  private readonly WORK_HOURS_PER_DAY = 8;

  private readonly slaTargets: Record<
    Priority,
    { response: SlaTarget; resolution: SlaTarget }
  > = {
    urgent: {
      response: { minutes: 15 },
      resolution: { minutes: 4 * 60 },
    },
    high: {
      response: { minutes: 60 },
      resolution: { businessDays: 1 },
    },
    medium: {
      response: { minutes: 4 * 60 },
      resolution: { businessDays: 3 },
    },
    low: {
      response: { businessDays: 1 },
      resolution: { businessDays: 5 },
    },
  };

  getSlaInfo(ticket: SlaTicket) {
    const target = this.slaTargets[ticket.priority];

    const targetResponse = this.calculateSlaTarget(
      ticket.createdAt,
      target.response,
    );
    const targetResolution = this.calculateSlaTarget(
      ticket.createdAt,
      target.resolution,
    );

    const now = new Date();

    const status = this.getSlaStatus(
      now,
      targetResponse,
      targetResolution,
      target,
    );

    return {
      target_response: targetResponse,
      target_resolution: targetResolution,
      sisa_waktu: {
        response: this.formatRemaining(
          Math.max(
            0,
            Math.floor((targetResponse.getTime() - now.getTime()) / 60000),
          ),
        ),
        resolution: this.formatRemaining(
          Math.max(
            0,
            Math.floor((targetResolution.getTime() - now.getTime()) / 60000),
          ),
        ),
      },
      status_sla: status,
    };
  }

  isSlaBreached(ticket: SlaTicket): boolean {
    const target = this.slaTargets[ticket.priority];

    const targetResolution = this.calculateSlaTarget(
      ticket.createdAt,
      target.resolution,
    );

    return new Date().getTime() >= targetResolution.getTime();
  }

  private calculateSlaTarget(from: Date, target: SlaTarget): Date {
    if (target.businessDays) {
      return this.addBusinessHours(
        from,
        target.businessDays * this.WORK_HOURS_PER_DAY,
      );
    }

    return new Date(from.getTime() + (target.minutes ?? 0) * 60000);
  }

  private addBusinessHours(from: Date, hours: number): Date {
    const workStart = 9;
    const workEnd = 17;

    const date = new Date(from);

    const moveToNextWorkingDay = () => {
      do {
        date.setDate(date.getDate() + 1);
      } while (date.getDay() === 0 || date.getDay() === 6);

      date.setHours(workStart, 0, 0, 0);
    };

    while (date.getDay() === 0 || date.getDay() === 6) {
      moveToNextWorkingDay();
    }

    let currentMinutes =
      date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

    if (currentMinutes < workStart * 60) {
      date.setHours(workStart, 0, 0, 0);
      currentMinutes = workStart * 60;
    } else if (currentMinutes >= workEnd * 60) {
      moveToNextWorkingDay();
      currentMinutes = workStart * 60;
    }

    let remainingMinutes = hours * 60;

    while (remainingMinutes > 0) {
      const availableToday = workEnd * 60 - currentMinutes;

      if (remainingMinutes <= availableToday) {
        date.setMinutes(date.getMinutes() + remainingMinutes);
        remainingMinutes = 0;
      } else {
        remainingMinutes -= availableToday;
        moveToNextWorkingDay();
        currentMinutes = workStart * 60;
      }
    }

    return date;
  }

  private getSlaStatus(
    now: Date,
    targetResponse: Date,
    targetResolution: Date,
    target: { response: SlaTarget; resolution: SlaTarget },
  ): string {
    if (now.getTime() >= targetResolution.getTime()) {
      return 'terlampaui';
    }

    if (now.getTime() >= targetResponse.getTime()) {
      return 'mendekati batas';
    }

    const totalMinutes =
      (target.resolution.businessDays ?? 0) * this.WORK_HOURS_PER_DAY * 60 +
      (target.resolution.minutes ?? 0);

    const remainingMinutes =
      (targetResolution.getTime() - now.getTime()) / 60000;

    if (remainingMinutes <= totalMinutes * 0.2) {
      return 'mendekati batas';
    }

    return 'aman';
  }

  private formatRemaining(totalMinutes: number) {
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    return { days, hours, minutes };
  }
}
