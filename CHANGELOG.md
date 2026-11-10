# Changelog — NÃO ESQUECE ADV

## [0.4.3] — 10/11/2026

Pedidos atendidos: 28 e 29.

### Alterado
- **Exportar em PDF em toda leitura:** botão em destaque no topo e no rodapé de toda publicação aberta (intimação, citação, sentença, notificação, despacho, decisão, acórdão…) e ícone em cada linha da lista, no computador e no celular. Abre **Salvar PDF** ou **Compartilhar** (WhatsApp, e-mail, Mensagens, AirDrop e outros apps).
- Removidos os botões “Compartilhar” (texto) e “PDF” da leitura e os ícones de compartilhar das linhas: fica somente **Exportar em PDF**.
- A estrela de favorita passou a se chamar “Favoritar” (antes “Salvar”), para não confundir com “Salvar PDF”.

## [0.4.2] — 10/11/2026

Pedidos atendidos: 25, 26 e 27.

### Alterado
- **Botão PDF** da intimação abre as opções **Salvar** ou **Compartilhar**.
- **PDF leve:** a logomarca é reduzida antes de entrar no PDF (um caso real tinha 3,7 MB).
- **Texto exportado em Times New Roman 12, justificado, entrelinhas 1,5:** PDF da intimação, PDF do relatório e Excel. CSV continua texto puro (o formato não aceita fonte nem alinhamento).
- **Aviso de feriados:** consulte os feriados nacionais, estaduais e municipais e as suspensões do tribunal — no detalhe da publicação, no PDF, na lista do celular, em Monitoramento → Configurações, em Como funciona, na primeira abertura e nos Termos de uso.
- Termos de uso atualizados para a versão 1.1 (inclui a consulta aos feriados); novo aceite pedido a todos.

## [0.4.1] — 10/11/2026

Pedido atendido: 24.

### Alterado
- **PDF da intimação:** o botão PDF da publicação aberta gera um documento completo daquela intimação — dados do advogado (nome, OAB, telefone, e-mail, logomarca), número do processo, tipo, tribunal, vara, comarca, partes, data da intimação (disponibilização), data da publicação, início e fim do prazo em destaque e inteiro teor completo (várias páginas, se preciso) — e abre o compartilhamento do aparelho com o arquivo. Sem suporte, baixa o PDF. O CPF do usuário não é incluído. Exemplo em `docs/exemplos/`.

## [0.4.0] — 10/11/2026

Pedidos atendidos: 18 a 23.

### Adicionado
- Botão **“Marcar todas como lidas”** no Painel (e “Marcar todas como não lidas” em Intimações lidas).
- **Imagens do app** no README do GitHub (`docs/imagens/`).
- **Compartilhar o app** fixo no menu, na página inicial e no cabeçalho público.
- Página **Como funciona** (menu e página inicial) com aviso de responsabilidade.
- **Termos de uso** (`/termos/` e `docs/TERMOS-DE-USO.md`): plena responsabilidade do usuário pelo gerenciamento de intimações e prazos; limitação de responsabilidade do criador. Aceite obrigatório na primeira abertura e para quem já usava o app; aceite registrado na auditoria.

### Alterado
- **Celular:** linha “Prazo para manifestação” sempre visível em cada item (ou “não identificado — confira”).
- **Compartilhar publicação:** envia o **teor completo em texto** (dados, prazo e inteiro teor) — não imagem nem PDF. O texto não é mais cortado.

## [0.3.2] — 10/11/2026

Pedido atendido: 16.

### Corrigido
- **Tela fixa e responsiva:** a página não rola mais para os lados no celular. O topo (busca, instalar, tema e sino) passava da tela; quadros com texto longo (Meus painéis) alargavam a coluna. Trava global contra rolagem lateral; tabelas largas rolam só dentro do próprio quadro. Verificado em 320, 375, 768 e 1280 px, em todas as telas.
- Ícone do botão “Salvar na área de trabalho” aparecia espremido no celular.

## [0.3.1] — 10/11/2026

Pedido atendido: 15.

### Alterado
- **Novo ícone:** verde-oliva pastel, sem o ramo de oliveira, apenas o dedo levantado com a fita (laço terracota). Estilo minimalista e moderno. Atualizados símbolo, logos horizontais, favicon, ícones do app (PWA), Dock do Mac e tela inicial; cor do app instalado (barra de título) em verde-oliva.

## [0.3.0] — 10/11/2026

Pedidos atendidos: 08 a 14.

### Alterado
- **“Salvar na área de trabalho” agora instala o app** como atalho (web app) no computador e no celular: instalação direta no Chrome/Edge/Android; passo a passo no iPhone/iPad e no Safari do Mac. Botão no topo de todas as telas e na página inicial.
- A antiga “Área de trabalho” (consultas, painéis, processos fixados, favoritos) passou a se chamar **Meus painéis**; o botão do painel virou **Salvar consulta**.
- **Novo ícone e logo:** mão com o indicador levantado e um laço no dedo sobre o ramo de oliveira. Recriados símbolo, logos horizontais, favicon, ícones do app (PWA), Dock do Mac e tela inicial.
- **Sem login:** removidos e-mail/senha, troca de senha, 2FA e “Sair”. Na primeira abertura, aviso de que os dados ficam nos arquivos do navegador e recomendação de **backup mensal**; lembrete automático quando o último backup passa de 30 dias.
- **Palavras-chave:** nome completo, CPF e número da OAB, em destaque no Monitoramento e usadas em todas as fontes possíveis (com variações de escrita nos diários).
- Clicar no número do processo abre a publicação e já a marca como lida (confirmado).

### Adicionado
- **Diários oficiais:** municipais automáticos (Querido Diário, via conector local) e **busca assistida** nos 26 estados, DF e DOU — **todos marcados por padrão**.
- Demonstração com botão “Começar de verdade”, que apaga os dados fictícios.

### Removido
- Aba “Usuários” da administração (perfil único).

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
