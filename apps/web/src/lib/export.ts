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
