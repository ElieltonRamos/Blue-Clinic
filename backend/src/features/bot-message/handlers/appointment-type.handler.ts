import { PrismaService } from '../../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from '../entities/bot-state.types.js';

export async function askAppointmentType(
  companyId: number,
  sendFn: SendFn,
  prisma: PrismaService,
): Promise<void> {
  const types = await prisma.client.appointmentType.findMany({
    where: { companyId, active: true },
  });

  if (!types.length) {
    await sendFn('Nenhum tipo de consulta disponível.');
    return;
  }

  const list = types
    .map((t, i) => `${i + 1}️⃣ ${t.name} (${t.duration} min)`)
    .join('\n');
  await sendFn(`Escolha o tipo de consulta:\n\n${list}`);
}

export async function handleSelectAppointmentType(
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
  askDoctor: (
    companyId: number,
    specialty: string,
    sendFn: SendFn,
    appointmentTypeId: number,
  ) => Promise<void>,
): Promise<void> {
  const types = await prisma.client.appointmentType.findMany({
    where: { companyId, active: true },
  });

  const idx = parseInt(text) - 1;
  if (isNaN(idx) || idx < 0 || idx >= types.length) {
    await sendFn('Opção inválida. Digite o número do tipo de consulta.');
    return askAppointmentType(companyId, sendFn, prisma);
  }

  const type = types[idx];
  await updateConversation(conversationId, 'SELECT_DOCTOR', {
    ...data,
    appointmentTypeId: type.id,
    appointmentTypeName: type.name,
    appointmentTypeDuration: type.duration,
  });
  return askDoctor(companyId, data.specialty ?? '', sendFn, type.id);
}
