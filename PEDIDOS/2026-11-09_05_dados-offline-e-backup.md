# Pedido 05 — Dados offline no navegador + backup

**Data:** 09/11/2026

## Texto integral

> as informações salvas, tudo ficará offline no pc, salvo nos arquivos do navegador. crie a opção de criar, exportar e importar backup

## Como foi atendido

- Todos os dados (perfil, processos, partes, publicações, área de trabalho, notificações, configurações) ficam no **IndexedDB do navegador**, no próprio PC. Nenhum servidor guarda dados.
- Tela **Backup** com: criar ponto de restauração (dentro do navegador), exportar arquivo `.json` (opcionalmente criptografado com senha) e importar backup.
- A arquitetura com servidor (NestJS/PostgreSQL/Redis) do pedido 01 foi substituída por essa arquitetura local. As buscas nas fontes públicas continuam feitas pela internet, a partir do próprio navegador.
