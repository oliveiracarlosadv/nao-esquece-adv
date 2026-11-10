/**
 * Exportação das publicações para CSV, Excel e PDF — gerados no próprio navegador.
 */
import { getSetting, type Publication, type User } from './db';
import { downloadBlob, fmtDate } from './format';
import { AVISO_FERIADOS } from './termos';


/** Reduz a logomarca (data URL) para no máximo 240 px de largura, em JPEG/PNG leve, antes de pôr no PDF. */
async function smallLogo(dataUrl: string): Promise<{ url: string; fmt: 'PNG' | 'JPEG' } | null> {
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });
    const scale = Math.min(1, 240 / img.width);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const isPng = /^data:image\/(png|svg)/.test(dataUrl);
    if (!isPng) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return isPng ? { url: c.toDataURL('image/png'), fmt: 'PNG' } : { url: c.toDataURL('image/jpeg', 0.85), fmt: 'JPEG' };
  } catch {
    return null;
  }
}

const HEADERS = ['Status', 'Disponibilização', 'Publicação', 'Processo', 'Partes', 'Tribunal', 'Vara', 'Comarca', 'Fim do prazo', 'Tipo', 'Origem', 'Órgão', 'Link', 'Texto'];

function row(p: Publication): string[] {
  return [
    p.read ? 'Lido' : 'Não lido',
    fmtDate(p.availableAt),
    fmtDate(p.publishedAt),
    p.processNumber || '',
    p.parties.join('; '),
    p.court || '',
    p.vara || '',
    p.comarca || '',
    p.deadline ? fmtDate(p.deadline.endAt) : '',
    p.type,
    p.origin,
    p.organ || '',
    p.link || '',
    p.text.replace(/\s+/g, ' ').slice(0, 30000),
  ];
}

function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
}

export function exportCsv(list: Publication[]): void {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [HEADERS, ...list.map(row)].map((r) => r.map(esc).join(';'));
  downloadBlob(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `publicacoes_${stamp()}.csv`);
}

export async function exportXlsx(list: Publication[]): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'NÃO ESQUECE ADV';
  const ws = wb.addWorksheet('Publicações', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.addRow(HEADERS);
  list.forEach((p) => ws.addRow(row(p)));
  // Times New Roman 12, justificado, com quebra de linha
  ws.eachRow((row) => {
    row.font = { name: EXPORT_FONT.excel, size: EXPORT_FONT.size };
    row.alignment = { horizontal: 'justify', vertical: 'top', wrapText: true };
  });
  ws.getRow(1).font = { name: EXPORT_FONT.excel, size: EXPORT_FONT.size, bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B6B3A' } };
  [10, 14, 12, 28, 40, 12, 30, 18, 13, 14, 16, 30, 40, 80].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.autoFilter = { from: 'A1', to: `N${list.length + 1}` };
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `publicacoes_${stamp()}.xlsx`);
}

export async function exportPdf(list: Publication[], user: User | null, title = 'Relatório de publicações'): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setLineHeightFactor(1.5);
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('NÃO ESQUECE ADV', 40, 40);
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.text(`${title} · ${list.length} registro(s) · gerado em ${new Date().toLocaleString('pt-BR')}`, 40, 58);
  if (user) doc.text(`${user.name}${user.oab ? ` · OAB ${user.oab}/${user.oabUf}` : ''}`, 40, 76);
  // Logomarca: a do advogado ou a padrão definida no painel administrativo (PNG/JPG).
  const rawLogo = user?.logo || (await getSetting<string | null>('app.reportLogo', null));
  const logo = rawLogo ? await smallLogo(rawLogo) : null;
  if (logo) {
    try {
      const props = doc.getImageProperties(logo.url);
      const h = 40;
      const w = Math.min(160, (props.width / props.height) * h);
      doc.addImage(logo.url, logo.fmt, doc.internal.pageSize.getWidth() - 40 - w, 28, w, h);
    } catch {
      /* imagem inválida: segue sem logo */
    }
  }
  autoTable(doc, {
    startY: 92,
    head: [['Status', 'Disponib.', 'Processo', 'Partes', 'Tribunal / Vara', 'Comarca', 'Fim do prazo', 'Tipo', 'Origem']],
    body: list.map((p) => [
      p.read ? 'Lido' : 'Não lido',
      fmtDate(p.availableAt),
      p.processNumber || '—',
      p.parties.slice(0, 3).join('; ') || '—',
      [p.court, p.vara].filter(Boolean).join(' / ') || '—',
      p.comarca || '—',
      p.deadline ? fmtDate(p.deadline.endAt) : '—',
      p.type,
      p.origin,
    ]),
    styles: { font: 'times', fontSize: 12, cellPadding: 5, overflow: 'linebreak', halign: 'justify', valign: 'top' },
    headStyles: { fillColor: [91, 107, 58], halign: 'left' },
    alternateRowStyles: { fillColor: [246, 248, 252] },
    columnStyles: { 0: { cellWidth: 58 }, 1: { cellWidth: 70 }, 2: { cellWidth: 125 }, 3: { cellWidth: 140 }, 4: { cellWidth: 120 }, 6: { cellWidth: 70 } },
  });
  doc.save(`publicacoes_${stamp()}.pdf`);
}

