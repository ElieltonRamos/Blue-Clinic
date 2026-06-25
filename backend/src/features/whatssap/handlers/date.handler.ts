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

const MONTHS_PT: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  março: 3,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

const WEEKDAYS_PT: Record<string, number> = {
  domingo: 0,
  'segunda-feira': 1,
  segunda: 1,
  'terça-feira': 2,
  terça: 2,
  terca: 2,
  'quarta-feira': 3,
  quarta: 3,
  'quinta-feira': 4,
  quinta: 4,
  'sexta-feira': 5,
  sexta: 5,
  sábado: 6,
  sabado: 6,
};

type ParsedDateResult =
  | { type: 'ok'; date: Date }
  | { type: 'ambiguous_year'; day: number; month: number }
  | { type: 'invalid' };

function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos
}

function parseFlexibleDate(text: string, today: Date): ParsedDateResult {
  const normalized = normalizeText(text);
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  // 1. Expressões relativas: hoje, amanhã
  if (normalized === 'hoje') {
    return { type: 'ok', date: new Date(todayMidnight) };
  }
  if (normalized === 'amanha') {
    const d = new Date(todayMidnight);
    d.setDate(d.getDate() + 1);
    return { type: 'ok', date: d };
  }

  // 2. Dia da semana (com ou sem "próxima"/"próximo")
  const weekdayMatch = normalized.match(
    /^(?:pr[oó]xim[ao]\s+)?(domingo|segunda(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sabado)$/,
  );
  if (weekdayMatch) {
    const targetDow = WEEKDAYS_PT[weekdayMatch[1]];
    if (targetDow !== undefined) {
      const d = new Date(todayMidnight);
      const currentDow = d.getDay();
      let diff = targetDow - currentDow;
      // Sempre a próxima ocorrência futura, nunca hoje
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return { type: 'ok', date: d };
    }
  }

  // 3. Numérico com separador / ou -, ano opcional (2 ou 4 dígitos)
  const numericMatch = normalized.match(
    /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?$/,
  );
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10);
    const yearRaw = numericMatch[3];

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { type: 'invalid' };
    }

    if (!yearRaw) {
      return resolveYearless(day, month, todayMidnight);
    }

    const year =
      yearRaw.length === 2
        ? 2000 + parseInt(yearRaw, 10)
        : parseInt(yearRaw, 10);
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day) {
      return { type: 'invalid' }; // ex: 31/02
    }
    return { type: 'ok', date };
  }

  // 4. "16 de junho" (com ano opcional: "16 de junho de 2026")
  const extensoMatch = normalized.match(
    /^(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?$/,
  );
  if (extensoMatch) {
    const day = parseInt(extensoMatch[1], 10);
    const monthName = extensoMatch[2];
    const yearRaw = extensoMatch[3];
    const month = MONTHS_PT[monthName];

    if (!month || day < 1 || day > 31) {
      return { type: 'invalid' };
    }

    if (!yearRaw) {
      return resolveYearless(day, month, todayMidnight);
    }

    const year = parseInt(yearRaw, 10);
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day) {
      return { type: 'invalid' };
    }
    return { type: 'ok', date };
  }

  return { type: 'invalid' };
}

function resolveYearless(
  day: number,
  month: number,
  todayMidnight: Date,
): ParsedDateResult {
  const currentYear = todayMidnight.getFullYear();
  const candidate = new Date(currentYear, month - 1, day);

  if (candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
    return { type: 'invalid' };
  }

  if (candidate < todayMidnight) {
    return { type: 'ambiguous_year', day, month };
  }

  return { type: 'ok', date: candidate };
}

