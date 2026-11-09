import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDeadline, easter, isBusinessDay } from './deadline.ts';
import { classify, extractComarca, extractDeadline, extractParties, extractProcessNumber, extractVara } from './extract.ts';

test('Páscoa', () => {
  assert.equal(easter(2026), '2026-04-05');
  assert.equal(easter(2027), '2027-03-28');
});

test('feriados e fins de semana', () => {
  assert.equal(isBusinessDay('2026-11-14'), false); // sábado
  assert.equal(isBusinessDay('2026-11-20'), false); // Consciência Negra
  assert.equal(isBusinessDay('2026-04-03'), false); // Sexta-feira Santa
  assert.equal(isBusinessDay('2026-11-10'), true);
});

test('prazo de 15 dias úteis a partir da disponibilização', () => {
  // Disponibilizado seg 09/11/2026 → publicado ter 10/11 → início qua 11/11.
  // Pula 15/11 (dom) e 20/11 (feriado). 15 dias úteis terminam em 02/12/2026.
  const r = computeDeadline('2026-11-09', 15);
  assert.equal(r.publishedAt, '2026-11-10');
  assert.equal(r.startAt, '2026-11-11');
  assert.equal(r.endAt, '2026-12-02');
});

test('suspensão de 20/12 a 20/01', () => {
  const r = computeDeadline('2026-12-16', 5);
  // publicado 17/12, início 18/12, 19-20 fim de semana, depois suspenso até 20/01.
  assert.equal(r.startAt, '2026-12-18');
  assert.equal(r.endAt, '2027-01-26');
});

test('extrai dados do texto', () => {
  const t = 'Processo nº 0823437-24.2023.8.12.0001\nComarca de Campo Grande - 4ª Vara de Fazenda Pública\nRecorrido: Raynan da Silva Farias\nAutor: João Souza\nFica a parte intimada para, no prazo de 15 (quinze) dias, manifestar-se.';
  assert.equal(extractProcessNumber(t), '0823437-24.2023.8.12.0001');
  assert.equal(extractComarca(t), 'Campo Grande');
  assert.equal(extractVara(t), '4ª Vara de Fazenda Pública');
  assert.deepEqual(extractParties(t), ['RAYNAN DA SILVA FARIAS', 'JOÃO SOUZA']);
  assert.deepEqual(extractDeadline(t), { days: 15, corridos: false });
  assert.equal(classify('Intimação', t), 'Intimação');
});

test('prazo por extenso e em horas', () => {
  assert.deepEqual(extractDeadline('no prazo de cinco dias'), { days: 5, corridos: false });
  assert.deepEqual(extractDeadline('manifeste-se em 48 horas'), { days: 2, corridos: false });
  assert.deepEqual(extractDeadline('prazo de 10 dias corridos'), { days: 10, corridos: true });
});
