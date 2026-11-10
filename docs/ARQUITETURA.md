# Arquitetura

## Visão geral

```
┌──────────────────────────── Navegador do advogado (PC) ────────────────────────────┐
│                                                                                    │
│  Telas (Next.js/React)  ──▶  Núcleo (src/lib)  ──▶  IndexedDB "nao-esquece-adv"   │
│                               │                                                    │
│                               ├─ monitor.ts   agendador (1h) + trava entre abas    │
│                               ├─ sources.ts   conectores das fontes                │
│                               ├─ extract.ts   extração de dados do texto           │
│                               ├─ deadline.ts  cálculo de prazos                    │
│                               ├─ backup.ts    criar / exportar / importar          │
│                               └─ export.ts    PDF, Excel, CSV                      │
└───────────────────────────────┬────────────────────────────────────────────────────┘
                                │ HTTPS (só os termos pesquisados)
          ┌─────────────────────┼─────────────────────────┐
          ▼                     ▼                         ▼
   DJEN / PNCP          conector-local (opcional)   GitHub Pages
   (direto)             127.0.0.1:8787 ──▶ DataJud, (só entrega os
                                          Querido Diário  arquivos do app)
```

- **Sem servidor de dados.** O GitHub Pages apenas entrega os arquivos estáticos do app. Tudo o que o usuário cadastra ou recebe fica no IndexedDB do navegador.
- **Exportação estática** (`output: 'export'`): o app pode ser servido de qualquer hospedagem estática, pendrive ou intranet.
- **PWA**: `public/sw.js` guarda os arquivos em cache para abrir sem internet; `manifest.webmanifest` permite instalar.

## Banco local (IndexedDB)

| Tabela | Conteúdo |
|---|---|
| `users` | Perfil local do advogado (nome, CPF, OAB, foto, logomarca). Sem login |
| `terms` | Processos, partes, CPF/CNPJ e termos monitorados |
| `publications` | Publicações encontradas, com prazo, leitura, favorito e anotação |
| `workspace` | Consultas salvas, painéis personalizados e processos fixados |
| `notifications` | Central de notificações |
| `runs` | Log de cada pesquisa feita nas fontes |
| `audit` | Auditoria (perfil, alterações, exportações, backups) |
| `plans` | Legado (vazia). O app é gratuito e completo, sem planos |
| `settings` | Configurações (monitoramento, notificações, pasta do Sobre…) |
| `files` | Arquivos da página Sobre carregados de uma pasta |
| `snapshots` | Pontos de restauração |

## Monitoramento

`startScheduler` verifica a cada minuto se já passou o intervalo configurado desde a última busca do usuário. Se sim, e se houver internet, executa `runMonitor` dentro de uma trava `navigator.locks` para que só uma aba faça a busca. Cada consulta gera um registro em `runs`. Publicações novas são gravadas com id estável (`<usuário>:<fonte>:<id na fonte>`), o que evita duplicatas.

**Limite conhecido:** a busca automática roda enquanto o app estiver aberto (em aba ou instalado). Navegadores não permitem que páginas fechadas executem tarefas periódicas de forma confiável. Ao abrir o app, se a última busca tiver mais de 1 hora, ela roda em seguida.

## Decisão: pedido original × arquitetura atual

O pedido 01 previa NestJS + PostgreSQL + Redis + JWT + S3. O pedido 05 determinou que **todas as informações ficassem offline no PC**. Com isso:

| Pedido original | Hoje | Motivo |
|---|---|---|
| PostgreSQL | IndexedDB | Dados ficam no PC |
| Redis | Não necessário | Sem servidor; cache feito pelo Service Worker |
| JWT | Sem login | Dados só no PC; perfil único local |
| AWS S3 | Imagens como data URL no IndexedDB | Sem armazenamento remoto |
| NestJS cron | Agendador no navegador | Sem servidor |

Se no futuro for necessário sincronizar vários computadores de um escritório, basta adicionar uma API (ex.: NestJS) e um adaptador de sincronização; o núcleo (`extract`, `deadline`, `sources`) é TypeScript puro e pode rodar no servidor sem mudanças.
