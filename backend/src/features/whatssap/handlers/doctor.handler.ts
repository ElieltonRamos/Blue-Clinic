/* eslint-disable @typescript-eslint/no-unsafe-call */
import { PrismaService } from '../../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from '../entities/bot-state.types.js';

export async function askDoctor(
  companyId: number,
  specialty: string,
  sendFn: SendFn,
  prisma: PrismaService,
): Promise<void> {
  const doctors = await prisma.client.doctor.findMany({
    where: { companyId, specialty, active: true },
  });

  if (!doctors.length) {
    await sendFn('Nenhum médico disponível para esta especialidade.');
    return;
  }

  const list = doctors.map((d, i) => `${i + 1}️⃣ ${d.name}`).join('\n');
  await sendFn(`Escolha o médico:\n\n${list}`);
}

export async function handleSelectDoctor(
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
): Promise<void> {
  const doctors = await prisma.client.doctor.findMany({
    where: { companyId, specialty: data.specialty ?? '', active: true },
  });

  const idx = parseInt(text) - 1;
  if (isNaN(idx) || idx < 0 || idx >= doctors.length) {
    await sendFn('Opção inválida. Digite o número do médico.');
    return askDoctor(companyId, data.specialty ?? '', sendFn, prisma);
  }

  const doctor = doctors[idx];
  await updateConversation(conversationId, 'SELECT_DATE', {
    ...data,
    doctorId: doctor.id,
    doctorName: doctor.name,
  });
  await sendFn(
    'Informe a data desejada no formato *DD/MM/AAAA*:\n\n_Ex: 15/07/2026_',
  );
}
