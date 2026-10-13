# Roteiro de execução e testes da aplicação

Fonte principal para instalar, executar e validar o DataLens. Os comandos
partem da raiz do seu clone no Windows/PowerShell, salvo indicação contrária.
O fluxo integrado é e-mail → RPA → FastAPI → aprovação → banco → React; o robô não gera
um Excel de saída nem escreve diretamente no banco de KPIs.

Execute as etapas na ordem. Se uma etapa falhar, corrija-a antes de avançar.

## 1. Pré-requisitos

Confirme as ferramentas:

```powershell
python --version
node --version
npm --version
docker --version
docker compose version
```

Use Python 3.12 e Node.js 22, como na CI. O Docker Desktop precisa estar
iniciado para as etapas de integração e execução em contêineres. Para executar
a aplicação sem Docker, consulte a alternativa local abaixo.

## 2. Preparar ambientes Python isolados

O RPA e a API possuem dependências próprias. Mantenha dois ambientes para não
misturar versões:

```powershell
python -m venv .venv\rpa
python -m venv .venv\api

.\.venv\rpa\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\api\Scripts\python.exe -m pip install -r server\requirements.txt
```

Resultado esperado: as duas instalações terminam sem `ERROR`.

## 3. Executar os testes automatizados

### RPA e extratores

```powershell
.\.venv\rpa\Scripts\python.exe -m pytest rpa_email\tests -q
```

Resultado esperado: todos os testes aprovados. A quantidade varia com a versão.

### Backend FastAPI

```powershell
.\.venv\api\Scripts\python.exe -m pytest server\tests -q
```

Resultado esperado: todos aprovados, sem `failed` ou `error`.

### Frontend React

```powershell
Set-Location dashboard
npm ci
npm test
npm run lint
npm run build
Set-Location ..
```

Resultado esperado: testes e lint sem erros, e a pasta `dashboard/dist` criada.

## 4. Executar a integração isolada

Esse ambiente usa PostgreSQL temporário e não altera o banco principal:

```powershell
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from integration-tests
```

Resultado esperado: o serviço `integration-tests` termina com código `0`.

Depois do teste:

```powershell
docker compose -f docker-compose.test.yml down
```

Se falhar, consulte:

```powershell
docker compose -f docker-compose.test.yml logs integration-tests
docker compose -f docker-compose.test.yml logs api-test
```

## 5. Configurar a aplicação local

Não sobrescreva um `.env` existente. Crie-o somente se ainda não existir:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Abra `.env` e ajuste pelo menos:

```dotenv
JWT_SECRET=use-um-segredo-local-longo-e-aleatorio
ADMIN_EMAIL=bot.local@example.com
ADMIN_PASSWORD=use-uma-senha-local-forte
RPA_API_EMAIL=bot.local@example.com
RPA_API_PASSWORD=use-a-mesma-senha-local-do-admin
RPA_API_URL=http://localhost:5001
```

Para o primeiro teste local, `ADMIN_EMAIL` deve ser igual a `RPA_API_EMAIL`, e
as duas senhas também devem coincidir. Não versione o arquivo `.env`.

## 6. Subir banco e API

```powershell
docker compose up --build -d db api frontend
docker compose ps
```

Espere `db` e `api` ficarem `healthy`. Confira a API:

```powershell
Invoke-RestMethod http://localhost:9192/api/health
```

Resultado esperado: resposta com `status` igual a `ok`.

Abra também `http://localhost:9192/docs`. A página do Swagger deve carregar.

Se necessário:

```powershell
docker compose logs api
docker compose logs db
```

## 7. Carregar dados para validar o dashboard

Este comando faz upsert dos dados históricos de demonstração no banco local:

```powershell
docker compose exec api python scripts/seed_history_data.py
```

Use somente no ambiente local de teste, pois ele altera os KPIs do banco atual.

## 8. Testar o dashboard

O serviço `frontend` iniciado na etapa 6 serve o dashboard e encaminha `/api`
para `api:5001` na rede Docker. Não inicie o Vite simultaneamente na porta 5173.
Para desenvolvimento com Vite e API local, use a alternativa abaixo.

