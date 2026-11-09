import type { Filters, Publication } from './db';
import { normalizeText } from './extract';

const has = (value: string | undefined, needle: string | undefined) => !needle || normalizeText(value || '').includes(normalizeText(needle));

export function applyFilters(list: Publication[], f: Filters): Publication[] {
  const digits = (s?: string) => (s || '').replace(/\D/g, '');
  const q = f.q?.trim();
  return list.filter((p) => {
    if (f.read === 'lidos' && !p.read) return false;
    if (f.read === 'nao-lidos' && p.read) return false;
    if (f.favorites && !p.favorite) return false;
    if (f.type && p.type !== f.type) return false;
    if (f.origin && p.origin !== f.origin) return false;
    if (f.from && p.availableAt < f.from) return false;
    if (f.to && p.availableAt > f.to) return false;
    if (f.processNumber && !digits(p.processNumber).includes(digits(f.processNumber)) && !has(p.processNumber, f.processNumber)) return false;
    if (f.party && !has(p.parties.join(' '), f.party)) return false;
    if (f.court && !has(p.court, f.court)) return false;
    if (f.vara && !has(p.vara, f.vara)) return false;
    if (f.comarca && !has(p.comarca, f.comarca)) return false;
    if (q) {
      // Busca global: partes, processo, advogado, OAB, texto.
      const hay = [p.processNumber, p.parties.join(' '), p.lawyers.join(' '), p.court, p.vara, p.comarca, p.organ, p.matchedBy.join(' '), p.text].join(' ');
      const qDigits = digits(q);
      if (!has(hay, q) && !(qDigits.length >= 4 && digits(hay).includes(qDigits))) return false;
    }
    return true;
  });
}

export function sortPublications(list: Publication[]): Publication[] {
  return [...list].sort((a, b) => (a.read === b.read ? b.availableAt.localeCompare(a.availableAt) : a.read ? 1 : -1));
}

export function countActive(f: Filters): number {
  return Object.entries(f).filter(([k, v]) => k !== 'q' && v && v !== 'todos').length;
}

export function distinct(list: Publication[], key: keyof Publication): string[] {
  return [...new Set(list.map((p) => p[key]).filter((v): v is string => typeof v === 'string' && !!v))].sort();
}