/* ---------------------------------------------------------------- PDF de uma intimação */

/** Padrão do texto exportado: Times New Roman 12, justificado, entrelinhas 1,5. */
export const EXPORT_FONT = { pdf: 'times', excel: 'Times New Roman', size: 12, lineHeight: 1.5 } as const;
const LH = EXPORT_FONT.size * EXPORT_FONT.lineHeight; // 18 pt

type PdfDoc = import('jspdf').jsPDF;

/** Desenha uma linha justificada: distribui o espaço que sobra entre as palavras (margens alinhadas). */
function justifiedLine(doc: PdfDoc, line: string, x: number, y: number, width: number): void {
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    doc.text(line.trim(), x, y);
    return;
  }
  const wordsWidth = words.reduce((sum, w) => sum + doc.getTextWidth(w), 0);
  const gap = (width - wordsWidth) / (words.length - 1);
  // Se a linha for curta demais (gap exagerado), não estica.
  if (gap > doc.getTextWidth(' ') * 6) {
    doc.text(words.join(' '), x, y);
    return;
  }
  let cx = x;
  for (const w of words) {
    doc.text(w, cx, y);
    cx += doc.getTextWidth(w) + gap;
  }
}

/** Quebra o texto em linhas (espaços repetidos normalizados) para a largura dada. */
function wrap(doc: PdfDoc, text: string, width: number): string[] {
  const clean = text.replace(/[ \t\u00a0]+/g, ' ').trim();
  return clean ? (doc.splitTextToSize(clean, width) as string[]) : [''];
}

/**
 * Documento completo de UMA publicação, pronto para salvar ou compartilhar:
 * dados do advogado, processo, datas (intimação, publicação, prazo) e inteiro teor.
 * Texto em Times 12, justificado, entrelinhas 1,5. O CPF do usuário não entra.
 */