Abra `http://localhost:5173` e entre com `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

Confira manualmente:

1. Os seis indicadores aparecem no menu.
2. Os dados carregam sem mensagem de erro.
3. Os filtros de ano, mês e período alteram os cartões e gráficos.
4. Logistic Cost, Air Freight e Demurrage tratam valores menores como melhores.
5. Task Cost e Resin Consolidation tratam valores maiores como melhores.
6. O botão de recarregar consulta novamente a API.
7. Atualizar a página mantém a sessão ou solicita novo login de forma coerente.
8. O console do navegador não apresenta erros de rede ou JavaScript.
9. No rodapé, a origem dos dados é API; períodos ausentes não ganham valores fictícios.
10. Os controles de tamanho de fonte e a troca de tema respondem corretamente.
11. Com um papel autorizado, planos de ação podem ser criados, consultados e excluídos.
12. Sair retorna ao login e impede acesso às rotas protegidas sem sessão.

## 9. Testar o RPA com uma planilha normalizada

Faça este teste somente com uma caixa postal de teste. Gere os anexos
sintéticos antes de enviá-los:

```powershell
.\.venv\rpa\Scripts\python.exe scripts/generate_kpi_reports.py
```

A pasta gerada `kpi_reports/` contém `relatorio_logistic_cost.xlsx`,
`relatorio_air_freight.xlsx`, `relatorio_incidental_cost.xlsx`,
`relatorio_total_cost.xlsx`, `relatorio_demurrage.xlsx` e
`relatorio_logistics_vs_prod.xlsx`.

No `.env`, configure:

```dotenv
EMAIL_USER=sua-conta-de-teste@gmail.com
EMAIL_PASSWORD=sua-senha-de-aplicativo
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
EMAIL_SUBJECT_FILTER=Relatorio Logistico
EMAIL_SENDER_FILTER=
EMAIL_DATE_FROM=2026-01-01
EMAIL_DATE_TO=2026-12-31
```

Verifique se o intervalo inclui a data do e-mail. Envie para essa conta uma
mensagem com:

- assunto `Relatorio Logistico`;
- anexo `kpi_reports/relatorio_logistic_cost.xlsx`.

Com banco e API ainda ativos, execute:

```powershell
docker compose run --rm --build rpa-bot
```

Resultado esperado:

```text
encontrados=1 processados=1 duplicados=0 erros=0
```

A API atual retorna `pending` e coloca o lote na fila. No dashboard, abra o
perfil, confira a ingestão pendente e aceite-a com ADMIN ou GESTOR
(`kpi:write_manual`). Só então atualize o dashboard e confira Logistic Cost.
O log `processados=1` do robô confirma a entrega, não a aprovação dos KPIs.
Execute o mesmo
comando novamente, sem reenviar o e-mail. O esperado é a mensagem aparecer
como duplicada e não criar novos registros.

Se a busca localizar mensagens antigas, restrinja `EMAIL_SENDER_FILTER` e as
datas antes de repetir.

## 10. Testar os relatórios brutos

Em uma nova mensagem com assunto `Relatorio Logistico`, anexe os quatro arquivos
originais cujos nomes contenham:

1. `War Room` (`.xlsb` ou `.xlsx`);
2. `Incidental Cost_Total` (`.xlsb` ou `.xlsx`);
3. `Freight Air` (`.xlsb` ou `.xlsx`);
4. `3-indicadores` (`.xlsx`).

Execute novamente:

```powershell
docker compose run --rm --build rpa-bot
```

Os quatro anexos exercitam todos os indicadores. O runtime também aceita fontes
brutas disponíveis isoladamente; os limites estão em
[Automação de e-mail](automacao-rpa-email.md).

Revise e aceite o lote na página de perfil antes de conferir no dashboard
War Room Report, Resin Consolidation, Task Cost Reduction,
Demurrage Cost, Air Freight e Logistics Cost x Prod Amount.

## 11. Critério de aprovação

A aplicação está aprovada quando:

- RPA, backend e frontend passam nos testes automatizados;
- a integração Docker isolada termina com código `0`;
- API e PostgreSQL ficam `healthy` no Compose;
- login e os seis indicadores funcionam no navegador;
- um e-mail válido entra na fila, é aceito e seus valores aparecem no dashboard;
- a segunda execução reconhece a duplicidade;
- anexo inválido gera `ERRO` e não envia dados parciais.

## 12. Encerrar

Pare os contêineres (na alternativa local, interrompa API e Vite com `Ctrl+C`):

```powershell
docker compose down
```

Esse comando preserva o volume do PostgreSQL. Não use `docker compose down -v`
a menos que queira apagar explicitamente todos os dados locais do banco.


## Alternativa: API e Vite locais

Instale o frontend com `npm ci` em `dashboard/` e prepare os ambientes da etapa 2.
Crie o `.env` da raiz apenas se ainda não existir. Para SQLite, defina nele:

```dotenv
DATABASE_URL=sqlite:///./dashboard.db
API_PORT=5001
RPA_API_URL=http://localhost:5001
```

O backend e o Alembic resolvem o SQLite relativo à raiz do repositório
(`app/database/session.py`); os comandos abaixo partem de `server/` para carregar
a configuração e as migrations de forma consistente. Configure `JWT_SECRET` e as credenciais do robô como na
etapa 5. Em um PowerShell na raiz, prepare o banco sem apagar dados existentes:

```powershell
Set-Location server
..\.venv\api\Scripts\python.exe -m alembic upgrade head
..\.venv\api\Scripts\python.exe scripts/seed_rbac.py
..\.venv\api\Scripts\python.exe scripts/create_admin.py seu-email@exemplo.com sua-senha-local
..\.venv\api\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 5001 --reload
```

Use no login e em `RPA_API_EMAIL`/`RPA_API_PASSWORD` a conta criada acima.
O seed cria também as [contas demonstrativas de RBAC](../README.md#-divisão-de-privilégios-rbac-e-auditoria).
Para carga opcional, em outro terminal dentro de `server/`, execute
`..\.venv\api\Scripts\python.exe scripts/seed_history_data.py`; esse comando
faz upsert e pode substituir os valores dos mesmos períodos.

Em outro PowerShell na raiz:

```powershell
Set-Location dashboard
npm run dev
```

Acesse o dashboard em `http://localhost:5173`, a API em
`http://localhost:5001/docs` e o health em `http://localhost:5001/api/health`.
O proxy Vite padrão aponta para `localhost:5001`.

