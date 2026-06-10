import { PrismaService } from '../../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from '../entities/bot-state.types.js';

export const MENU_TEXT =
  '1️⃣ Agendar consulta\n2️⃣ Cancelar consulta\n3️⃣ Ver próxima consulta\n4️⃣ Falar com atendente';

export async function handleMenu(
  text: string,
  data: BotData,
  conversationId: number,
  companyId: number,
  phone: string,
  sendFn: SendFn,
  prisma: PrismaService,
  updateConversation: (
    id: number,
    step: BotStep,
    data: BotData,
  ) => Promise<void>,
  askSpecialty: (companyId: number, sendFn: SendFn) => Promise<void>,
  showNextAppointment: (
    conversationId: number,
    companyId: number,
    phone: string,
    sendFn: SendFn,
  ) => Promise<void>,
  showCancelAppointment: (
    conversationId: number,
    companyId: number,
    phone: string,
    sendFn: SendFn,
  ) => Promise<void>,
): Promise<void> {
  const option = text.trim();

  if (!['1', '2', '3', '4'].includes(option)) {
    const company = await prisma.client.company.findUnique({
      where: { id: companyId },
      select: { tradeName: true },
    });

    await sendFn(
      `Olá! 👋 Bem-vindo à *${company?.tradeName ?? 'nossa clínica'}*.\n\nComo posso ajudar?\n\n${MENU_TEXT}`,
    );
    await updateConversation(conversationId, 'MENU', { phone });
    return;
  }

  if (option === '4') {
    await prisma.client.conversation.update({
      where: { id: conversationId },
      data: { status: 'waiting', botStep: 'IDLE', botData: {} },
    });
    await sendFn('Aguarde, em breve um atendente irá te responder. 😊');
    return;
  }

  if (option === '3') {
    return showNextAppointment(conversationId, companyId, phone, sendFn);
  }

  if (option === '2') {
    return showCancelAppointment(conversationId, companyId, phone, sendFn);
  }

  const patient = await prisma.client.patient.findFirst({
    where: { companyId, phone: { contains: phone.slice(-8) } },
  });

  if (!patient) {
    await sendFn(
      'Para agendar, preciso de alguns dados.\n\nQual é o seu *nome completo*?',
    );
    await updateConversation(conversationId, 'REGISTER_NAME', { phone });
    return;
  }

  await updateConversation(conversationId, 'SELECT_SPECIALTY', {
    patientId: patient.id,
    phone,
  });
  return askSpecialty(companyId, sendFn);
}
