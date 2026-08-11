import { PrismaService } from '../../../core/database/prisma.service.js';
import { hasEligibleRetorno } from '../bot-helpers.js';
import { BotData, BotStep, SendFn } from '../entities/bot-state.types.js';

async function filterEligibleTypes<T extends { isRetorno: boolean }>(
  types: T[],
  prisma: PrismaService,
  patientId: number | undefined,
): Promise<T[]> {
  const eligible: T[] = [];
  for (const type of types) {
    if (!type.isRetorno) {
      eligible.push(type);
      continue;
    }
    if (patientId && (await hasEligibleRetorno(prisma, patientId))) {
      eligible.push(type);
    }
  }
  return eligible;
}

export async function askAppointmentType(
  companyId: number,
  sendFn: SendFn,
  prisma: PrismaService,
  patientId?: number,
): Promise<void> {
  const types = await prisma.client.appointmentType.findMany({
    where: { companyId, active: true },
  });

  const eligibleTypes = await filterEligibleTypes(types, prisma, patientId);

  if (!eligibleTypes.length) {
    await sendFn('Nenhum tipo de consulta disponível.');
    return;
  }

  const list = eligibleTypes
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

  const eligibleTypes = await filterEligibleTypes(
    types,
    prisma,
    data.patientId,
  );

  const idx = parseInt(text) - 1;
  if (isNaN(idx) || idx < 0 || idx >= eligibleTypes.length) {
    await sendFn('Opção inválida. Digite o número do tipo de consulta.');
    return askAppointmentType(companyId, sendFn, prisma, data.patientId);
  }

  const type = eligibleTypes[idx];
  await updateConversation(conversationId, 'SELECT_DOCTOR', {
    ...data,
    appointmentTypeId: type.id,
    appointmentTypeName: type.name,
    appointmentTypeDuration: type.duration,
    appointmentTypeIsRetorno: type.isRetorno,
  });
  return askDoctor(companyId, data.specialty ?? '', sendFn, type.id);
}