export async function publicationPdf(p: Publication, user: User | null): Promise<{ blob: Blob; name: string }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setLineHeightFactor(EXPORT_FONT.lineHeight);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 56;
  const CW = W - M * 2;
  const LABEL_W = 170;
  let y = M;
  const OLIVE: [number, number, number] = [91, 107, 58];
  const GRAY: [number, number, number] = [90, 100, 115];
  const INK: [number, number, number] = [15, 23, 42];
  const RED: [number, number, number] = [192, 87, 62];
  const font = (style: 'normal' | 'bold' | 'italic' = 'normal', color = INK) => {
    doc.setFont(EXPORT_FONT.pdf, style);
    doc.setFontSize(EXPORT_FONT.size);
    doc.setTextColor(...color);
  };
  const ensure = (h: number) => {
    if (y + h > H - 60) {
      doc.addPage();
      y = M;
    }
  };
  /** Parágrafo justificado (última linha à esquerda), com quebra de página. */
  const paragraph = (text: string, x: number, width: number, style: 'normal' | 'bold' | 'italic' = 'normal', color = INK) => {
    font(style, color);
    const lines = wrap(doc, text, width);
    lines.forEach((line, idx) => {
      ensure(LH);
      if (idx === lines.length - 1) doc.text(line, x, y);
      else justifiedLine(doc, line, x, y, width);
      y += LH;
    });
  };
  const section = (title: string) => {
    ensure(LH * 2);
    y += LH / 2;
    font('bold', OLIVE);
    doc.text(title.toUpperCase(), M, y);
    y += 5;
    doc.setDrawColor(220, 226, 198);
    doc.line(M, y, W - M, y);
    y += LH - 2;
  };
  const field = (label: string, value?: string) => {
    if (!value) return;
    font('normal');
    const vLines = wrap(doc, value, CW - LABEL_W);
    const lLines: string[] = doc.splitTextToSize(label, LABEL_W - 10);
    const rows = Math.max(vLines.length, lLines.length);
    ensure(rows * LH);
    font('normal', GRAY);
    doc.text(lLines, M, y);
    font('normal');
    vLines.forEach((line, idx) => {
      if (idx === vLines.length - 1) doc.text(line, M + LABEL_W, y + idx * LH);
      else justifiedLine(doc, line, M + LABEL_W, y + idx * LH, CW - LABEL_W);
    });
    y += rows * LH;
  };

  // Cabeçalho
  const rawLogo = user?.logo || (await getSetting<string | null>('app.reportLogo', null));
  const logo = rawLogo ? await smallLogo(rawLogo) : null;
  if (logo) {
    try {
      const pr = doc.getImageProperties(logo.url);
      const h = 40;
      const w = Math.min(140, (pr.width / pr.height) * h);
      doc.addImage(logo.url, logo.fmt, W - M - w, y - 14, w, h);
    } catch {
      /* segue sem logo */
    }
  }
  font('bold');
  doc.text(`${p.type}${p.court ? ` — ${p.court}` : ''}`.toUpperCase(), M, y);
  y += LH;
  font('normal', GRAY);
  doc.text(p.processNumber ? `Processo nº ${p.processNumber}` : p.organ || '', M, y);
  y += LH;

  // Prazo em destaque
  if (p.deadline) {
    ensure(LH * 3 + 8);
    y += 6;
    doc.setFillColor(243, 245, 236);
    doc.roundedRect(M, y - 4, CW, LH * 3, 6, 6, 'F');
    y += LH - 4;
    font('bold', RED);
    doc.text(`FIM DO PRAZO: ${fmtDate(p.deadline.endAt)}`, M + 12, y);
    y += LH;
    font('normal', GRAY);
    const basis = p.deadline.basis === 'extraido' ? 'prazo identificado no texto' : p.deadline.basis === 'presumido' ? 'prazo presumido — confira' : 'prazo informado manualmente';
    doc.text(`${p.deadline.days} dias ${p.deadline.corridos ? 'corridos' : 'úteis'} · início em ${fmtDate(p.deadline.startAt)} · ${basis}`, M + 12, y);
    y += LH + 8;
  }

  section('Advogado(a)');
  field('Nome', user?.name);
  field('OAB', user?.oab ? `${user.oab}/${user.oabUf}` : undefined);
  field('Telefone', user?.phone || undefined);
  field('E-mail', user?.email || undefined);

  section('Processo');
  field('Número do processo', p.processNumber);
  field('Tipo de publicação', p.sourceType ? `${p.type} (${p.sourceType})` : p.type);
  field('Tribunal', p.court);
  field('Vara / Órgão julgador', p.vara);
  field('Comarca', p.comarca);
  field('Órgão emissor', p.organ);
  field('Partes', p.parties.join('; ') || undefined);
  field('Advogados na publicação', p.lawyers.join('; ') || undefined);

  section('Datas');
  field('Data da intimação (disponibilização)', fmtDate(p.availableAt));
  field('Data da publicação', fmtDate(p.publishedAt));
  if (p.deadline) {
    field('Início do prazo', fmtDate(p.deadline.startAt));
    field('Fim do prazo', `${fmtDate(p.deadline.endAt)} (${p.deadline.days} dias ${p.deadline.corridos ? 'corridos' : 'úteis'})`);
  } else field('Fim do prazo', 'não identificado — confira a publicação');
  y += 4;
  paragraph(`Atenção: ${AVISO_FERIADOS}`, M, CW, 'italic', RED);

  section('Origem');
  field('Fonte', p.origin);
  field('Link', p.link);
  field('Encontrado por', p.matchedBy.join('; '));

  section('Inteiro teor');
  for (const para of p.text.split('\n')) paragraph(para, M, CW);

  // Rodapé
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont(EXPORT_FONT.pdf, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text(`NÃO ESQUECE ADV · gerado em ${new Date().toLocaleString('pt-BR')} · página ${i} de ${pages}`, M, H - 30);
    doc.text('Confira sempre a publicação na fonte oficial.', W - M, H - 30, { align: 'right' });
  }
  const name = `intimacao_${(p.processNumber || p.type).replace(/[^\w.-]+/g, '_')}.pdf`;
  return { blob: doc.output('blob'), name };
}
