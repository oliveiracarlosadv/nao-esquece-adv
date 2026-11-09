#!/usr/bin/env node
/**
 * NÃO ESQUECE ADV — Conector local (opcional)
 *
 * Algumas fontes públicas não aceitam chamadas vindas direto do navegador (CORS).
 * Este pequeno servidor roda SÓ no seu computador (127.0.0.1) e repassa as consultas
 * para uma lista fechada de sites oficiais. Ele não guarda nada.
 *
 * Uso:   node conector-local/server.mjs
 * Porta: 8787 (mude com PORT=9000 node conector-local/server.mjs)
 * Requer Node.js 18 ou superior. Sem dependências.
 */
import http from 'node:http';

const VERSION = '1.0.0';
const PORT = Number(process.env.PORT || 8787);
const HOST = '127.0.0.1';

// Somente estes domínios podem ser consultados pelo conector.
const ALLOWED = [
  'comunicaapi.pje.jus.br',
  'api-publica.datajud.cnj.jus.br',
  'api.queridodiario.ok.org.br',
  'pncp.gov.br',
  'inlabs.in.gov.br',
  'www.in.gov.br',
];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Private-Network': 'true',
};

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...cors });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1_000_000) reject(new Error('Requisição muito grande'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.url === '/status') return send(res, 200, { ok: true, version: VERSION, allowed: ALLOWED });
  if (req.url !== '/proxy' || req.method !== 'POST') return send(res, 404, { error: 'Rota não encontrada' });

  try {
    const { url, method = 'GET', headers = {}, body } = JSON.parse(await readBody(req));
    const target = new URL(url);
    if (target.protocol !== 'https:' || !ALLOWED.includes(target.hostname)) return send(res, 403, { error: `Domínio não permitido: ${target.hostname}` });

    const safeHeaders = {};
    for (const [k, v] of Object.entries(headers)) if (/^(authorization|content-type|accept)$/i.test(k)) safeHeaders[k] = String(v);

    const started = Date.now();
    const upstream = await fetch(target, { method, headers: { 'User-Agent': 'NaoEsqueceAdv-ConectorLocal/' + VERSION, Accept: 'application/json', ...safeHeaders }, body: method === 'GET' ? undefined : body, signal: AbortSignal.timeout(30_000) });
    const text = await upstream.text();
    console.log(`${new Date().toLocaleTimeString('pt-BR')}  ${upstream.status}  ${target.hostname}${target.pathname}  ${Date.now() - started}ms`);
    send(res, upstream.status, text);
  } catch (err) {
    console.error('Erro:', err.message);
    send(res, 502, { error: err.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  NÃO ESQUECE ADV — conector local v${VERSION}`);
  console.log(`  Rodando em http://${HOST}:${PORT}`);
  console.log('  Configure este endereço em Monitoramento → Configurações.\n');
});
