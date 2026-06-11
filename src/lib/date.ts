/**
 * Utilitários para formatação de datas e horários das partidas.
 * Força a utilização do fuso horário de Brasília ('America/Sao_Paulo')
 * tanto no servidor quanto no cliente para evitar erros de fuso e incompatibilidades de hidratação.
 */

export function formatMatchDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

export function formatMatchTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

export function formatMatchDateTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return `${formatMatchDate(date)} às ${formatMatchTime(date)}`;
}

/**
 * Retorna se as duas datas coincidem no mesmo dia civil no fuso de Brasília.
 */
export function isSameDayInSaoPaulo(date1Input: Date | string, date2Input: Date | string): boolean {
  const date1 = typeof date1Input === 'string' ? new Date(date1Input) : date1Input;
  const date2 = typeof date2Input === 'string' ? new Date(date2Input) : date2Input;
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts1 = formatter.formatToParts(date1);
  const parts2 = formatter.formatToParts(date2);
  
  const y1 = parts1.find(p => p.type === 'year')!.value;
  const m1 = parts1.find(p => p.type === 'month')!.value;
  const d1 = parts1.find(p => p.type === 'day')!.value;
  
  const y2 = parts2.find(p => p.type === 'year')!.value;
  const m2 = parts2.find(p => p.type === 'month')!.value;
  const d2 = parts2.find(p => p.type === 'day')!.value;
  
  return y1 === y2 && m1 === m2 && d1 === d2;
}

/**
 * Recebe uma string obtida de um input do tipo 'datetime-local' (ex: "2026-06-11T14:00")
 * e a interpreta estritamente como sendo do fuso de Brasília ('America/Sao_Paulo'),
 * convertendo-a para uma string ISO UTC de forma independente do fuso horário do navegador do admin.
 */
export function parseLocalDateToUTC(localDateTimeStr: string): string {
  const tempDate = new Date(localDateTimeStr + ":00Z");
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  const parts = tzFormatter.formatToParts(tempDate);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  const hour = parts.find(p => p.type === 'hour')!.value;
  const minute = parts.find(p => p.type === 'minute')!.value;
  const second = parts.find(p => p.type === 'second')!.value;
  
  const formattedUTC = new Date(
    `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}Z`
  );
  
  const offsetMs = tempDate.getTime() - formattedUTC.getTime();
  const correctUTCDate = new Date(tempDate.getTime() + offsetMs);
  return correctUTCDate.toISOString();
}