Para PostgreSQL com a API local, inicie somente `docker compose up -d db` na
raiz e ajuste `DATABASE_URL` para
`postgresql+psycopg://dashboard:SUA_SENHA@localhost:5434/dashboard`, usando o
usuário, senha e banco configurados no `.env`. A porta publicada pelo Compose
é **5434**; o valor de exemplo `5432` do `.env.example` não corresponde a esse
mapeamento. Não execute a API local e a API Docker contra bancos diferentes
esperando que compartilhem dados.

Para executar o RPA localmente, mantenha a API ativa e rode na raiz:

```powershell
.\.venv\rpa\Scripts\python.exe -m rpa_email
```

Se o robô local apontar para a API Docker, use `RPA_API_URL=http://localhost:9192`.
Dentro do serviço `rpa-bot`, o Compose já define `http://api:5001`.
Ao trocar o banco de destino, configure outro `RPA_HISTORY_PATH` para não
confundir mensagens processadas em ambientes diferentes.

## Inicialização automática no Windows

Após revisar o `.env`, execute `.\start.bat` na raiz. O script verifica o Docker,
cria o `.env` somente se ausente e executa `docker compose up -d --build`.
Ele inicia `db`, `api` e `frontend`; o perfil RPA é separado. Confira o resultado
com `docker compose ps` e o health em `http://localhost:9192/api/health`.

## Reset local opcional

`scripts/reset_local_data.py` apaga os SQLite `dashboard.db` da raiz e de
`server/`, o histórico `rpa_email/resources/api_email_history.db`, os anexos
baixados e logs locais (inclusive auditoria); depois aplica migrations e seed
RBAC e cria o administrador. Use apenas quando quiser descartar esses dados.
Ele não apaga o volume PostgreSQL do Docker e aplica migrations no banco
selecionado por `DATABASE_URL`; confirme o destino antes de executá-lo.

```powershell
.\.venv\api\Scripts\python.exe scripts/reset_local_data.py
```

O seed provisiona cinco contas demonstrativas; consulte a matriz e credenciais
no README. O reset lê `ADMIN_*` do ambiente do processo e usa como fallback
`admin@lge.com`/`admin123`; ele não carrega esses valores do `.env` por conta própria.
O roteiro normal acima dispensa reset.

## Diagnóstico

- **Porta ocupada:** identifique o processo com
  `Get-NetTCPConnection -LocalPort 5001,5173,9192` e encerre somente o serviço
  de desenvolvimento identificado. Frontend Docker e Vite disputam a porta 5173.
- **Gmail / AUTHENTICATIONFAILED:** use senha de aplicativo, com verificação em
  duas etapas, e confira `IMAP_HOST`/`IMAP_PORT`. `scripts/quick_check.py` consulta
  e-mails reais usando a configuração local; não é um teste offline.
- **Docker indisponível:** abra o Docker Desktop ou use a alternativa SQLite local.
- **Falha de API:** consulte o health da modalidade escolhida. A resposta contém
  `status: ok` e `environment`, sem `source: excel_cache`; ela não comprova conexão
  com o banco. Confira login, leitura autenticada de KPIs e logs da API.
- **pytest sem permissão no temporário do Windows:** use uma pasta nova dentro do
  clone, por exemplo `--basetemp .pytest-tmp-rpa-NOVO`. O pytest limpa essa pasta;
  nunca aponte para uma pasta com dados importantes.

Para a integração descartável, cenários e isolamento estão em
[Ambiente de integração](ambiente-integracao.md). Para uma conferência Gmail
restrita a um anexo e porta 15001, use
[Homologação Gmail local](homologacao-gmail-local.md).
