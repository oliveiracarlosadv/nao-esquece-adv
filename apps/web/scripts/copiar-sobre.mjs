// Copia a pasta de conteúdo da página "Sobre" para dentro do app (executado antes do build).
// Pasta de origem: variável SOBRE_DIR ou ../../conteudo/sobre
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.resolve(root, process.env.SOBRE_DIR || '../../conteudo/sobre');
const pub = path.join(root, 'public', 'conteudo-sobre');
const out = path.join(root, 'src', 'generated', 'sobre.json');

fs.rmSync(pub, { recursive: true, force: true });
fs.mkdirSync(pub, { recursive: true });
fs.mkdirSync(path.dirname(out), { recursive: true });

const files = [];
if (fs.existsSync(src)) {
  for (const name of fs.readdirSync(src).sort()) {
    const full = path.join(src, name);
    if (!fs.statSync(full).isFile() || name.startsWith('.') || /^leia-?me/i.test(name)) continue;
    if (/\.(md|markdown|txt|html?)$/i.test(name)) files.push({ name, content: fs.readFileSync(full, 'utf8') });
    else if (/\.(jpe?g|png|svg|webp|gif)$/i.test(name)) fs.copyFileSync(full, path.join(pub, name));
  }
}
fs.writeFileSync(out, JSON.stringify({ source: path.relative(root, src), files }, null, 2));
console.log(`Sobre: ${files.length} texto(s) de ${src}`);
