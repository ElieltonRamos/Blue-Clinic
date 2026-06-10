/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { PrismaService } from '../../../core/database/prisma.service.js';
import { BotData, BotStep, SendFn } from '../entities/bot-state.types.js';
import { getAvailableSlots } from './slot.handler.js';

const DAYS_PT = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
];
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function parseDateInput(
  text: string,
): { d: string; m: string; y: string } | null {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return { d: match[1], m: match[2], y: match[3] };
}

async function getNextAvailableDates(
  doctorId: number,
  appointmentTypeId: number,
  companyId: number,
  prisma: PrismaService,
  limit = 3,
): Promise<{ dateStr: string; label: string; scheduleLabel: string }[]> {
  const results: { dateStr: string; label: string; scheduleLabel: string }[] =
    [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  cursor.setDate(cursor.getDate() + 1);

  let attempts = 0;
  while (results.length < limit && attempts < 60) {
    attempts++;
    const dayOfWeek = cursor.getDay();
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    const schedule = await prisma.client.doctorSchedule.findUnique({
      where: { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
    });

    if (schedule?.active) {
      const slots = await getAvailableSlots(
        doctorId,
        dateStr,
        appointmentTypeId,
        companyId,
        prisma,
      );
      if (slots.length > 0) {
        const dayName = `${DAYS_SHORT[dayOfWeek]}, ${d}/${m}/${y}`;
        results.push({
          dateStr,
          label: dayName,
          scheduleLabel: `${schedule.startTime}–${schedule.endTime}`,
        });
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return results;
}

export async function askDate(
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
  const dates = await getNextAvailableDates(
    data.doctorId ?? 0,
    data.appointmentTypeId ?? 0,
    companyId,
    prisma,
  );

  if (!dates.length) {
    await sendFn(
      'Não há datas disponíveis nos próximos 60 dias para este médico.',
    );
    return;
  }

  const list = dates
    .map((d, i) => `${i + 1}️⃣ ${d.label} · ${d.scheduleLabel}`)
    .join('\n');
  await sendFn(`Escolha uma data:\n\n${list}\n4️⃣ Digitar outra data`);
  await updateConversation(conversationId, 'SELECT_DATE', {
    ...data,
    _suggestedDates: dates.map((d) => d.dateStr),
  });
}

export async function handleSelectDate(
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
  askSlot: (
    doctorId: number,
    date: string,
    appointmentTypeId: number,
    companyId: number,
    sendFn: SendFn,
  ) => Promise<void>,
): Promise<void> {
  const suggestedDates: string[] = (data as any)._suggestedDates ?? [];

  // Opções numeradas 1-3
  const optionIdx = parseInt(text) - 1;
  if (
    !isNaN(optionIdx) &&
    optionIdx >= 0 &&
    optionIdx < suggestedDates.length
  ) {
    const dateStr = suggestedDates[optionIdx];
    await updateConversation(conversationId, 'SELECT_SLOT', {
      ...data,
      date: dateStr,
    });
    return askSlot(
      data.doctorId ?? 0,
      dateStr,
      data.appointmentTypeId ?? 0,
      companyId,
      sendFn,
    );
  }

  // Opção 4 — digitar outra data (primeira vez, pede o input)
  if (text === '4') {
    await sendFn('Informe a data no formato *DD/MM/AAAA*:\n\n_Ex: 15/07/2026_');
    await updateConversation(conversationId, 'SELECT_DATE', {
      ...data,
      _awaitingManualDate: true,
    });
    return;
  }

  // Tentativa de digitar data manualmente
  if ((data as any)._awaitingManualDate) {
    const parsed = parseDateInput(text);
    if (!parsed) {
      await sendFn('Formato inválido. Use *DD/MM/AAAA*. Ex: 15/07/2026');
      return;
    }

    const { d, m, y } = parsed;
    const date = new Date(+y, +m - 1, +d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      await sendFn('Data inválida. Informe uma data futura.');
      return;
    }

    const dayOfWeek = date.getDay();
    const dateStr = `${y}-${m}-${d}`;

    const schedule = await prisma.client.doctorSchedule.findUnique({
      where: { doctorId_dayOfWeek: { doctorId: data.doctorId!, dayOfWeek } },
    });

    if (!schedule || !schedule.active) {
      await sendFn(
        `O médico não atende na ${DAYS_PT[dayOfWeek]}. Por favor, informe outra data.`,
      );
      return;
    }

    const slots = await getAvailableSlots(
      data.doctorId ?? 0,
      dateStr,
      data.appointmentTypeId ?? 0,
      companyId,
      prisma,
    );

    if (!slots.length) {
      await sendFn(
        'Não há horários disponíveis nesta data. Informe outra data.',
      );
      return;
    }

    await updateConversation(conversationId, 'SELECT_SLOT', {
      ...data,
      date: dateStr,
    });
    return askSlot(
      data.doctorId ?? 0,
      dateStr,
      data.appointmentTypeId ?? 0,
      companyId,
      sendFn,
    );
  }

  // Fallback — reexibe as sugestões
  return askDate(
    data,
    conversationId,
    companyId,
    sendFn,
    prisma,
    updateConversation,
  );
}
