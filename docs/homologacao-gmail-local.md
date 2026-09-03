# Gmail → API local: validação controlada

Este roteiro envia somente o anexo sintético já conferido para um ambiente local descartável e permite conferir os valores no React. Não é produção.

**Execução verificada em 26/08/2026:** autenticação Gmail e leitura do anexo aprovadas; primeiro envio à API retornou `processed`, segundo envio retornou `skipped`; consulta autenticada confirmou Jan/Y26, target 0.04, result 0.05 e achievement 0.8. A mensagem foi preservada. Os serviços foram mantidos ativos para a próxima etapa.

## Preparação

Manter Gmail de teste e senha de app no `.env`, sem compartilhar o conteúdo. Executar na raiz:

```powershell
.\.venv\Scripts\python.exe scripts/prepare_homologation.py
docker compose -f docker-compose.homologacao.yml up --build -d --wait
```

A preparação cria `.env.homologacao` com senha aleatória para uma conta ADMIN exclusiva e segredo JWT próprio; preserva o arquivo se já existe. Essas credenciais são diferentes das do Gmail. Não executar `docker compose config` sem `--quiet`, pois pode revelar segredos expandidos.

A API está em `http://127.0.0.1:15001`, somente neste computador. O banco não publica porta, usa tmpfs e não compartilha volumes com o projeto original. As migrations e o seed restrito à homologação são executados antes da API iniciar.

## Ler e enviar o relatório de teste

Requisitos da mensagem na INBOX: assunto exato `Relatorio Logistico - TESTE EPICO 7`, um anexo chamado `logistic_cost.xlsx`, uma linha Jan/Y26 com target 0.04, result 0.05 e achievement 0.8.

```powershell
.\.venv\Scripts\python.exe scripts/validate_gmail_test.py --ingest-local
```

O script consulta apenas candidatos ao assunto, seleciona o mais recente com assunto exato, mantém a mensagem sem alteração, limita o download a 5 MB e confere o anexo antes de enviar. O destino é fixo: API local acima, com health identificando `homologacao-local`. O envio usa `ApiReportSender` do robô e o contrato real de ingestão. Faz um segundo envio do mesmo Message-ID, exige `skipped` e consulta os valores pela API.

O comando sem `--ingest-local` continua sem enviar nada à API/banco.

Essa execução controlada reutiliza o extrator e cliente de ingestão, mas não executa o loop completo nem o histórico de `python -m rpa_email`. O serviço completo foi testado separadamente no Docker com mensagem/IMAP sintéticos. A conferência no React abaixo completa o cenário controlado Gmail → API → interface, mas não comprova o ciclo automático completo do robô.

## React no ambiente de homologação

Com a API local ainda ligada, executar em outro terminal:

```powershell
cd dashboard
npm.cmd run dev:homologacao
```

Abrir `http://127.0.0.1:15173`. O proxy desse modo aponta exclusivamente para `127.0.0.1:15001`, sem alterar o destino padrão de desenvolvimento. Usar a conta/senha de `.env.homologacao` na tela de login (não as credenciais Gmail).

Esse modo inicia sem dados demonstrativos, aceita listas vazias da API e mostra erro quando o carregamento falha. Janeiro é selecionado inicialmente. Os dados fixos de agrupamentos e outros indicadores não são usados; agrupamentos completos seguem pendentes. Injeção de erros demonstrativos fica sem efeito e restaurar dados recarrega a API. Insights fixos dos gráficos são omitidos.

Verificação técnica: 11 testes JavaScript aprovados e build normal aprovado com aviso de tamanho do bundle.

### Conferência autenticada no navegador — 26/08/2026

- Login local com a conta de homologação aprovado.
- Janeiro/2026: cartão e matriz War Room exibiram resultado **5.00%**, meta **4.00%** e atingimento **80%**, correspondentes ao anexo e à consulta da API.
- Fevereiro/2026: cartão e matriz sem valores (`—`), sem substituir a ausência por dados demonstrativos.
- Retorno a janeiro e botão Recarregar: os mesmos valores foram confirmados novamente, com origem `API` no rodapé.
- Nenhum erro retornado na consulta aos logs de erro do navegador durante essa conferência.

Limites: verificação interativa de um cenário mensal sintético, não uma suíte automatizada de navegador nem homologação com usuários. Ficou identificado um ajuste de texto: a matriz chama Jan/25 de “Mês passado” ao compará-lo com Jan/26; o rótulo deve indicar o mesmo mês do ano anterior. Agrupamentos, demais indicadores, ciclo automático do robô e produção continuam pendentes.

## Serviço completo e histórico local

Para repetir o teste restrito ao assunto e anexo sintéticos, com Gmail e homologação ativos:

```powershell
.\.venv\Scripts\python.exe scripts/validate_full_gmail_bot.py
```

Em 26/08/2026, a primeira execução encontrou e processou uma mensagem sem erros. A segunda execução, usando o mesmo histórico SQLite, encontrou uma duplicata e realizou zero processamentos. O registro local ficou `PROCESSADO` com um anexo, a API manteve os valores esperados e a mensagem permaneceu inalterada. Esse teste usa o `EmailProcessingService` completo manualmente; o schedule do BotCity permanece pendente.

## Permissões locais

`scripts/prepare_homologation.py` também prepara `HOMOLOGATION_VIEWER_EMAIL` e `HOMOLOGATION_VIEWER_PASSWORD` sem exibi-los. Após subir novamente os contêineres, executar:

```powershell
.\.venv\Scripts\python.exe scripts\validate_local_permissions.py
```

O teste cria o VISUALIZADOR pela rota protegida usando o ADMIN, valida login e leitura dos KPIs e exige HTTP 403 nas rotas administrativas. Também exige HTTP 401 sem token, com token inválido e com senha incorreta. As contas são exclusivas do banco descartável de homologação.

## Parar o ambiente

Os serviços ficam ligados para a próxima etapa de conferência. Para encerrá-los:

```powershell
docker compose -f docker-compose.homologacao.yml down
```

Ao parar o PostgreSQL, os dados sintéticos são descartados. Em nova inicialização, repetir a ingestão; o seed recria a conta com as mesmas credenciais locais.

Em caso de falha após o envio, o resultado pode já ter sido persistido: repetir o mesmo e-mail mantém o Message-ID e permite confirmação pela API. Não alterar identificadores para contornar a deduplicação.

Não enviar senhas, tokens, `.env` ou `.env.homologacao` ao chat/Git. Não conectar usuários finais nem usar dados reais. A rota atual requer ADMIN; perfil de menor privilégio para o bot e homologação corporativa seguem pendentes.
