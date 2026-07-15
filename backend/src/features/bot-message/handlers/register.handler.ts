import { PrismaService } from '../../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from '../entities/bot-state.types.js';

const BLACKLIST = [
  'teste',
  'admin',
  'bot',
  'fulano',
  'ninguem',
  'nenhum',
  'anonimo',
  'desconhecido',
  'qualquer',
  'alguem',
  'ningue',
  'porra',
  'merda',
  'caralho',
  'puta',
  'viado',
  'buceta',
  'cu',
  'cuzao',
  'fdp',
  'filhadaputa',
  'filhodaputa',
  'vai tomar',
  'vtnc',
  'vsf',
  'pinto',
  'pau',
  'rola',
  'xota',
  'xoxota',
  'xereca',
  'piroca',
  'vagabunda',
  'vagabundo',
  'prostituta',
  'traveco',
  'bicha',
  'idiota',
  'imbecil',
  'cretino',
  'babaca',
  'otario',
  'otária',
  'lixo',
  'lixao',
  'burro',
  'burra',
  'estupido',
  'estupida',
];

const isValidFullName = (name: string): boolean => {
  const cleaned = name.trim();

  if (cleaned.length < 5 || cleaned.length > 100) return false;
  if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(cleaned)) return false;

  const words = cleaned.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length < 2) return false;

  const lower = cleaned.toLowerCase();
  if (BLACKLIST.some((w) => lower.includes(w))) return false;

  return true;
};

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
  if (!isValidFullName(text)) {
    await sendFn(
      'Por favor, informe seu nome completo e real (ex: João Silva).',
    );
    return;
  }

  await sendFn('Agora informe seu *CPF* (somente números):');
  await updateConversation(conversationId, 'REGISTER_CPF', {
    ...data,
    name: text.trim(),
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

  if (existing) {
    // CPF já cadastrado com outro telefone — não vincula
    if (existing.phone && existing.phone !== data.phone) {
      await sendFn(
        'Este CPF já está cadastrado com outro número de telefone. ' +
          'Entre em contato com a clínica para atualizar seu cadastro.',
      );
      return;
    }

    // Mesmo telefone ou sem telefone cadastrado — vincula normalmente
    await prisma.client.conversation.update({
      where: { id: conversationId },
      data: { patientId: existing.id },
    });

    await updateConversation(conversationId, 'SELECT_SPECIALTY', {
      ...data,
      patientId: existing.id,
    });

    await sendFn(`Bem-vindo de volta, *${existing.name}*! ✅`);
    return askSpecialty(companyId, sendFn);
  }

  // CPF não cadastrado — verifica se o telefone já existe em outro paciente
  const phoneConflict = await prisma.client.patient.findFirst({
    where: { companyId, phone: data.phone },
    select: { id: true },
  });

  if (phoneConflict) {
    await sendFn(
      'Este número já está associado a outro cadastro. ' +
        'Entre em contato com a clínica.',
    );
    return;
  }

  const patient = await prisma.client.patient.create({
    data: {
      companyId,
      name: data.name!,
      cpf,
      phone: data.phone,
      status: 'Ativo',
      whatsappActive: true,
    },
  });

  await prisma.client.conversation.update({
    where: { id: conversationId },
    data: { patientId: patient.id },
  });

  await updateConversation(conversationId, 'SELECT_SPECIALTY', {
    ...data,
    patientId: patient.id,
  });

  await sendFn(`Cadastro realizado! ✅\n\nOlá, *${patient.name}*!`);
  return askSpecialty(companyId, sendFn);
}
