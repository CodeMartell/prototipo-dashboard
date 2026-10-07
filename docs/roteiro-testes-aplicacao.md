# Roteiro de teste da aplicação

Este roteiro parte da raiz do projeto no Windows/PowerShell:

```powershell
cd C:\Users\ROMULO_LIRA\Documents\prototipo-dashboard
```

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

Também é necessário que o Docker Desktop esteja iniciado.

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

Resultado atual esperado: `50 passed`.

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
JWT_SECRET=use-um-segredo-local-longo
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
docker compose up --build -d postgres api
docker compose ps
```

Espere `postgres` e `api` ficarem `healthy`. Confira a API:

```powershell
Invoke-RestMethod http://localhost:5001/api/health
```

Resultado esperado: resposta com `status` igual a `ok`.

Abra também `http://localhost:5001/docs`. A página do Swagger deve carregar.

Se necessário:

```powershell
docker compose logs api
docker compose logs postgres
```

## 7. Carregar dados para validar o dashboard

Este comando faz upsert dos dados históricos de demonstração no banco local:

```powershell
docker compose exec api python scripts/seed_history_data.py
```

Use somente no ambiente local de teste, pois ele altera os KPIs do banco atual.

## 8. Subir e testar o dashboard

Em outro PowerShell:

```powershell
cd C:\Users\ROMULO_LIRA\Documents\prototipo-dashboard\dashboard
npm run dev
```

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

## 9. Testar o RPA com uma planilha normalizada

Faça este teste somente com uma caixa postal de teste.

No `.env`, configure:

```dotenv
EMAIL_USER=sua-conta-de-teste@gmail.com
EMAIL_PASSWORD=sua-senha-de-aplicativo
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

Atualize o dashboard e confirme os valores de Logistic Cost. Execute o mesmo
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

Confira no dashboard War Room Report, Resin Consolidation, Task Cost Reduction,
Demurrage Cost, Air Freight e Logistics Cost x Prod Amount.

## 11. Critério de aprovação

A aplicação está aprovada quando:

- RPA, backend e frontend passam nos testes automatizados;
- a integração Docker isolada termina com código `0`;
- API e PostgreSQL ficam `healthy`;
- login e os seis indicadores funcionam no navegador;
- um e-mail válido é processado e aparece no dashboard;
- a segunda execução reconhece a duplicidade;
- anexo inválido gera `ERRO` e não envia dados parciais.

## 12. Encerrar

Interrompa o Vite com `Ctrl+C` e pare os contêineres:

```powershell
docker compose down
```

Esse comando preserva o volume do PostgreSQL. Não use `docker compose down -v`
a menos que queira apagar explicitamente todos os dados locais do banco.
