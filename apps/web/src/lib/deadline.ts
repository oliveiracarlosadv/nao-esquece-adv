/**
 * Cálculo de prazos processuais.
 *
 * Regras aplicadas (CPC/2015 e Lei 11.419/2006):
 * - Publicação = primeiro dia útil seguinte à disponibilização no Diário (Lei 11.419, art. 4º, §3º).
 * - O prazo começa no primeiro dia útil seguinte à publicação (art. 4º, §4º; CPC art. 224).
 * - Prazos em dias úteis (CPC art. 219). Opcionalmente, dias corridos (ex.: processo penal).
 * - Suspensão de 20/12 a 20/01 (CPC art. 220).
 * - Feriados nacionais fixos, móveis (Carnaval, Sexta-feira Santa, Corpus Christi) e feriados locais informados.
 *
 * Datas são tratadas como texto 'AAAA-MM-DD' para evitar problemas de fuso horário.
 */

export type DeadlineOptions = {
  /** Contar em dias corridos em vez de dias úteis. */
  corridos?: boolean;
  /** Feriados locais extras, no formato 'AAAA-MM-DD' ou 'MM-DD' (repete todo ano). */
  extraHolidays?: string[];
  /** Aplicar a suspensão de 20/12 a 20/01 (padrão: sim). */
  recesso?: boolean;
};

export type DeadlineResult = {
  publishedAt: string;
  startAt: string;
  endAt: string;
};

const FIXED_HOLIDAYS = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'];

export function toDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function easter(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const holidayCache = new Map<number, Set<string>>();

export function nationalHolidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const set = new Set(FIXED_HOLIDAYS.map((md) => `${year}-${md}`));
  const e = easter(year);
  set.add(addDays(e, -48)); // segunda de Carnaval
  set.add(addDays(e, -47)); // terça de Carnaval
  set.add(addDays(e, -2)); // Sexta-feira Santa
  set.add(addDays(e, 60)); // Corpus Christi
  holidayCache.set(year, set);
  return set;
}

export function isRecesso(iso: string): boolean {
  const md = iso.slice(5);
  return md >= '12-20' || md <= '01-20';
}

export function isBusinessDay(iso: string, opts: DeadlineOptions = {}): boolean {
  const weekday = toDate(iso).getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  if (nationalHolidays(Number(iso.slice(0, 4))).has(iso)) return false;
  if (opts.extraHolidays?.some((h) => h === iso || h === iso.slice(5))) return false;
  return true;
}

/** Dia que conta para o prazo: útil e fora da suspensão do art. 220. */
function isCountable(iso: string, opts: DeadlineOptions): boolean {
  if (opts.recesso !== false && isRecesso(iso)) return false;
  return isBusinessDay(iso, opts);
}

export function nextBusinessDay(iso: string, opts: DeadlineOptions = {}): string {
  let d = addDays(iso, 1);
  while (!isBusinessDay(d, opts)) d = addDays(d, 1);
  return d;
}

function nextCountable(iso: string, opts: DeadlineOptions): string {
  let d = addDays(iso, 1);
  while (!isCountable(d, opts)) d = addDays(d, 1);
  return d;
}

/**
 * Calcula a data final de um prazo de `days` dias a partir da data de disponibilização.
 */
export function computeDeadline(availableAt: string, days: number, opts: DeadlineOptions = {}): DeadlineResult {
  const publishedAt = nextBusinessDay(availableAt, opts);
  const startAt = nextCountable(publishedAt, opts);
  let endAt = startAt;

  if (opts.corridos) {
    // Dias corridos: conta todos os dias; se terminar em dia não útil, prorroga.
    let counted = 1;
    while (counted < days) {
      endAt = addDays(endAt, 1);
      if (opts.recesso === false || !isRecesso(endAt)) counted++;
    }
    while (!isCountable(endAt, opts)) endAt = addDays(endAt, 1);
  } else {
    let counted = 1;
    while (counted < days) {
      endAt = nextCountable(endAt, opts);
      counted++;
    }
  }
  return { publishedAt, startAt, endAt };
}

/** Quantidade de dias úteis entre hoje e a data (negativo se vencido). */
export function businessDaysUntil(endAt: string, today: string, opts: DeadlineOptions = {}): number {
  if (endAt === today) return 0;
  const forward = endAt > today;
  let d = today;
  let n = 0;
  while (d !== endAt) {
    d = addDays(d, forward ? 1 : -1);
    if (isBusinessDay(d, opts)) n++;
  }
  return forward ? n : -n;
}
