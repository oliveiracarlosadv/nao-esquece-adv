/**
 * Exportação das publicações para CSV, Excel e PDF — gerados no próprio navegador.
 */
import { getSetting, type Publication, type User } from './db';
import { downloadBlob, fmtDate } from './format';

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
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
  [10, 14, 12, 28, 40, 12, 30, 18, 13, 14, 16, 30, 40, 80].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.autoFilter = { from: 'A1', to: `N${list.length + 1}` };
  const buf = await wb.xlsx.writeBuffer();
  downloadBlob(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `publicacoes_${stamp()}.xlsx`);
}

export async function exportPdf(list: Publication[], user: User | null, title = 'Relatório de publicações'): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('NÃO ESQUECE ADV', 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${title} · ${list.length} registro(s) · gerado em ${new Date().toLocaleString('pt-BR')}`, 40, 56);
  if (user) doc.text(`${user.name}${user.oab ? ` · OAB ${user.oab}/${user.oabUf}` : ''}`, 40, 70);
  // Logomarca: a do advogado ou a padrão definida no painel administrativo (PNG/JPG).
  const logo = user?.logo || (await getSetting<string | null>('app.reportLogo', null));
  const fmt = logo?.match(/^data:image\/(png|jpe?g)/)?.[1];
  if (logo && fmt) {
    try {
      const props = doc.getImageProperties(logo);
      const h = 40;
      const w = Math.min(160, (props.width / props.height) * h);
      doc.addImage(logo, fmt.startsWith('j') ? 'JPEG' : 'PNG', doc.internal.pageSize.getWidth() - 40 - w, 28, w, h);
    } catch {
      /* imagem inválida: segue sem logo */
    }
  }
  autoTable(doc, {
    startY: 84,
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
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [29, 78, 216] },
    alternateRowStyles: { fillColor: [246, 248, 252] },
    columnStyles: { 2: { cellWidth: 120 }, 3: { cellWidth: 150 }, 4: { cellWidth: 130 } },
  });
  doc.save(`publicacoes_${stamp()}.pdf`);
}

/* ---------------------------------------------------------------- PDF de uma intimação */

/**
 * Documento completo de UMA publicação, pronto para compartilhar:
 * dados do advogado, processo, datas (disponibilização, publicação, prazo) e inteiro teor.
 * O CPF do usuário não entra (o documento é feito para ser enviado a terceiros).
 */
export async function publicationPdf(p: Publication, user: User | null): Promise<{ blob: Blob; name: string }> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const CW = W - M * 2;
  let y = M;
  const OLIVE: [number, number, number] = [91, 107, 58];
  const GRAY: [number, number, number] = [100, 116, 139];
  const INK: [number, number, number] = [15, 23, 42];

  const footer = () => {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(`NÃO ESQUECE ADV · gerado em ${new Date().toLocaleString('pt-BR')} · página ${i} de ${pages}`, M, H - 24);
      doc.text('Confira sempre a publicação na fonte oficial.', W - M, H - 24, { align: 'right' });
    }
  };
  const ensure = (h: number) => {
    if (y + h > H - 48) {
      doc.addPage();
      y = M;
    }
  };
  const section = (title: string) => {
    ensure(34);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...OLIVE);
    doc.text(title.toUpperCase(), M, y);
    y += 6;
    doc.setDrawColor(220, 226, 198);
    doc.line(M, y, W - M, y);
    y += 14;
  };
  const field = (label: string, value?: string) => {
    if (!value) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(value, CW - 160);
    const labels = doc.splitTextToSize(label, 150);
    const rows = Math.max(lines.length, labels.length);
    ensure(rows * 13 + 4);
    doc.setTextColor(...GRAY);
    doc.text(labels, M, y);
    doc.setTextColor(...INK);
    doc.text(lines, M + 160, y);
    y += rows * 13 + 4;
  };

  // Cabeçalho
  const logo = user?.logo || (await getSetting<string | null>('app.reportLogo', null));
  const fmt = logo?.match(/^data:image\/(png|jpe?g)/)?.[1];
  if (logo && fmt) {
    try {
      const pr = doc.getImageProperties(logo);
      const h = 36;
      const w = Math.min(140, (pr.width / pr.height) * h);
      doc.addImage(logo, fmt.startsWith('j') ? 'JPEG' : 'PNG', W - M - w, y - 6, w, h);
    } catch {
      /* segue sem logo */
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(`${p.type}${p.court ? ` — ${p.court}` : ''}`, M, y + 8);
  y += 26;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(p.processNumber ? `Processo nº ${p.processNumber}` : p.organ || '', M, y);
  y += 12;

  // Prazo em destaque
  if (p.deadline) {
    ensure(64);
    y += 8;
    doc.setFillColor(243, 245, 236);
    doc.roundedRect(M, y, CW, 52, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...OLIVE);
    doc.text('FIM DO PRAZO', M + 14, y + 18);
    doc.setFontSize(18);
    doc.setTextColor(192, 87, 62);
    doc.text(fmtDate(p.deadline.endAt), M + 14, y + 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    const basis = p.deadline.basis === 'extraido' ? 'prazo identificado no texto' : p.deadline.basis === 'presumido' ? 'prazo presumido — confira' : 'prazo informado manualmente';
    doc.text(`${p.deadline.days} dias ${p.deadline.corridos ? 'corridos' : 'úteis'} · início em ${fmtDate(p.deadline.startAt)} · ${basis}`, M + 140, y + 34);
    y += 64;
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

  section('Origem');
  field('Fonte', p.origin);
  field('Link', p.link);
  field('Encontrado por', p.matchedBy.join('; '));

  section('Inteiro teor');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  for (const para of p.text.split('\n')) {
    const lines = para.trim() ? doc.splitTextToSize(para, CW) : [''];
    for (const line of lines) {
      ensure(14);
      doc.text(line, M, y);
      y += 14;
    }
  }

  footer();
  const name = `intimacao_${(p.processNumber || p.type).replace(/[^\w.-]+/g, '_')}.pdf`;
  return { blob: doc.output('blob'), name };
}
