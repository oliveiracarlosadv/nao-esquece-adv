# Segurança e LGPD

## Princípio: dados no computador do titular

Todas as informações (contas, clientes, processos, publicações, anotações) ficam no **IndexedDB do navegador** do próprio usuário. Não há banco de dados central, portanto não há transferência de dados pessoais para terceiros operados pelo NÃO ESQUECE ADV.

O que sai do computador:
- Os **termos pesquisados** (nome, OAB, CPF, partes, processos) vão para as **fontes públicas oficiais**, como numa consulta manual.
- Se o usuário usar e-mail ou WhatsApp, o texto é entregue ao programa escolhido por ele.

## Controles implementados

| Requisito | Como foi atendido |
|---|---|
| Criptografia de senhas | PBKDF2-SHA256, 210.000 iterações, sal aleatório por usuário |
| Criptografia de backups | AES-256-GCM com chave derivada de senha (opcional) |
| Autenticação em dois fatores | TOTP (Google Authenticator, Microsoft Authenticator etc.) |
| Controle de acesso por perfil | Administrador × Advogado; telas administrativas bloqueadas |
| Sessão | Expira em 12 horas |
| Logs de auditoria | Login, falhas de login, cadastro, alterações de perfil e senha, 2FA, termos, prazos manuais, exportações, backups, ações administrativas |
| Logs de pesquisa | Cada consulta às fontes, com horário, termo, resultado e erro |
| Consentimento | Aceite explícito no cadastro (LGPD, art. 7º) |
| Minimização | Só os termos necessários são enviados às fontes |
| Portabilidade e eliminação | Exportar backup / apagar dados do navegador |
| Conector local | Escuta só em 127.0.0.1 e só repassa para domínios oficiais |
| Conteúdo da página Sobre | HTML higienizado (remove scripts e eventos) |
| Dependências | `npm audit` sem vulnerabilidades em 09/11/2026 |

## Riscos e recomendações

- **Quem tem acesso ao computador tem acesso aos dados.** Use senha no usuário do sistema operacional e criptografia de disco (FileVault no Mac, BitLocker no Windows).
- **Limpeza do navegador apaga os dados.** Use “Proteger dados” na tela Backup e exporte backups com frequência.
- **Backups sem senha são legíveis.** Para guardar em nuvem ou pendrive, prefira backup com senha.
- As contas são locais: a senha protege o acesso pelo app, mas não criptografa o banco do navegador. Para sigilo forte, combine com a criptografia de disco.
