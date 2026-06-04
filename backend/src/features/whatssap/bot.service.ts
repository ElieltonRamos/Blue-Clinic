import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service.js';
import { BotStep, BotData } from './entities/bot-state.types.js';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(
    conversationId: number,
    companyId: number,
    phone: string,
    text: string,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const conversation = await this.prisma.client.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) return;

    const step = (conversation.botStep ?? 'MENU') as BotStep;
    const data = (conversation.botData ?? {}) as BotData;

    await this.dispatch(
      step,
      data,
      text.trim(),
      conversationId,
      companyId,
      phone,
      sendFn,
    );
  }

  private async dispatch(
    step: BotStep,
    data: BotData,
    text: string,
    conversationId: number,
    companyId: number,
    phone: string,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    switch (step) {
      case 'MENU':
      case 'IDLE':
        return this.handleMenu(
          text,
          data,
          conversationId,
          companyId,
          phone,
          sendFn,
        );
      case 'REGISTER_NAME':
        return this.handleRegisterName(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
        );
      case 'REGISTER_CPF':
        return this.handleRegisterCpf(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
        );
      case 'SELECT_SPECIALTY':
        return this.handleSelectSpecialty(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
        );
      case 'SELECT_APPOINTMENT_TYPE':
        return this.handleSelectAppointmentType(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
        );
      case 'SELECT_DOCTOR':
        return this.handleSelectDoctor(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
        );
      case 'SELECT_DATE':
        return this.handleSelectDate(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
        );
      case 'SELECT_SLOT':
        return this.handleSelectSlot(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
        );
      case 'CONFIRM_APPOINTMENT':
        return this.handleConfirmAppointment(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
        );
      case 'CANCEL_CONFIRM':
        return this.handleCancelConfirm(
          text,
          data,
          conversationId,
          companyId,
          sendFn,
        );
    }
  }

  // ── MENU ──────────────────────────────────────────────────────────────────

  private async handleMenu(
    text: string,
    data: BotData,
    conversationId: number,
    companyId: number,
    phone: string,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const option = text.trim();

    if (!['1', '2', '3', '4'].includes(option)) {
      await sendFn(
        `Olá! 👋 Bem-vindo à nossa clínica.\n\nComo posso ajudar?\n\n1️⃣ Agendar consulta\n2️⃣ Cancelar consulta\n3️⃣ Ver próxima consulta\n4️⃣ Falar com atendente`,
      );
      await this.updateConversation(conversationId, 'MENU', {});
      return;
    }

    if (option === '4') {
      await this.prisma.client.conversation.update({
        where: { id: conversationId },
        data: { status: 'waiting', botStep: 'IDLE', botData: {} },
      });
      await sendFn('Aguarde, em breve um atendente irá te responder. 😊');
      return;
    }

    if (option === '3') {
      return this.showNextAppointment(conversationId, companyId, phone, sendFn);
    }

    if (option === '2') {
      return this.showCancelAppointment(
        conversationId,
        companyId,
        phone,
        sendFn,
      );
    }

    // opção 1 — agendar
    const patient = await this.prisma.client.patient.findFirst({
      where: { companyId, phone: { contains: phone.slice(-8) } },
    });

    if (!patient) {
      await sendFn(
        'Para agendar, preciso de alguns dados.\n\nQual é o seu *nome completo*?',
      );
      await this.updateConversation(conversationId, 'REGISTER_NAME', {});
      return;
    }

    await this.updateConversation(conversationId, 'SELECT_SPECIALTY', {
      patientId: patient.id,
    });
    return this.askSpecialty(companyId, sendFn);
  }

  // ── REGISTER ──────────────────────────────────────────────────────────────

  private async handleRegisterName(
    text: string,
    data: BotData,
    conversationId: number,
    companyId: number,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    if (text.length < 3) {
      await sendFn('Por favor, informe seu nome completo.');
      return;
    }
    await sendFn('Agora informe seu *CPF* (somente números):');
    await this.updateConversation(conversationId, 'REGISTER_CPF', {
      ...data,
      name: text,
    });
  }

  private async handleRegisterCpf(
    text: string,
    data: BotData,
    conversationId: number,
    companyId: number,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const cpf = text.replace(/\D/g, '');
    if (cpf.length !== 11) {
      await sendFn('CPF inválido. Informe somente os 11 números do CPF.');
      return;
    }

    const existing = await this.prisma.client.patient.findFirst({
      where: { companyId, cpf },
    });

    let patient = existing;

    if (!patient) {
      patient = await this.prisma.client.patient.create({
        data: {
          companyId,
          name: data.name!,
          cpf,
          status: 'Ativo',
          whatsappActive: true,
        },
      });
    }

    await this.prisma.client.conversation.update({
      where: { id: conversationId },
      data: { patientId: patient.id },
    });

    await this.updateConversation(conversationId, 'SELECT_SPECIALTY', {
      patientId: patient.id,
    });
    await sendFn(`Cadastro realizado! ✅\n\nOlá, *${patient.name}*!`);
    return this.askSpecialty(companyId, sendFn);
  }

  // ── SPECIALTY ─────────────────────────────────────────────────────────────

  private async askSpecialty(
    companyId: number,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const doctors = await this.prisma.client.doctor.findMany({
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

  private async handleSelectSpecialty(
    text: string,
    data: BotData,
    conversationId: number,
    companyId: number,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const doctors = await this.prisma.client.doctor.findMany({
      where: { companyId, active: true },
      select: { specialty: true },
      distinct: ['specialty'],
    });

    const idx = parseInt(text) - 1;
    if (isNaN(idx) || idx < 0 || idx >= doctors.length) {
      await sendFn('Opção inválida. Digite o número da especialidade.');
      return this.askSpecialty(companyId, sendFn);
    }

    const specialty = doctors[idx].specialty;
    await this.updateConversation(conversationId, 'SELECT_APPOINTMENT_TYPE', {
      ...data,
      specialty,
    });
    return this.askAppointmentType(companyId, sendFn);
  }

  // ── APPOINTMENT TYPE ──────────────────────────────────────────────────────

  private async askAppointmentType(
    companyId: number,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const types = await this.prisma.client.appointmentType.findMany({
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

  private async handleSelectAppointmentType(
    text: string,
    data: BotData,
    conversationId: number,
    companyId: number,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const types = await this.prisma.client.appointmentType.findMany({
      where: { companyId, active: true },
    });

    const idx = parseInt(text) - 1;
    if (isNaN(idx) || idx < 0 || idx >= types.length) {
      await sendFn('Opção inválida. Digite o número do tipo de consulta.');
      return this.askAppointmentType(companyId, sendFn);
    }

    const type = types[idx];
    await this.updateConversation(conversationId, 'SELECT_DOCTOR', {
      ...data,
      appointmentTypeId: type.id,
      appointmentTypeName: type.name,
      appointmentTypeDuration: type.duration,
    });
    return this.askDoctor(companyId, data.specialty ?? '', sendFn);
  }

  // ── DOCTOR ────────────────────────────────────────────────────────────────

  private async askDoctor(
    companyId: number,
    specialty: string,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const doctors = await this.prisma.client.doctor.findMany({
      where: { companyId, specialty, active: true },
    });

    if (!doctors.length) {
      await sendFn('Nenhum médico disponível para esta especialidade.');
      return;
    }

    const list = doctors.map((d, i) => `${i + 1}️⃣ ${d.name}`).join('\n');
    await sendFn(`Escolha o médico:\n\n${list}`);
  }

  private async handleSelectDoctor(
    text: string,
    data: BotData,
    conversationId: number,
    companyId: number,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const doctors = await this.prisma.client.doctor.findMany({
      where: { companyId, specialty: data.specialty!, active: true },
    });

    const idx = parseInt(text) - 1;
    if (isNaN(idx) || idx < 0 || idx >= doctors.length) {
      await sendFn('Opção inválida. Digite o número do médico.');
      return this.askDoctor(companyId, data.specialty ?? '', sendFn);
    }

    const doctor = doctors[idx];
    await this.updateConversation(conversationId, 'SELECT_DATE', {
      ...data,
      doctorId: doctor.id,
      doctorName: doctor.name,
    });
    await sendFn(
      `Informe a data desejada no formato *DD/MM/AAAA*:\n\n_Ex: 15/07/2026_`,
    );
  }

  // ── DATE ──────────────────────────────────────────────────────────────────

  private async handleSelectDate(
    text: string,
    data: BotData,
    conversationId: number,
    companyId: number,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) {
      await sendFn('Formato inválido. Use *DD/MM/AAAA*. Ex: 15/07/2026');
      return;
    }

    const [, d, m, y] = match;
    const date = new Date(+y, +m - 1, +d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) {
      await sendFn('Data inválida. Informe uma data futura.');
      return;
    }

    const dateStr = `${y}-${m}-${d}`;
    const dayOfWeek = date.getDay();

    const schedule = await this.prisma.client.doctorSchedule.findUnique({
      where: { doctorId_dayOfWeek: { doctorId: data.doctorId!, dayOfWeek } },
    });

    if (!schedule || !schedule.active) {
      const days = [
        'domingo',
        'segunda',
        'terça',
        'quarta',
        'quinta',
        'sexta',
        'sábado',
      ];
      await sendFn(
        `O médico não atende na ${days[dayOfWeek]}. Por favor, informe outra data.`,
      );
      return;
    }

    await this.updateConversation(conversationId, 'SELECT_SLOT', {
      ...data,
      date: dateStr,
    });
    return this.askSlot(
      data.doctorId ?? 0,
      dateStr,
      data.appointmentTypeId ?? 0,
      companyId,
      sendFn,
    );
  }

  // ── SLOT ──────────────────────────────────────────────────────────────────

  private async askSlot(
    doctorId: number,
    date: string,
    appointmentTypeId: number,
    companyId: number,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const slots = await this.getAvailableSlots(
      doctorId,
      date,
      appointmentTypeId,
      companyId,
    );

    if (!slots.length) {
      await sendFn(
        'Nenhum horário disponível para esta data. Informe outra data:',
      );
      return;
    }

    const list = slots
      .map((s, i) => `${i + 1}️⃣ ${s.startTime} – ${s.endTime}`)
      .join('\n');
    await sendFn(`Horários disponíveis:\n\n${list}`);
  }

  private async handleSelectSlot(
    text: string,
    data: BotData,
    conversationId: number,
    companyId: number,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const slots = await this.getAvailableSlots(
      data.doctorId ?? 0,
      data.date ?? '',
      data.appointmentTypeId ?? 0,
      companyId,
    );

    const idx = parseInt(text) - 1;
    if (isNaN(idx) || idx < 0 || idx >= slots.length) {
      await sendFn('Opção inválida. Digite o número do horário.');
      return this.askSlot(
        data.doctorId ?? 0,
        data.date ?? '',
        data.appointmentTypeId ?? 0,
        companyId,
        sendFn,
      );
    }

    const slot = slots[idx];
    const [y, m, d] = data.date!.split('-');
    const dateFormatted = `${d}/${m}/${y}`;

    await this.updateConversation(conversationId, 'CONFIRM_APPOINTMENT', {
      ...data,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });

    await sendFn(
      `Confirme o agendamento:\n\n` +
        `👨‍⚕️ *Médico:* ${data.doctorName}\n` +
        `📋 *Tipo:* ${data.appointmentTypeName}\n` +
        `📅 *Data:* ${dateFormatted}\n` +
        `🕐 *Horário:* ${slot.startTime} – ${slot.endTime}\n\n` +
        `Digite *1* para confirmar ou *2* para cancelar.`,
    );
  }

  // ── CONFIRM ───────────────────────────────────────────────────────────────

  private async handleConfirmAppointment(
    text: string,
    data: BotData,
    conversationId: number,
    companyId: number,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    if (text !== '1' && text !== '2') {
      await sendFn('Digite *1* para confirmar ou *2* para cancelar.');
      return;
    }

    if (text === '2') {
      await this.updateConversation(conversationId, 'MENU', {});
      await sendFn(
        'Agendamento cancelado. Como posso ajudar?\n\n1️⃣ Agendar consulta\n2️⃣ Cancelar consulta\n3️⃣ Ver próxima consulta\n4️⃣ Falar com atendente',
      );
      return;
    }

    const doctor = await this.prisma.client.doctor.findUnique({
      where: { id: data.doctorId! },
      select: { specialty: true },
    });

    const [y, m, d] = data.date!.split('-').map(Number);

    await this.prisma.client.appointment.create({
      data: {
        doctorId: data.doctorId!,
        patientId: data.patientId!,
        appointmentTypeId: data.appointmentTypeId!,
        specialty: doctor!.specialty,
        date: new Date(Date.UTC(y, m - 1, d)),
        startTime: data.startTime!,
        endTime: data.endTime!,
        status: 'pending',
        origin: 'whatsapp',
      },
    });

    await this.updateConversation(conversationId, 'MENU', {});
    await sendFn(
      `✅ Agendamento confirmado!\n\n` +
        `Até lá! Se precisar de mais alguma coisa, é só enviar uma mensagem. 😊`,
    );
  }

  // ── CANCEL ────────────────────────────────────────────────────────────────

  private async showCancelAppointment(
    conversationId: number,
    companyId: number,
    phone: string,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const patient = await this.prisma.client.patient.findFirst({
      where: { companyId, phone: { contains: phone.slice(-8) } },
    });

    if (!patient) {
      await sendFn('Não encontrei nenhum cadastro com este número.');
      await this.updateConversation(conversationId, 'MENU', {});
      return;
    }

    const now = new Date();
    const appointment = await this.prisma.client.appointment.findFirst({
      where: {
        patientId: patient.id,
        date: { gte: now },
        status: { notIn: ['cancelled', 'rescheduled'] },
      },
      include: { doctor: { select: { name: true } } },
      orderBy: { date: 'asc' },
    });

    if (!appointment) {
      await sendFn('Você não possui consultas agendadas.');
      await this.updateConversation(conversationId, 'MENU', {});
      return;
    }

    const date = new Date(appointment.date);
    const d = String(date.getUTCDate()).padStart(2, '0');
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const y = date.getUTCFullYear();

    await this.updateConversation(conversationId, 'CANCEL_CONFIRM', {
      cancelAppointmentId: appointment.id,
    });

    await sendFn(
      `Sua próxima consulta:\n\n` +
        `👨‍⚕️ *Médico:* ${appointment.doctor.name}\n` +
        `📅 *Data:* ${d}/${m}/${y}\n` +
        `🕐 *Horário:* ${appointment.startTime}\n\n` +
        `Deseja cancelar? Digite *1* para confirmar ou *2* para voltar.`,
    );
  }

  private async handleCancelConfirm(
    text: string,
    data: BotData,
    conversationId: number,
    companyId: number,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    if (text !== '1' && text !== '2') {
      await sendFn(
        'Digite *1* para confirmar o cancelamento ou *2* para voltar.',
      );
      return;
    }

    if (text === '2') {
      await this.updateConversation(conversationId, 'MENU', {});
      await sendFn(
        'Ok! Como posso ajudar?\n\n1️⃣ Agendar consulta\n2️⃣ Cancelar consulta\n3️⃣ Ver próxima consulta\n4️⃣ Falar com atendente',
      );
      return;
    }

    await this.prisma.client.appointment.update({
      where: { id: data.cancelAppointmentId! },
      data: {
        status: 'cancelled',
        cancellationReason: 'Cancelado pelo paciente via WhatsApp',
      },
    });

    await this.updateConversation(conversationId, 'MENU', {});
    await sendFn(
      'Consulta cancelada com sucesso. ✅\n\nSe precisar remarcar, é só falar comigo! 😊',
    );
  }

  // ── NEXT APPOINTMENT ──────────────────────────────────────────────────────

  private async showNextAppointment(
    conversationId: number,
    companyId: number,
    phone: string,
    sendFn: (msg: string) => Promise<void>,
  ): Promise<void> {
    const patient = await this.prisma.client.patient.findFirst({
      where: { companyId, phone: { contains: phone.slice(-8) } },
    });

    if (!patient) {
      await sendFn('Não encontrei nenhum cadastro com este número.');
      await this.updateConversation(conversationId, 'MENU', {});
      return;
    }

    const now = new Date();
    const appointment = await this.prisma.client.appointment.findFirst({
      where: {
        patientId: patient.id,
        date: { gte: now },
        status: { notIn: ['cancelled', 'rescheduled'] },
      },
      include: { doctor: { select: { name: true } } },
      orderBy: { date: 'asc' },
    });

    if (!appointment) {
      await sendFn('Você não possui consultas agendadas.');
      await this.updateConversation(conversationId, 'MENU', {});
      return;
    }

    const date = new Date(appointment.date);
    const d = String(date.getUTCDate()).padStart(2, '0');
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const y = date.getUTCFullYear();

    await this.updateConversation(conversationId, 'MENU', {});
    await sendFn(
      `Sua próxima consulta:\n\n` +
        `👨‍⚕️ *Médico:* ${appointment.doctor.name}\n` +
        `📅 *Data:* ${d}/${m}/${y}\n` +
        `🕐 *Horário:* ${appointment.startTime}\n\n` +
        `Se precisar de mais alguma coisa, é só falar! 😊`,
    );
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  private async updateConversation(
    conversationId: number,
    step: BotStep,
    data: BotData,
  ): Promise<void> {
    await this.prisma.client.conversation.update({
      where: { id: conversationId },
      data: { botStep: step, botData: data as Record<string, any> },
    });
  }

  private async getAvailableSlots(
    doctorId: number,
    date: string,
    appointmentTypeId: number,
    companyId: number,
  ): Promise<{ startTime: string; endTime: string }[]> {
    const [y, m, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const dayStart = new Date(Date.UTC(y, m - 1, d));
    const dayEnd = new Date(Date.UTC(y, m - 1, d + 1));

    const [schedule, appointmentType] = await Promise.all([
      this.prisma.client.doctorSchedule.findUnique({
        where: { doctorId_dayOfWeek: { doctorId, dayOfWeek } },
      }),
      this.prisma.client.appointmentType.findUnique({
        where: { id: appointmentTypeId },
      }),
    ]);

    if (!schedule || !schedule.active || !appointmentType) return [];

    const allSlots = this.generateSlots(
      schedule.startTime,
      schedule.endTime,
      appointmentType.duration,
    );

    const [appointments, blockedSlots] = await Promise.all([
      this.prisma.client.appointment.findMany({
        where: {
          doctorId,
          date: { gte: dayStart, lt: dayEnd },
          status: { not: 'cancelled' },
        },
      }),
      this.prisma.client.blockedSlot.findMany({
        where: {
          companyId,
          AND: [
            { OR: [{ doctorId }, { doctorId: null }] },
            { startDate: { lte: dayEnd } },
            { OR: [{ endDate: null }, { endDate: { gte: dayStart } }] },
          ],
        },
      }),
    ]);

    const effectiveBlocks = blockedSlots.filter((b) => {
      if (b.recurrence === 'none' || b.recurrence === 'daily') return true;
      if (b.recurrence === 'weekly')
        return new Date(b.startDate).getUTCDay() === dayOfWeek;
      return false;
    });

    return allSlots.filter((slot) => {
      const sStart = this.timeToMin(slot.startTime);
      const sEnd = this.timeToMin(slot.endTime);

      const booked = appointments.some((a) => {
        const aStart = this.timeToMin(a.startTime);
        const aEnd = this.timeToMin(a.endTime);
        return sStart < aEnd && sEnd > aStart;
      });

      const blocked = effectiveBlocks.some((b) => {
        const bStart = this.timeToMin(b.startTime);
        const bEnd = this.timeToMin(b.endTime);
        return sStart < bEnd && sEnd > bStart;
      });

      return !booked && !blocked;
    });
  }

  private generateSlots(start: string, end: string, duration: number) {
    const slots: { startTime: string; endTime: string }[] = [];
    let current = this.timeToMin(start);
    const endMin = this.timeToMin(end);
    while (current + duration <= endMin) {
      slots.push({
        startTime: this.minToTime(current),
        endTime: this.minToTime(current + duration),
      });
      current += duration;
    }
    return slots;
  }

  private timeToMin(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minToTime(min: number): string {
    return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  }
}
