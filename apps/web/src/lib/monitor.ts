/**
 * Motor de monitoramento automático.
 * Roda a cada 1 hora (configurável) enquanto o app estiver aberto em alguma aba ou instalado como app.
 * Uma trava (Web Locks) garante que só uma aba execute a busca por vez.
 */
import { computeDeadline, nextBusinessDay } from './deadline';
import { audit, db, getSetting, nowIso, setSetting, uid, type AppNotification, type Publication, type User } from './db';
import { daysAgoIso, todayIso } from './format';
import { getNotifyPrefs, notifyNew } from './notify';
import { CONNECTORS, SOURCES, type FoundPublication } from './sources';

export const DEFAULT_DATAJUD_KEY = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

export type MonitorSettings = {
  enabled: boolean;
  intervalMinutes: number;
  sources: Record<string, boolean>;
  connectorUrl: string;
  datajudKey: string;
  extraHolidays: string[];
  initialDays: number;
};

export const DEFAULT_MONITOR: MonitorSettings = {
  enabled: true,
  intervalMinutes: 60,
  sources: { djen: true, datajud: true, 'querido-diario': true, pncp: true },
  connectorUrl: '',
  datajudKey: DEFAULT_DATAJUD_KEY,
  extraHolidays: [],
  initialDays: 30,
};

export async function getMonitorSettings(): Promise<MonitorSettings> {
  const s = await getSetting<Partial<MonitorSettings>>('monitor', {});
  return { ...DEFAULT_MONITOR, ...s, sources: { ...DEFAULT_MONITOR.sources, ...(s.sources || {}) } };
}

export function withDeadline(p: FoundPublication, extraHolidays: string[]): Publication['deadline'] {
  if (!p.deadlineHint || !p.availableAt) return undefined;
  const r = computeDeadline(p.availableAt, p.deadlineHint.days, { corridos: p.deadlineHint.corridos, extraHolidays });
  return { ...p.deadlineHint, ...r };
}

export type RunResult = { found: number; created: number; errors: string[] };

let running = false;

