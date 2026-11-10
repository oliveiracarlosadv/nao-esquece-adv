# Backup e restauração

Os dados do NÃO ESQUECE ADV ficam **somente no navegador deste computador**. **Recomenda-se backup mensal**: o app mostra um lembrete no topo quando o último backup exportado tem mais de 30 dias. Se o navegador for limpo, reinstalado ou o computador trocado, os dados só voltam com um backup.

## Tela Backup

| Ação | O que faz | Onde fica |
|---|---|---|
| **Criar ponto de restauração** | Cópia instantânea de tudo | Dentro do navegador (últimos 15) |
| **Exportar arquivo** | Baixa `nao-esquece-adv_backup_AAAA-MM-DD-HH-MM.json` | Onde você salvar (pendrive, nuvem) |
| **Exportar com senha** | Mesmo arquivo, criptografado (AES-256) | Idem; sem a senha não abre |
| **Importar** | Restaura um arquivo exportado | — |
| **Proteger dados** | Pede ao navegador para não apagar os dados automaticamente | — |

Ao importar você escolhe:
- **Mesclar** — junta com o que já existe (itens iguais são atualizados);
- **Substituir** — apaga tudo e usa só o arquivo.

Antes de importar ou restaurar, o app cria **automaticamente** um ponto de restauração.

## Trocar de computador

1. No computador antigo: Backup → Exportar arquivo.
2. No novo: abra o app → no aviso da primeira abertura, clique em **“Já usa o app em outro computador? Restaurar um backup”**.
3. Pronto: o app abre com todos os dados.

## O que vai no backup

Perfil, processos e partes monitorados, publicações (com leitura, favoritos, prazos e anotações), meus painéis, notificações, histórico de buscas, auditoria, configurações e arquivos da página Sobre. Pontos de restauração não entram no arquivo.

## Backup do código-fonte

O código do sistema também tem backup: `bash scripts/backup.sh` gera `BACKUPS/nao-esquece-adv_<data>.zip` (sem `node_modules`). Um backup é gerado a cada entrega.
