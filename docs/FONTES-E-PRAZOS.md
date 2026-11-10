# Fontes consultadas e cálculo de prazos

## Fontes

### DJEN — Diário de Justiça Eletrônico Nacional (CNJ) ✅
- API: `https://comunicaapi.pje.jus.br/api/v1/comunicacao`
- Pesquisa por: `numeroOab` + `ufOab`, `nomeAdvogado`, `nomeParte`, `numeroProcesso`, com período de disponibilização.
- Cobre os tribunais integrados à Plataforma de Comunicações Processuais: Justiça Estadual, Federal, do Trabalho, Eleitoral, Militar e tribunais superiores integrados.
- Aceita chamadas diretas do navegador. Testado em 09/11/2026 com dados reais.
- O app faz pausas entre as chamadas para respeitar o limite de requisições.

### PNCP — Portal Nacional de Contratações Públicas ✅
- API de busca: `https://pncp.gov.br/api/search/?q=…&tipos_documento=edital`
- Pesquisa editais pelos termos de licitação, partes e CNPJ cadastrados.
- Aceita chamadas diretas do navegador. Testado em 09/11/2026.

### DataJud — API pública do CNJ ⚙️
- `https://api-publica.datajud.cnj.jus.br/api_publica_<tribunal>/_search`
- Traz os **andamentos** dos processos cadastrados. O tribunal é descoberto pelo número CNJ (segmentos J e TR).
- Usa a chave pública divulgada pelo CNJ (editável em Monitoramento → Configurações).
- Não envia cabeçalhos CORS: **precisa do conector local**.
- ⚠️ Em 09/11/2026 a API não respondeu a partir do computador de desenvolvimento (tempo esgotado). O conector foi testado, mas a resposta do DataJud ainda precisa ser confirmada.

### Querido Diário — diários oficiais municipais ⚙️
- `https://api.queridodiario.ok.org.br/gazettes`
- Busca textual (nome, OAB, CPF, partes, termos) em diários municipais.
- ⚠️ Bloqueado no navegador nos testes e sem resposta em 09/11/2026. Use o conector local e confira o histórico de buscas.

### Diários Oficiais Estaduais, do DF e da União 🔎 (busca assistida)
- Não existe API nacional; os sites estaduais (inclusive o de SP, conferido em 10/11/2026) não têm busca automatizada aberta.
- O app lista os 26 estados + DF (endereços conferidos em 10/11/2026; MS não respondeu no teste) e o DOU. Em **Monitoramento → Diários oficiais**, o usuário escolhe a palavra-chave (nome, CPF ou OAB) e clica em Pesquisar: o site oficial abre com a palavra copiada. No DOU, a busca abre pronta pelo endereço.
- Lista em `apps/web/src/lib/diarios-estaduais.ts`.

## Palavras-chave

As buscas usam o **nome completo**, o **CPF** e o **número da OAB/UF** do advogado:

| Fonte | Nome | CPF | OAB |
|---|---|---|---|
| DJEN | ✅ (`nomeAdvogado`) | — (a API não permite) | ✅ (`numeroOab` + `ufOab`) |
| Diários municipais | ✅ | ✅ com e sem pontuação | ✅ variações: `OAB/PA 12345`, `OAB/PA 12.345`, `OAB/PA nº 12345`, `OAB-PA 12345`, `12345/PA`… |
| Diários estaduais/DOU | ✅ busca assistida | ✅ busca assistida | ✅ busca assistida |

## Conector local

```bash
node conector-local/server.mjs          # porta 8787
PORT=9000 node conector-local/server.mjs
```

- Escuta só em `127.0.0.1` (não fica acessível na rede).
- Repassa somente para domínios oficiais em lista fechada (`ALLOWED` no código).
- Não grava nada. Mostra no terminal cada consulta feita.
- No app: Monitoramento → Configurações → Endereço do conector → **Testar conexão**.

## Extração automática

`apps/web/src/lib/extract.ts`:
- **Número do processo**: padrão CNJ `NNNNNNN-DD.AAAA.J.TR.OOOO`.
- **Partes**: destinatários informados pela fonte ou rótulos no texto (Autor, Réu, Requerente, Reclamante, Apelante, Impetrante…).
- **Comarca**: “Comarca de …”.
- **Vara / órgão**: “Nª Vara…”, “Juizado…”, “Turma…”, “Câmara…”, ou o órgão informado pela fonte.
- **Prazo**: “prazo de 15 (quinze) dias”, “no prazo de cinco dias”, “em 48 horas”, “dias corridos”.
- **Categoria**: Citação, Intimação, Notificação, Sentença, Decisão, Despacho, Acórdão, Pauta, Edital, Licitação, Andamento, Aviso público, Menção.

## Cálculo do prazo

`apps/web/src/lib/deadline.ts`:

1. **Publicação** = primeiro dia útil seguinte à disponibilização (Lei 11.419/2006, art. 4º, §3º).
2. **Início** = primeiro dia útil seguinte à publicação (art. 4º, §4º; CPC, art. 224).
3. Contagem em **dias úteis** (CPC, art. 219). Opcional: dias corridos.
4. **Não contam**: sábados, domingos, feriados nacionais (1/1, 21/4, 1/5, 7/9, 12/10, 2/11, 15/11, 20/11, 25/12), Carnaval (segunda e terça), Sexta-feira Santa, Corpus Christi, feriados locais cadastrados e o período de **20/12 a 20/01** (CPC, art. 220).
5. Sem prazo no texto → **prazo presumido**: 5 dias para intimação, notificação, decisão e despacho (CPC, art. 218, §3º); 15 dias para citação, sentença e acórdão. Sempre sinalizado como “presumido”.

O prazo pode ser ajustado manualmente em cada publicação.

### Exemplo (coberto por teste automático)
Disponibilizado em seg 09/11/2026 → publicado ter 10/11 → início qua 11/11 → 15 dias úteis (pulando o feriado de 20/11) → **fim em 02/12/2026**.

### Aviso

**Consulte sempre os feriados nacionais, estaduais e municipais e as suspensões de expediente do tribunal.** O app avisa isso junto de cada prazo e no PDF.

### Limitações
- Não considera automaticamente feriados estaduais/municipais nem suspensões por portaria do tribunal: cadastre-os em “Feriados locais”.
- Prazos em dobro (Fazenda Pública, Defensoria, litisconsortes com procuradores diferentes) e prazos penais devem ser ajustados manualmente.
