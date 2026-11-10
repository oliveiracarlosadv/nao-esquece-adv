# Manual do usuário — NÃO ESQUECE ADV

## 1. Primeiro acesso (sem login)

1. Abra o app: https://oliveiracarlosadv.github.io/nao-esquece-adv/ e clique em **Começar agora**.
2. Leia o aviso: **as informações ficam salvas nos arquivos do navegador deste computador** e **recomenda-se fazer backup mensal**. Marque “Li e entendi”.
3. Informe seu **nome completo, CPF e número da OAB/UF**: são as palavras-chave das buscas automáticas. Telefone, e-mail, foto e logomarca são opcionais.
4. Pronto: o app abre direto no Painel. Não há e-mail e senha para entrar.

Já usa o app em outro computador? Na tela do aviso, clique em **Restaurar um backup**.

> Quer só conhecer? Use **Ver demonstração**. A conta de demonstração tem dados fictícios e **não** faz buscas reais.

**Dica:** clique em **Salvar na área de trabalho** (topo da tela) para instalar o app como atalho no computador ou no celular. Ele abre como um programa e continua monitorando enquanto estiver aberto. Em Chrome, Edge e Android a instalação abre direto; no iPhone e no Safari do Mac o app mostra o passo a passo.
- **Chrome/Edge (Mac ou Windows):** ícone de instalar na barra de endereço, ou menu ⋮ → Transmitir, salvar e compartilhar → Instalar página como app.
- **Safari no Mac:** menu Arquivo → Adicionar ao Dock.

> **Atenção (Safari):** o app adicionado ao Dock pelo Safari tem um armazenamento **separado** do Safari comum. Contas e dados criados numa janela do Safari não aparecem no app do Dock (e vice-versa). Se já tiver dados, exporte um backup e importe dentro do app do Dock. No Chrome/Edge, o app instalado compartilha os dados com o navegador.

## 2. Monitoramento

As **palavras-chave** são o seu **nome completo, CPF e número da OAB** (aba **Palavras-chave**; altere em Meu perfil). Também é possível adicionar, de forma opcional:

| Tipo | Exemplo | Onde é pesquisado |
|---|---|---|
| Número de processo | 0801234-56.2025.8.14.0301 | DJEN e DataJud (andamentos) |
| Nome de parte | Construtora Amazônia Ltda | DJEN, diários municipais, PNCP |
| CPF / CNPJ | 000.000.000-00 | Diários municipais, PNCP |
| Termo de licitação | serviços advocatícios | PNCP |
| Termo livre | qualquer expressão | Diários municipais |

Aba **Diários oficiais**: os diários estaduais, do DF e da União não têm API pública. Escolha a palavra-chave (nome, CPF ou OAB), clique em **Pesquisar** e o app abre o site oficial com a palavra já copiada (cole com Ctrl/⌘+V). No Diário Oficial da União, a busca já abre pronta. Todos os estados vêm marcados por padrão; desmarque os que não quiser.

Aba **Configurações**: frequência (padrão: 1 hora), dias da primeira busca, feriados locais e conector local.
Aba **Fontes consultadas**: liga/desliga cada fonte e mostra o resultado da última consulta.
Aba **Histórico de buscas**: tudo o que foi pesquisado, quando e com que resultado.

O botão **Buscar agora** força uma busca imediata.

## 3. Painel e Intimações lidas

**Rotina de leitura:** o **Painel** mostra só o que ainda **não foi lido**. Ao abrir uma publicação (ou marcá-la como lida), ela **sai do Painel** e passa a ficar em **Intimações lidas** (menu lateral). Para devolvê-la ao Painel, use **Marcar como não lida**. As duas listas têm os mesmos filtros, busca e exportação; a troca entre elas fica no topo da tabela (“Não lidas · Lidas”).


