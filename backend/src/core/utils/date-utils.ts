/**
 * Retorna a data atual no fuso horário de Brasília (UTC-3)
 * Use sempre que precisar de new Date() para gravar no banco ou gerar XML fiscal
 */
export function nowBrasilia(): Date {
  const now = new Date();
  const offset = -3 * 60;
  return new Date(now.getTime() + offset * 60 * 1000);
}

/**
 * Formata uma data para o formato exigido pela SEFAZ: AAAA-MM-DDTHH:MM:SS-03:00
 */
export function toSefazDateTime(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '-03:00');
}

export function resolveLogicalDateTime(): Date {
  const now = nowBrasilia();
  const hour = now.getHours();

  if (hour < 6) {
    now.setDate(now.getDate() - 1);
  }

  return now;
}
