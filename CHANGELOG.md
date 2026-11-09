# Changelog — NÃO ESQUECE ADV

## [0.1.0] — 09/11/2026

Primeira versão. Pedidos atendidos: 01 a 05 (ver [PEDIDOS/](PEDIDOS/README.md)).

### Adicionado
- Logomarca (símbolo e versões horizontais clara/escura) em `brand/`.
- Webapp Next.js estático, instalável (PWA), tema claro/escuro, responsivo.
- Cadastro e login locais, alteração de senha, 2FA (TOTP), perfis administrador/advogado.
- Monitoramento automático a cada 1 hora: DJEN (CNJ), PNCP, DataJud e Querido Diário (estes dois via conector local).
- Extração automática de processo, partes, tribunal, vara, comarca, órgão e categoria.
- Cálculo de prazo em dias úteis com feriados, recesso de 20/12 a 20/01 e feriados locais; prazo presumido sinalizado; ajuste manual.
- Painel com 10 colunas, contadores, filtros, busca global, seleção em lote.
- Exportação PDF, Excel e CSV com filtros próprios.
- Área de trabalho: consultas salvas, painéis personalizados, processos fixados, favoritos.
- Central de notificações: sistema, push, e-mail (mailto), WhatsApp (link).
- Backup: pontos de restauração, exportação com senha opcional (AES-256), importação mesclar/substituir.
- Painel administrativo: usuários, assinaturas, planos, logomarcas, fontes, logs, auditoria, relatórios, pasta da página Sobre.
- Página Sobre carregada automaticamente de `conteudo/sobre/` ou de pasta escolhida pelo administrador.
- Conector local (`conector-local/server.mjs`).
- Documentação em `docs/`, publicação automática no GitHub Pages.
- Script `scripts/backup.sh` para backup do código.

### Alterado
- Arquitetura com servidor (NestJS/PostgreSQL/Redis/S3) substituída por armazenamento local no navegador (pedido 05).

### Pendências conhecidas
- Confirmar resposta do DataJud e do Querido Diário via conector local (sem resposta nos testes de 09/11/2026).
- DOU (INLABS) e Diários Oficiais Estaduais: planejados.
- WhatsApp automático e cobrança de assinaturas: integrações futuras.