- **Contadores**: não lidas, prazos que vencem em até 3 dias úteis, novas hoje e total.
- **Tabela**: Status (lida/não lida) · Data (publicação e disponibilização) · Processo · Partes · Tribunal/Vara · Comarca · Fim do prazo · Tipo · Origem · Ações.
- **Feriados**: o cálculo considera feriados nacionais, a suspensão de 20/12 a 20/01 e os feriados locais cadastrados. **Consulte sempre os feriados nacionais, estaduais e municipais e as suspensões do tribunal.**
- **Cores do prazo**: vermelho (até 2 dias úteis), amarelo (até 5), verde (mais de 5), riscado (vencido). “Presumido” = o texto não trazia o prazo; confira.
- **Ações por linha**: 👁 visualizar · ✓ marcar como lida (vai para Lidas) / não lida (volta ao Painel) · ★ favoritar · PDF exportar em PDF.
- **Marcar todas como lidas**: botão ao lado do total de resultados (vale para tudo o que está na tela, respeitando filtros e busca). Em Intimações lidas, “Marcar todas como não lidas”.
- **No celular**: cada item mostra sempre a linha “Prazo para manifestação”, com a data final e os dias úteis restantes.
- **Seleção em lote**: marque várias linhas e use “Marcar como lida” (no Painel), “Marcar como não lida” (em Lidas) ou “Exportar”.
- **Filtros**: processo, parte, tribunal, vara, comarca, datas, lidas/não lidas, tipo, origem e favoritas.
- **Busca global** (topo): digite e escolha onde buscar (tudo, partes, processo, advogado, OAB).

Ao abrir uma publicação, ela é marcada como lida. No detalhe você pode **ajustar o prazo** (dias úteis ou corridos), copiar o texto, abrir na fonte, fixar o processo e escrever uma anotação interna.

## 3.1 Exportar em PDF e compartilhar

- **Exportar em PDF**: em toda publicação aberta (no topo) e como ícone em cada linha da lista. Gera o documento completo — seus dados (nome, OAB, telefone, e-mail e logomarca), processo, partes, tribunal, vara, comarca, **data da intimação, da publicação, início e fim do prazo** e **inteiro teor** — e oferece **Salvar PDF** ou **Compartilhar** (WhatsApp, e-mail, Mensagens, AirDrop e outros apps). O CPF não vai no PDF. [Exemplo](exemplos/pdf-da-intimacao-exemplo.pdf).
- **O app**: no menu, “Compartilhar o app” envia um convite com o link para outros advogados.

## 4. Exportar

Padrão do texto exportado: **Times New Roman 12, justificado, entrelinhas 1,5** (PDF e Excel). O CSV é texto puro.


**Exportar** abre três opções de escopo: resultado atual do painel, itens selecionados ou filtros próprios de exportação (vara, processo, tribunal, período, apenas lidos/não lidos). Formatos: **PDF**, **Excel** e **CSV**. O PDF usa a sua logomarca (PNG/JPG) ou a padrão do escritório.

## 5. Meus painéis

Use **Salvar consulta** no painel para guardar os filtros atuais como:
- **Consulta salva** — um atalho para reabrir aquela pesquisa;
- **Painel personalizado** — um cartão com o total e as não lidas daquele recorte.

Também ficam aqui os **processos fixados** e as **publicações salvas** (estrela).

## 6. Notificações

**Para que serve:** é o **histórico de avisos**. Toda vez que a busca automática (de hora em hora) encontra uma intimação, citação, publicação, prazo ou licitação **nova**, o app cria um aviso aqui e acende o ponto laranja no sino do topo. Clicar no aviso abre a publicação. O lugar de ler e controlar as publicações continua sendo o Painel; a tela de Notificações só avisa que chegou algo novo e define **como** você quer ser avisado:


- **No sistema**: sino no topo e menu Notificações.
- **Push**: clique em “Permitir notificações” para receber avisos do computador.
- **E-mail**: abre o seu programa de e-mail com o resumo pronto.
- **WhatsApp**: link com o resumo pronto (envio automático: integração futura).
- Escolha quais avisos receber: intimações, publicações, prazos e licitações.

## 7. Backup

Veja [BACKUP.md](BACKUP.md). Resumo: **exporte um backup todo mês** (o app avisa quando passar de 30 dias) e guarde o arquivo em local seguro. Se o navegador for limpo, os dados somem.

## 8. Perfil

Altere nome completo, CPF, OAB (as palavras-chave), telefone, e-mail, foto e logomarca.

## 9. Administração (somente administradores)

Logomarcas · Bases e APIs · Logs de pesquisas · Auditoria · Relatórios · Página Sobre (escolha da pasta de conteúdo).

## 10. Como funciona e Termos de uso

Menu **Como funciona**: explicação passo a passo e aviso de responsabilidade. **Termos de uso**: rodapé do menu e da página inicial ([texto completo](TERMOS-DE-USO.md)). O aceite é obrigatório na primeira abertura e a cada nova versão dos termos.
