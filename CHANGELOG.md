# Changelog — NÃO ESQUECE ADV

## [0.2.0] — 09/11/2026

Pedidos atendidos: 06 e 07.

### Alterado
- **App gratuito e completo (versão full):** removidos planos de assinatura, preços e limites de processos/partes. Todos os recursos liberados no app publicado.
- **Rotina de leitura:** o Painel mostra só as publicações **não lidas**. Ao abrir (ler) uma intimação, ela sai do Painel e vai para a nova tela **Intimações lidas**. “Marcar como não lida” devolve ao Painel. Alternância “Não lidas · Lidas” no topo da tabela.
- Clicar em uma notificação agora abre a publicação correspondente.
- Busca global avisa quando há resultados na outra lista (lidas/não lidas).
- Service worker passa a buscar páginas, manifesto e ícones na rede primeiro (atualizações chegam ao app instalado).

### Adicionado
- Tela **Intimações lidas** (menu lateral).
- Explicação na tela **Notificações** (para que serve e como funciona).
- Ícones PNG (192, 512, maskable) e `apple-touch-icon` para o **Dock do Mac**, Windows e celular.

### Removido
- Aba “Planos” e colunas de plano/assinatura no painel administrativo; escolha de plano no cadastro e no perfil.

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
- WhatsApp automático: integração futura.
