import { PrismaService } from '../../core/database/prisma.service';

export function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export function generateSlots(
  start: string,
  end: string,
  duration: number,
): { startTime: string; endTime: string }[] {
  const slots: { startTime: string; endTime: string }[] = [];
  let current = timeToMin(start);
  const endMin = timeToMin(end);
  while (current + duration <= endMin) {
    slots.push({
      startTime: minToTime(current),
      endTime: minToTime(current + duration),
    });
    current += duration;
  }
  return slots;
}

export async function hasEligibleRetorno(
  prisma: PrismaService,
  patientId: number,
  doctorId?: number,
): Promise<boolean> {
  const candidates = await prisma.client.appointment.findMany({
    where: {
      patientId,
      status: 'finished',
      ...(doctorId !== undefined && { doctorId }),
      generatedRetornos: {
        none: { status: { not: 'cancelled' } },
      },
    },
    include: {
      appointmentType: {
        include: { commissions: true },
      },
    },
    orderBy: { date: 'desc' },
  });

  const today = new Date();

  for (const appointment of candidates) {
    const commission = appointment.appointmentType?.commissions.find(
      (c) => c.doctorId === appointment.doctorId,
    );
    if (!commission || !commission.generatesRetorno) continue;

    if (commission.retornoValidityDays != null) {
      const limit = new Date(appointment.date);
      limit.setDate(limit.getDate() + commission.retornoValidityDays);
      if (limit < today) continue;
    }

    return true;
  }

  return false;
}