export async function runMonitor(user: User, reason: 'automatico' | 'manual' = 'manual'): Promise<RunResult> {
  if (running) return { found: 0, created: 0, errors: ['Já existe uma busca em andamento.'] };
  if (isDemo(user)) return { found: 0, created: 0, errors: ['Na demonstração as buscas são simuladas. Crie sua conta para monitorar de verdade.'] };
  running = true;
  try {
    const settings = await getMonitorSettings();
    const terms = (await db.terms.where('userId').equals(user.id).toArray()).filter((t) => t.active);
    const lastKey = `monitor.last.${user.id}`;
    const last = await getSetting<string | null>(lastKey, null);
    // Busca desde a última execução (com 2 dias de margem) ou, na primeira vez, os últimos N dias.
    const since = last ? daysAgoIso(Math.max(2, Math.ceil((Date.now() - new Date(last).getTime()) / 86400000) + 1)) : daysAgoIso(settings.initialDays);
    const until = todayIso();
    const result: RunResult = { found: 0, created: 0, errors: [] };
    const created: Publication[] = [];

    for (const source of SOURCES) {
      const fn = CONNECTORS[source.id];
      if (!fn || !settings.sources[source.id]) continue;
      let items: FoundPublication[] = [];
      try {
        items = await fn({
          user,
          terms,
          since,
          until,
          connectorUrl: settings.connectorUrl || undefined,
          datajudKey: settings.datajudKey || DEFAULT_DATAJUD_KEY,
          extraHolidays: settings.extraHolidays,
          log: async (query, exec) => {
            const id = uid('r_');
            const startedAt = nowIso();
            await db.runs.add({ id, userId: user.id, source: source.id, query, startedAt, status: 'ok', found: 0, created: 0 });
            try {
              const found = await exec();
              await db.runs.update(id, { finishedAt: nowIso(), found });
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              const blocked = /Failed to fetch|NetworkError|Load failed/i.test(msg);
              await db.runs.update(id, {
                finishedAt: nowIso(),
                status: 'erro',
                error: blocked ? 'A fonte bloqueou a chamada do navegador. Ative o conector local em Monitoramento.' : msg,
              });
              result.errors.push(`${source.name}: ${msg}`);
            }
          },
        });
      } catch (err) {
        result.errors.push(`${source.name}: ${err instanceof Error ? err.message : String(err)}`);
      }

      result.found += items.length;
      for (const item of items) {
        const id = `${user.id}:${item.id}`;
        const existing = await db.publications.get(id);
        if (existing) {
          const matchedBy = [...new Set([...existing.matchedBy, ...item.matchedBy])];
          if (matchedBy.length !== existing.matchedBy.length) await db.publications.update(id, { matchedBy });
          continue;
        }
        const deadline = withDeadline(item, settings.extraHolidays);
        const { deadlineHint: _ignored, ...rest } = item;
        const pub: Publication = {
          ...rest,
          id,
          userId: user.id,
          publishedAt: deadline?.publishedAt || item.publishedAt || (item.source === 'djen' ? nextBusinessDay(item.availableAt) : item.availableAt),
          deadline,
          read: false,
          favorite: false,
          createdAt: nowIso(),
        };
        await db.publications.add(pub);
        created.push(pub);
      }
    }

    result.created = created.length;
    if (created.length) {
      const notes: AppNotification[] = created.map((p) => ({
        id: uid('n_'),
        userId: user.id,
        kind: p.type === 'Licitação' ? 'licitacao' : p.type === 'Intimação' || p.type === 'Citação' ? 'intimacao' : p.deadline ? 'prazo' : 'publicacao',
        title: `${p.type === 'Licitação' ? 'Nova licitação' : `Nova ${p.type.toLowerCase()}`}${p.court ? ` · ${p.court}` : ''}`,
        body: `${p.processNumber || p.organ || ''}${p.deadline ? ` — prazo até ${p.deadline.endAt.split('-').reverse().join('/')}` : ''}`,
        publicationId: p.id,
        read: false,
        createdAt: nowIso(),
      }));
      const prefs = await getNotifyPrefs();
      const wanted = notes.filter((n) => prefs.kinds[n.kind] !== false);
      if (wanted.length) {
        await db.notifications.bulkAdd(wanted);
        const ids = new Set(wanted.map((n) => n.publicationId));
        await notifyNew(created.filter((p) => ids.has(p.id)));
      }
    }
    await setSetting(lastKey, nowIso());
    await audit('monitoramento', `${reason}: ${result.found} encontradas, ${result.created} novas`, user.id);
    return result;
  } finally {
    running = false;
  }
}

/** A conta de demonstração usa dados fictícios e nunca consulta as fontes reais. */
export function isDemo(user: Pick<User, 'email'>): boolean {
  return user.email.endsWith('@naoesqueceadv.local');
}

export async function lastRunAt(userId: string): Promise<string | null> {
  return getSetting<string | null>(`monitor.last.${userId}`, null);
}

/** Agenda o monitoramento contínuo. Retorna função para cancelar. */
export function startScheduler(getUser: () => User | null, onRun?: (r: RunResult) => void): () => void {
  const tick = async () => {
    const user = getUser();
    if (!user || isDemo(user)) return;
    const settings = await getMonitorSettings();
    if (!settings.enabled) return;
    const last = await lastRunAt(user.id);
    const due = !last || Date.now() - new Date(last).getTime() >= settings.intervalMinutes * 60_000;
    if (!due || !navigator.onLine) return;
    const exec = async () => onRun?.(await runMonitor(user, 'automatico'));
    if ('locks' in navigator) await navigator.locks.request('nea-monitor', { ifAvailable: true }, async (lock) => (lock ? exec() : undefined));
    else await exec();
  };
  const first = setTimeout(tick, 5_000);
  const timer = setInterval(tick, 60_000);
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}
