# Publicação

## GitHub Pages (automático)

A cada `git push` na branch `main`, o workflow [`.github/workflows/pages.yml`](../.github/workflows/pages.yml):
1. instala as dependências (`npm ci`);
2. roda os testes de prazo e extração;
3. gera o site estático com `NEXT_PUBLIC_BASE_PATH=/nao-esquece-adv`;
4. publica `apps/web/out` no GitHub Pages.

Endereço: https://oliveiracarlosadv.github.io/nao-esquece-adv/

Para ativar em um repositório novo: **Settings → Pages → Source: GitHub Actions**.

## Domínio próprio

Para usar, por exemplo, `app.naoesqueceadv.com.br`:
1. Crie um registro CNAME no DNS apontando para `oliveiracarlosadv.github.io`.
2. Em Settings → Pages, informe o domínio.
3. No workflow, troque `NEXT_PUBLIC_BASE_PATH` para vazio (`''`).

## Outra hospedagem

`npm run build` gera `apps/web/out/`, que pode ser copiada para qualquer hospedagem estática (Netlify, Vercel, Cloudflare Pages, servidor do escritório, intranet).

> Atenção: os dados ficam no navegador **por endereço**. Mudar o endereço do app (ex.: de github.io para domínio próprio) faz o navegador tratá-lo como outro site. Exporte um backup antes e importe no novo endereço.