async function tryParseAndConfirm(
  text: string,
  data: BotData,
  conversationId: number,
  sendFn: SendFn,
  updateConversation: (
    id: number,
    step: BotStep,
    data: BotData,
  ) => Promise<void>,
): Promise<boolean> {
  const today = new Date();
  const parsed = parseFlexibleDate(text, today);

  if (parsed.type === 'invalid') {
    return false;
  }

  if (parsed.type === 'ambiguous_year') {
    await sendFn(
      `Essa data (${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}) já passou este ano. Informe o ano também, por exemplo: *${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/2027*`,
    );
    await updateConversation(conversationId, 'SELECT_DATE', {
      ...data,
      _awaitingManualDate: true,
    });
    return true;
  }

  const date = parsed.date;
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  if (date < todayMidnight) {
    await sendFn('Data inválida. Informe uma data futura.');
    await updateConversation(conversationId, 'SELECT_DATE', {
      ...data,
      _awaitingManualDate: true,
    });
    return true;
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dayOfWeek = date.getDay();
  const dateStr = `${y}-${m}-${d}`;

  await sendFn(
    `Entendi: *${DAYS_PT[dayOfWeek]}, ${d}/${m}/${y}*. Confirma? (sim/não)`,
  );
  await updateConversation(conversationId, 'SELECT_DATE', {
    ...data,
    _awaitingManualDate: false,
    _pendingConfirmDate: dateStr,
  });
  return true;
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
  const suggestedDates: string[] = data._suggestedDates ?? [];
  const pendingDate: string | undefined = data._pendingConfirmDate;

  // Aguardando confirmação (sim/não) de uma data já parseada
  if (pendingDate) {
    const normalized = normalizeText(text);
    const isYes = ['sim', 's', 'confirmar', 'confirmo', 'ok'].includes(
      normalized,
    );
    const isNo = ['nao', 'n', 'errado', 'corrigir'].includes(normalized);

    if (isYes) {
      const dayOfWeek = new Date(`${pendingDate}T00:00:00`).getDay();

      const schedule = await prisma.client.doctorSchedule.findUnique({
        where: { doctorId_dayOfWeek: { doctorId: data.doctorId!, dayOfWeek } },
      });

      if (!schedule || !schedule.active) {
        await sendFn(
          `O médico não atende na ${DAYS_PT[dayOfWeek]}. Por favor, informe outra data.`,
        );
        await updateConversation(conversationId, 'SELECT_DATE', {
          ...data,
          _pendingConfirmDate: undefined,
          _awaitingManualDate: true,
        });
        return;
      }

      const slots = await getAvailableSlots(
        data.doctorId ?? 0,
        pendingDate,
        data.appointmentTypeId ?? 0,
        companyId,
        prisma,
      );

      if (!slots.length) {
        await sendFn(
          'Não há horários disponíveis nesta data. Por favor, informe outra data.',
        );
        await updateConversation(conversationId, 'SELECT_DATE', {
          ...data,
          _pendingConfirmDate: undefined,
          _awaitingManualDate: true,
        });
        return;
      }

      await updateConversation(conversationId, 'SELECT_SLOT', {
        ...data,
        date: pendingDate,
      });
      return askSlot(
        data.doctorId ?? 0,
        pendingDate,
        data.appointmentTypeId ?? 0,
        companyId,
        sendFn,
      );
    }

    if (isNo) {
      await sendFn(
        'Sem problemas. Informe a data novamente:\n\n_Ex: 16/06, 16 de junho, próxima segunda_',
      );
      await updateConversation(conversationId, 'SELECT_DATE', {
        ...data,
        _pendingConfirmDate: undefined,
        _awaitingManualDate: true,
      });
      return;
    }

    await sendFn(
      'Não entendi. Responda *sim* para confirmar ou *não* para informar outra data.',
    );
    return;
  }

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

  // Tentativa de digitar data manualmente (já pediu via opção 4)
  if (data._awaitingManualDate) {
    const handled = await tryParseAndConfirm(
      text,
      data,
      conversationId,
      sendFn,
      updateConversation,
    );
    if (!handled) {
      await sendFn(
        'Não entendi a data. Você pode digitar, por exemplo:\n\n*16/06/2026*, *16-06*, *16 de junho* ou *próxima segunda*',
      );
    }
    return;
  }

  // Texto livre direto, sem ter passado pela opção 4 — tenta parsear também
  const handled = await tryParseAndConfirm(
    text,
    data,
    conversationId,
    sendFn,
    updateConversation,
  );
  if (handled) return;

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
