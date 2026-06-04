/* eslint-disable @typescript-eslint/no-unsafe-call */
import { PrismaService } from '../../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from '../entities/bot-state.types.js';

export async function handleRegisterName(
  text: string,
  data: BotData,
  conversationId: number,
  sendFn: SendFn,
  updateConversation: (
    id: number,
    step: BotStep,
    data: BotData,
  ) => Promise<void>,
): Promise<void> {
  if (text.length < 3) {
    await sendFn('Por favor, informe seu nome completo.');
    return;
  }
  await sendFn('Agora informe seu *CPF* (somente números):');
  await updateConversation(conversationId, 'REGISTER_CPF', {
    ...data,
    name: text,
  });
}

export async function handleRegisterCpf(
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
  askSpecialty: (companyId: number, sendFn: SendFn) => Promise<void>,
): Promise<void> {
  const cpf = text.replace(/\D/g, '');
  if (cpf.length !== 11) {
    await sendFn('CPF inválido. Informe somente os 11 números do CPF.');
    return;
  }

  const existing = await prisma.client.patient.findFirst({
    where: { companyId, cpf },
  });

  let patient = existing;

  if (!patient) {
    patient = await prisma.client.patient.create({
      data: {
        companyId,
        name: data.name!,
        cpf,
        status: 'Ativo',
        whatsappActive: true,
      },
    });
  }

  await prisma.client.conversation.update({
    where: { id: conversationId },
    data: { patientId: patient.id },
  });

  await updateConversation(conversationId, 'SELECT_SPECIALTY', {
    patientId: patient.id,
  });
  await sendFn(`Cadastro realizado! ✅\n\nOlá, *${patient.name}*!`);
  return askSpecialty(companyId, sendFn);
}
