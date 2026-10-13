# Fluxo local — três e-mails para o dashboard

O fluxo atual é: Gmail/IMAP → robô → extração dos anexos `.xlsx` → fila na
API FastAPI → aceite pelo ADMIN/GESTOR → PostgreSQL → dashboard React.
Para instalação e comandos gerais, use o [roteiro principal](roteiro-testes-aplicacao.md).

## O que fica persistido

- Os valores dos KPIs ficam no volume PostgreSQL `pg_data` e alimentam o dashboard pela API.
- O payload, Message-ID e diferenças ficam em `email_ingest_queue` para revisão.
- Após o aceite, o processamento fica registrado em `processed_emails`.
- O robô mantém seu controle local de processamento no volume `email_history`, evitando processar novamente o mesmo e-mail.
- Os anexos ficam no volume `email_attachments`.

Após o aceite, os valores de um mesmo KPI, mês e ano usam *upsert*. Um novo
Message-ID permite submeter uma correção para revisão. O payload e as diferenças
ficam na fila; alterações têm registros em `kpi_change_logs`. Não confundir esse
registro com arquivamento integral do e-mail original. O nome efetivo dos volumes
pode receber o prefixo do projeto Compose.

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
- A API publicada em `http://localhost:9192/api/health` deve retornar `status: ok`.
- Na página de perfil, revise e aceite os três lotes com ADMIN/GESTOR; só então
  confira os valores no dashboard. `PROCESSADO` no robô confirma entrega à fila.
- Após login, o selo inferior do dashboard deve mostrar `API`, nunca `MOCK`.
- Reexecutar os mesmos três e-mails deve resultar em duplicidade/`skipped`, sem novas linhas de KPI.

Antes do deploy, use secrets da plataforma, configure certificado/domínio reais
e automatize backup do PostgreSQL. O frontend atual não tem fallback de dados
locais; não depende da antiga variável `VITE_ALLOW_MOCK_FALLBACK`.
