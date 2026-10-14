# Ferramentas auxiliares

Execute da raiz do clone, usando o ambiente Python correspondente. Os comandos
de instalação e operação estão no [guia de desenvolvimento](../docs/guides/development.md).

| Diretório | Finalidade | Execução |
| --- | --- | --- |
| `development/` | Geração das planilhas sintéticas e reset local | Comandos no guia de desenvolvimento |
| `homologation/` | Preparação de credenciais e validação controlada Gmail/API | Procedimento e limites no [histórico do Épico 7](../docs/history/epic-7-validation.md#procedimento-gmail-local-26082026) |
| `diagnostics/` | Consultas IMAP, pesquisa de mensagens e inspeção de download | Ferramentas manuais; leem `.env` e podem acessar a caixa real |
| `manual/` | Envio SMTP de mensagem com anexos | `send_test_email.py` envia mensagens; revisar destinatário e diretório local dos anexos antes de usar |

Use o modo de módulo para manter a raiz do clone no caminho de imports, por
exemplo:

```powershell
.\.venv\rpa\Scripts\python.exe -m scripts.diagnostics.quick_check
```

Esse comando consulta e-mails reais; não é um teste offline. Arquivos que antes
se chamavam `test_drive_ingestion.py`, `test_imap_queries.py` e `test_search.py`
são diagnósticos e agora usam nomes `inspect_drive_download.py`,
`inspect_imap_queries.py` e `search_subjects.py`, sem confundi-los com testes da CI.

Os validadores de homologação preservam as verificações e os destinos locais
existentes. Os que esperam aplicação imediata de KPIs precisam ser revalidados
com a fila atual; sua localização não significa aprovação dessa compatibilidade.
Os scripts de seed e migrations pertencem a `server/`, pois são responsabilidade
do backend. Não movê-los para esta árvore sem atualizar imagens e entrypoints.
