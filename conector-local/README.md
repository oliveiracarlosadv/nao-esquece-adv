# Conector local (opcional)

Algumas fontes públicas (DataJud, Querido Diário) não aceitam chamadas feitas direto do navegador. Este programa roda **somente no seu computador** e faz a ponte.

```bash
node conector-local/server.mjs
```

- Endereço padrão: `http://127.0.0.1:8787` (mude a porta com `PORT=9000`).
- Requer Node.js 18+. Nenhuma dependência.
- Só repassa para domínios oficiais em lista fechada; não grava nada.
- No app: **Monitoramento → Configurações → Endereço do conector → Testar conexão**.

Para deixá-lo sempre ligado no Windows, crie um atalho na pasta Inicializar com `node caminho\conector-local\server.mjs`. No Mac, use um item de início de sessão com o mesmo comando.
