# Pedido 01 — Criação do WebApp "NÃO ESQUECE ADV"

**Data:** 09/11/2026
**Solicitante:** Carlos Alexandre Albuquerque Oliveira

## Instruções adicionais do solicitante

- Fazer **sempre** um backup em Markdown, nesta pasta, de tudo o que for pedido.
- Criar um **logo**.
- O app tem que ser **moderno, intuitivo e em tom minimalista**, para fácil leitura.

---

## Pedido original (texto integral)

Crie um WebApp SaaS responsivo chamado "NÃO ESQUECE ADV", destinado ao monitoramento automático de publicações jurídicas, intimações, notificações, menções processuais e publicações em licitações públicas.

### OBJETIVO
Desenvolver uma plataforma semelhante ao Advise Hub, porém com identidade própria, interface moderna, rápida e intuitiva, voltada para advogados, escritórios de advocacia e departamentos jurídicos.

### FUNCIONALIDADES PRINCIPAIS

#### 1. CADASTRO DO ADVOGADO
- Tela de cadastro/login.
- Nome completo.
- CPF.
- Número da OAB.
- Estado da OAB.
- E-mail.
- Telefone.
- Upload de logomarca.
- Foto de perfil.
- Alteração de senha.
- Plano de assinatura.

#### 2. MOTOR DE MONITORAMENTO AUTOMÁTICO
O sistema deverá realizar buscas automáticas a cada 1 hora.

Pesquisar utilizando:
- Nome do advogado.
- CPF.
- Número da OAB.
- Nome de partes cadastradas.
- Número de processos cadastrados.

Consultar automaticamente bases públicas e APIs oficiais disponíveis da Justiça e da Administração Pública.

Consultar:
- Diário de Justiça Eletrônico.
- Tribunais Estaduais.
- Tribunais Federais.
- Tribunais Superiores.
- Justiça do Trabalho.
- Justiça Eleitoral.
- Justiça Militar.
- Conselho Nacional de Justiça.
- Diários Oficiais Estaduais.
- Diários Oficiais Municipais.
- Diário Oficial do Distrito Federal.
- Diário Oficial da União.
- Portais de Licitações.
- Compras Governamentais.
- APIs públicas governamentais.
- Portais de transparência.
- Sistemas públicos de consulta processual permitidos pela legislação.

O sistema deverá identificar:
- Intimações.
- Notificações.
- Citações.
- Andamentos processuais.
- Menções ao advogado.
- Menções ao CPF.
- Menções ao número da OAB.
- Novas publicações.
- Publicações em licitações.
- Avisos públicos relevantes.

#### 3. PROCESSAMENTO INTELIGENTE
Após localizar uma publicação, o sistema deverá:
- Extrair dados automaticamente.
- Identificar prazos.
- Identificar número do processo.
- Identificar partes.
- Identificar comarca.
- Identificar vara.
- Identificar tribunal.
- Identificar órgão emissor.
- Calcular automaticamente o fim do prazo processual quando possível.
- Classificar a publicação por categoria.

#### 4. DASHBOARD PRINCIPAL
Tabela principal contendo:
- COLUNA 1: Lido / Não Lido
- COLUNA 2: Data (Data da publicação / Data da disponibilização)
- COLUNA 3: Número do Processo
- COLUNA 4: Partes
- COLUNA 5: Tribunal / Vara
- COLUNA 6: Comarca
- COLUNA 7: Fim do Prazo Automático
- COLUNA 8: Tipo de Publicação
- COLUNA 9: Origem
- COLUNA 10: Ações

Botões:
- Visualizar
- Marcar como lido
- Marcar como não lido
- Salvar
- Exportar
- Compartilhar

#### 5. FILTROS DE PESQUISA
Permitir filtros por:
- Número do processo
- Nome da parte
- Tribunal
- Vara
- Comarca
- Data inicial
- Data final
- Publicações lidas
- Publicações não lidas
- Tipo de publicação
- Origem da publicação

Campo de busca global com lupa:
- Buscar por partes
- Buscar por processo
- Buscar por advogado
- Buscar por OAB

#### 6. EXPORTAÇÃO
Permitir exportação para:
- PDF
- Excel
- CSV

Filtros de exportação:
- Por Vara
- Por Processo
- Por Data
- Por Tribunal
- Por Período
- Apenas lidos
- Apenas não lidos

#### 7. CENTRAL DE NOTIFICAÇÕES
Disparar:
- Notificações dentro do sistema
- E-mail
- Push notification
- WhatsApp (integração futura)

Sempre que houver:
- Nova intimação
- Nova publicação
- Novo prazo
- Nova licitação relacionada

#### 8. ÁREA DE TRABALHO
Botão: "SALVAR NA ÁREA DE TRABALHO"

Função:
- Salvar consultas.
- Salvar filtros.
- Salvar publicações favoritas.
- Criar painéis personalizados.
- Fixar processos importantes.

#### 9. PÁGINA SOBRE
Página institucional "Sobre o NÃO ESQUECE ADV".

As informações deverão ser carregadas automaticamente a partir de arquivos armazenados em uma pasta configurada no sistema administrativo.

#### 10. PAINEL ADMINISTRATIVO
Gerenciar:
- Usuários.
- Assinaturas.
- Planos.
- Logomarcas.
- Bases monitoradas.
- APIs conectadas.
- Logs de pesquisas.
- Histórico de consultas.
- Relatórios.

#### 11. TECNOLOGIA
- Frontend: Next.js, React, TypeScript, TailwindCSS
- Backend: Node.js, NestJS
- Banco de Dados: PostgreSQL
- Cache: Redis
- Autenticação: JWT
- Armazenamento: AWS S3 ou compatível

#### 12. UX/UI
- Visual moderno e profissional.
- Tema claro e escuro.
- Layout responsivo.
- Compatível com: Desktop, Tablet, Smartphone.

#### 13. SEGURANÇA
- LGPD.
- Criptografia de dados.
- Controle de acesso por perfil.
- Logs de auditoria.
- Autenticação em dois fatores.

#### 14. NOME DO SISTEMA
NÃO ESQUECE ADV

Slogan: "Nenhuma intimação passa despercebida."

#### 15. REQUISITO ESSENCIAL
O sistema deverá executar monitoramento automático contínuo a cada 1 hora, consolidando os resultados encontrados em todas as fontes públicas monitoradas e apresentando-os em um único painel centralizado com controle de leitura, pesquisa avançada e exportação das informações.
