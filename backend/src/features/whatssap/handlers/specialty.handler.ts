/* eslint-disable @typescript-eslint/no-unsafe-call */
import { PrismaService } from '../../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from '../entities/bot-state.types.js';

export async function askSpecialty(
  companyId: number,
  sendFn: SendFn,
  prisma: PrismaService,
): Promise<void> {
  const doctors = await prisma.client.doctor.findMany({
    where: { companyId, active: true },
    select: { specialty: true },
    distinct: ['specialty'],
  });

  if (!doctors.length) {
    await sendFn('Nenhuma especialidade disponível no momento.');
    return;
  }

  const list = doctors.map((d, i) => `${i + 1}️⃣ ${d.specialty}`).join('\n');
  await sendFn(`Escolha a especialidade:\n\n${list}`);
}

export async function handleSelectSpecialty(
  text: string,
  data: BotData,
  conversationId: number,
  companyId: number,
  sendFn: SendFn,
  prisma: PrismaService,
  updateConversation: (
    id: number,
    step: BotStep,
    data: BotData,
  ) => Promise<void>,
  askAppointmentType: (companyId: number, sendFn: SendFn) => Promise<void>,
): Promise<void> {
  const doctors = await prisma.client.doctor.findMany({
    where: { companyId, active: true },
    select: { specialty: true },
    distinct: ['specialty'],
  });

  const idx = parseInt(text) - 1;
  if (isNaN(idx) || idx < 0 || idx >= doctors.length) {
    await sendFn('Opção inválida. Digite o número da especialidade.');
    return askSpecialty(companyId, sendFn, prisma);
  }

  const specialty = doctors[idx].specialty;
  await updateConversation(conversationId, 'SELECT_APPOINTMENT_TYPE', {
    ...data,
    specialty,
  });
  return askAppointmentType(companyId, sendFn);
}
