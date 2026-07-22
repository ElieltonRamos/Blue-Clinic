/**
 * Cópia manual dos templates aprovados na Meta, usada pelo provider Baileys
 * para renderizar texto puro (Baileys não suporta templates oficiais).
 *
 * Ao aprovar um novo template na Meta, adicionar aqui também.
 */

interface TemplateParameter {
  type: string;
  parameter_name?: string;
  text?: string;
}

interface TemplateComponentInput {
  type: string;
  parameters?: TemplateParameter[];
}

export const BAILEYS_TEMPLATES = [
  {
    name: 'resumo_agenda_medico',
    status: 'APPROVED',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Resumo de Agenda',
      },
      {
        type: 'BODY',
        text: 'Olá Dr(a). {{nome_medico}}, bom dia! Este é o resumo automático da sua agenda de amanhã, {{data_agenda}}. Você possui {{qtd_atendimentos}} atendimento(s) confirmado(s) para amanhã:\n\n{{lista_atendimentos}}.\n\nPor favor, revise os horários com antecedência. Qualquer dúvida, fale com a recepção da clínica.',
        example: {
          body_text_named_params: [
            { param_name: 'nome_medico', example: 'João Pereira' },
            { param_name: 'data_agenda', example: '10/07/2026' },
            { param_name: 'qtd_atendimentos', example: '2' },
            {
              param_name: 'lista_atendimentos',
              example:
                '09:00 - Maria Silva | 09:30 - Pedro Costa | 10:15 - Ana Souza',
            },
          ],
        },
      },
    ],
    id: '1618740263115821',
  },
  {
    name: 'lembrete_consulta',
    status: 'APPROVED',
    components: [
      {
        type: 'BODY',
        text: 'Olá, {{1}}! 👋\n\nLembramos que você tem uma consulta amanhã:\n\n👨‍⚕️ *Médico:* {{2}}\n📅 *Data:* {{3}}\n🕐 *Horário:* {{4}}\n\nDigite *1* para confirmar ou *2* para cancelar.',
        example: {
          body_text: [['BlueClinic', 'Dr Joao', '16/09/2026', '15h30min']],
        },
      },
      {
        type: 'BUTTONS',
        buttons: [{ type: 'QUICK_REPLY', text: 'Confirmar' }],
      },
    ],
    id: '1475580931271094',
  },
  {
    name: 'hello_world',
    status: 'APPROVED',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Hello World',
      },
      {
        type: 'BODY',
        text: 'Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.',
      },
      {
        type: 'FOOTER',
        text: 'WhatsApp Business Platform sample message',
      },
    ],
    id: '1001345012850777',
  },
];

/**
 * Renderiza o texto de um template pra envio via Baileys, substituindo os
 * placeholders ({{nome_var}} ou {{1}}, {{2}}...) pelos valores recebidos em
 * `components` (mesmo payload usado no envio via API oficial).
 */
export function renderBaileysTemplateText(
  templateName: string,
  components: TemplateComponentInput[],
): string {
  const template = BAILEYS_TEMPLATES.find((t) => t.name === templateName);
  if (!template) {
    throw new Error(
      `Template "${templateName}" não está mapeado para envio via Baileys`,
    );
  }

  const header = template.components.find((c) => c.type === 'HEADER');
  const body = template.components.find((c) => c.type === 'BODY');
  const footer = template.components.find((c) => c.type === 'FOOTER');

  if (!body?.text) {
    throw new Error(`Template "${templateName}" não possui corpo (BODY)`);
  }

  const inputBody = components.find((c) => c.type === 'body');
  const parameters = inputBody?.parameters ?? [];

  let text = body.text;
  parameters.forEach((param, idx) => {
    const value = param.text ?? '';
    const key = param.parameter_name ?? String(idx + 1);
    text = text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), value);
  });

  const parts: string[] = [];
  if (header?.text) parts.push(`*${header.text}*`);
  parts.push(text);
  if (footer?.text) parts.push(`_${footer.text}_`);

  return parts.join('\n\n');
}
