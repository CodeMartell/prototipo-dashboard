# Fluxo local — três e-mails para o dashboard

O fluxo suportado é: Gmail/IMAP → robô → extração dos anexos `.xlsx` → API FastAPI → PostgreSQL → dashboard React.

## O que fica persistido

- Os valores dos KPIs ficam no volume PostgreSQL `datalens_pg_data` e alimentam o dashboard pela API.
- O `Message-ID`, remetente, assunto, estado e horário de cada ingestão concluída ficam na tabela `processed_emails`.
- O robô mantém seu controle local de processamento no volume `datalens_email_history`, evitando processar novamente o mesmo e-mail.
- Os anexos ficam no volume `datalens_email_attachments`.

Os valores de um mesmo KPI, mês e ano usam *upsert*: um novo e-mail com um `Message-ID` diferente corrige o registro daquele período, em vez de criar uma linha duplicada. O banco mantém o estado atual dos indicadores; ele ainda não mantém todas as versões anteriores de uma correção nem o conteúdo binário original do e-mail.

## Formato recomendado para os três e-mails

Use um `Message-ID` diferente em cada mensagem, o mesmo assunto configurado em `EMAIL_SUBJECT_FILTER` e um remetente aceito por `EMAIL_SENDER_FILTER`.

1. `logistic_cost.xlsx`, com colunas `month`, `year`, `target`, `result` e `achievement`.
2. `air_freight.xlsx`, com colunas `month`, `year`, `target`, `result` e `achievement`.
3. `logistics_vs_prod.xlsx`, com colunas `month`, `year`, `logisticsCost`, `productionAmount` e `ratio`.

O nome da aba pode repetir o nome do indicador. Meses usam `Jan` a `Dec`; anos usam `YNN`, por exemplo `Y26`. Os valores devem ser números não negativos. Se uma planilha tiver coluna ausente, valor inválido ou arquivo corrompido, o e-mail inteiro falha e pode ser corrigido e reenviado.

## Preparação local

1. Copie `.env.example` para `.env` e substitua todos os valores de exemplo, principalmente `POSTGRES_PASSWORD`, `JWT_SECRET`, `ADMIN_PASSWORD`, `EMAIL_USER` e `EMAIL_PASSWORD`.
2. Mantenha `ADMIN_EMAIL`/`ADMIN_PASSWORD` iguais a `RPA_API_EMAIL`/`RPA_API_PASSWORD` no primeiro teste local. Em deploy, crie uma conta técnica dedicada para o robô.
3. Para Gmail, use senha de aplicativo; não coloque a senha normal da conta no arquivo.
4. Defina `EMAIL_SUBJECT_FILTER`, `EMAIL_SENDER_FILTER`, `EMAIL_DATE_FROM` e `EMAIL_DATE_TO` conforme os três e-mails de teste.
5. Inicie a aplicação e o robô:

   ```powershell
   docker compose --profile rpa up --build
   ```

O robô executa uma varredura e termina. Para uma nova varredura local, execute:

```powershell
docker compose run --rm rpa-bot
```

## Conferência

- O log do robô deve terminar com três processamentos e zero erros.
- `GET /api/health` deve retornar `status: ok`.
- Após login, o selo inferior do dashboard deve mostrar `API`, nunca `MOCK`.
- Reexecutar os mesmos três e-mails deve resultar em duplicidade/`skipped`, sem novas linhas de KPI.

Antes do deploy, mantenha `VITE_ALLOW_MOCK_FALLBACK=false`, use secrets da plataforma, configure certificado/domínio reais e automatize backup do volume PostgreSQL.
