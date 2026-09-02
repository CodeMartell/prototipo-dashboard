# Automação de E-mail (RPA) — como funciona e como operar

Guia do robô que lê os relatórios logísticos na caixa de e-mail, extrai os KPIs
e alimenta o dashboard. Cobre o fluxo completo: **Gmail → anexo → extração →
API → PostgreSQL → dashboard**.

---

## 1. Visão geral

O robô é um **job de execução única**. Não existe agendador no código: cada
`python -m rpa_email.bot` processa a caixa uma vez e encerra. Para execução
periódica é preciso um agendador externo (Task Scheduler, cron, pipeline).

Duas garantias importantes do desenho atual:

- **A caixa de e-mail nunca é alterada.** O IMAP é aberto com `readonly=True`;
  o robô não marca como lido, não move e não apaga mensagens.
- **O robô não escreve no banco.** Ele chama `POST /api/ingestion/kpi-report`.
  O backend FastAPI é o dono do schema (versionado por Alembic).

```
┌──────────┐   IMAP    ┌─────────────┐  extração   ┌──────────────┐
│  Gmail   │ ────────► │  rpa_email  │ ──────────► │   payload    │
│ (INBOX)  │ readonly  │    (bot)    │             │    JSON      │
└──────────┘           └──────┬──────┘             └───────┬──────┘
                              │                            │ HTTP + JWT
                       ┌──────▼──────┐             ┌────────▼────────┐
                       │  histórico  │             │  API FastAPI    │
                       │   SQLite    │             │ /api/ingestion  │
                       └─────────────┘             └────────┬────────┘
                                                            │
                                                   ┌────────▼────────┐
                                                   │   PostgreSQL    │
                                                   └────────┬────────┘
                                                            │
                                                   ┌────────▼────────┐
                                                   │ Dashboard React │
                                                   └─────────────────┘
```

---

## 2. Mapa dos arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `rpa_email/bot.py` | Ponto de entrada. Monta as dependências e chama o controller. |
| `rpa_email/app/controller.py` | Coordena uma execução e loga o resumo. Sem regra de negócio. |
| `rpa_email/app/services.py` | O cérebro: busca, deduplica, valida, salva anexos, extrai e envia. |
| `rpa_email/config/settings.py` | Lê e valida o `.env`. Aborta se faltar variável obrigatória. |
| `rpa_email/modules/email/EmailHandler.py` | Infraestrutura IMAP: conectar, buscar, baixar, salvar anexos. |
| `rpa_email/app/extractor.py` | Lê planilhas **já no formato KPI** (`.xlsx` com colunas month/year/...). |
| `rpa_email/app/raw_file_bridge.py` | Ponte para os **relatórios brutos** (`.xlsb`). Importa `Automacao-Planilha/extrair_kpis.py`. |
| `rpa_email/app/ingestion_client.py` | Monta o payload e faz login + POST na API. |
| `rpa_email/app/repository.py` | Histórico de processamento (SQLite local ou PostgreSQL). |
| `rpa_email/app/models.py` | `EmailRecord` e `ExecutionSummary`. |
| `Automacao-Planilha/extrair_kpis.py` | Extração dos relatórios originais. **Dependência de runtime do robô.** |

---

## 3. Passo a passo de uma execução

1. **Configuração** — `Settings.from_env()` carrega o `.env` da raiz e depois
   `rpa_email/.env`. Falta de `EMAIL_USER`, `EMAIL_PASSWORD`, `RPA_API_URL`,
   `RPA_API_EMAIL` ou `RPA_API_PASSWORD` interrompe antes de qualquer conexão.

2. **Busca IMAP** — os filtros são aplicados **no servidor** (`SUBJECT`, `FROM`,
   `SINCE`, `BEFORE`), então a caixa inteira não é baixada.

3. **Deduplicação** — a chave é o `Message-ID`. Se o cabeçalho não existir, o
   robô gera um SHA-256 de `UID + From + Date + Subject`. Se a chave já estiver
   no histórico com status terminal, a mensagem é contada como duplicada e
   ignorada.

4. **Revalidação local** — assunto, remetente e data são conferidos de novo,
   mesmo já tendo passado pelo filtro IMAP. Reprovado vira `FORA_DO_PADRAO`.

5. **Anexos** — salvos em uma subpasta temporária nova dentro de
   `ATTACHMENTS_DIR`, uma por tentativa, para não misturar execuções. Se a
   mensagem não tiver anexo convencional, o robô varre o corpo procurando
   **links do Google Drive** e baixa de lá (caminho para arquivos acima do
   limite de 25 MB do Gmail). Sem nenhum anexo, a mensagem vira erro.

6. **Extração** — `is_raw_report()` decide a rota:
   - contém `.xlsb` ou nome de relatório conhecido → `RawFileBridge`
   - caso contrário → `KpiExtractor`

7. **Montagem do payload** — `build_payload()` **recusa enviar se a extração
   acumulou qualquer erro**. O e-mail é uma unidade atômica: não existe envio
   parcial só com as linhas válidas.

8. **Envio** — autentica na API a cada envio (JWT novo, sem reaproveitar token
   possivelmente expirado), faz o POST e só aceita `processed` ou `skipped`
   como confirmação. Não há retry automático: a próxima execução reenvia o
   mesmo `Message-ID` com segurança.

9. **Histórico** — grava `PROCESSADO`, `FORA_DO_PADRAO` ou `ERRO`. O processo
   sai com código **0** se não houve erro e **1** se houve.

### Status e reprocessamento

| Status | Terminal? | Efeito na próxima execução |
| --- | --- | --- |
| `PROCESSADO` | sim | ignorado |
| `FORA_DO_PADRAO` | sim | ignorado |
| `ERRO` | **não** | tentado novamente |

Existem **duas camadas de deduplicação**. Para reprocessar de propósito o mesmo
e-mail, as duas precisam ser limpas:

1. SQLite do robô — `rpa_email/resources/api_email_history.db`
2. Tabela `processed_emails` do backend

```cmd
docker compose exec postgres psql -U dashboard -d dashboard -c "DELETE FROM processed_emails WHERE message_id = '<id-do-email>';"
```

---

## 4. Configuração (`.env` da raiz)

| Variável | Obrigatória | Observação |
| --- | --- | --- |
| `EMAIL_USER` | sim | Conta que recebe os relatórios. |
| `EMAIL_PASSWORD` | sim | **Senha de app** do Google. Pode manter os espaços do formato `xxxx xxxx xxxx xxxx`. |
| `IMAP_HOST` | não | Padrão `imap.gmail.com`. Vale também para Google Workspace com domínio próprio. |
| `IMAP_PORT` | não | Padrão `993`. |
| `IMAP_MAILBOX` | não | Padrão `INBOX`. |
| `EMAIL_SUBJECT_FILTER` | não | Substring exigida no assunto. Vazio = sem filtro. |
| `EMAIL_SENDER_FILTER` | não | Substring exigida no remetente. Vazio = qualquer remetente. |
| `EMAIL_DATE_FROM` / `EMAIL_DATE_TO` | não | Formato `AAAA-MM-DD`. Viram `SINCE` / `BEFORE` no IMAP. |
| `ATTACHMENTS_DIR` | não | Onde os anexos são salvos. |
| `RPA_API_URL` | sim | `http://localhost:5001` rodando na máquina; `http://api:5001` dentro do Compose. |
| `RPA_API_EMAIL` / `RPA_API_PASSWORD` | sim | Conta da API usada na ingestão. Precisa de perfil **ADMIN**. |
| `RPA_API_TIMEOUT` | não | Padrão `20` segundos. |
| `RPA_HISTORY_PATH` | não | Caminho do SQLite de histórico. |
| `DATABASE_URL` | não | Mantida por compatibilidade; o bot principal não usa SQL direto. |

> A senha de app do Google **não é por serviço**: a mesma credencial autentica
> em IMAP, SMTP e POP. Se foi gerada pensando em SMTP, funciona no IMAP.

---

## 5. Como operar tudo junto

### Pré-requisitos (uma vez)

```cmd
REM dependências do robô (inclui pyxlsb, para ler .xlsb)
pip install -r requirements.txt

REM dependências do frontend
cd dashboard && npm install && cd ..
```

### Execução

```cmd
REM 1. Banco + API
docker compose up -d postgres api

REM 2. Frontend (outro terminal)
cd dashboard
npm run dev

REM 3. Robô (na raiz, quando quiser processar a caixa)
python -m rpa_email.bot
```

- API: `http://localhost:5001` — documentação em `/docs`
- Dashboard: `http://localhost:5173`
- PostgreSQL: porta **5433** no host (a 5432 costuma estar ocupada por uma
  instalação local do PostgreSQL)

### Alternativa: robô pelo Docker

```cmd
docker compose --profile rpa up rpa-bot
```

O Compose troca automaticamente `RPA_API_URL` para `http://api:5001` e usa um
histórico separado, em volume — ou seja, o que já foi processado localmente
**não** é considerado nessa execução.

### Saída esperada

```
INFO | Iniciando busca IMAP com os filtros configurados
INFO | Execucao concluida | encontrados=1 processados=1 duplicados=0 fora_do_padrao=0 erros=0
```

---

## 6. O que o e-mail precisa ter

Assunto contendo o valor de `EMAIL_SUBJECT_FILTER` (hoje `Relatorio Logistico`),
data dentro da janela configurada e pelo menos um anexo. Aí duas opções:

### Modo A — relatório bruto (arquivos originais)

O nome do arquivo precisa conter um destes fragmentos:

| Fragmento no nome | Extensões | Alimenta |
| --- | --- | --- |
| `War Room` | `.xlsb` / `.xlsx` | `logistic_cost` |
| `Freight Air` | `.xlsb` / `.xlsx` | `air_freight` |
| `Incidental Cost_Total` | `.xlsb` / `.xlsx` | `incidental_cost` |
| `3-indicadores` | `.xlsx` | `total_cost`, `demurrage`, resin |

A comparação ignora maiúsculas/minúsculas e apóstrofos. Havendo mais de um
arquivo para a mesma assinatura, vale o mais recente pela data de modificação.

### Modo B — planilha já no formato KPI

Um `.xlsx` com cabeçalho na primeira linha. Para os indicadores padrão:

| month | year | target | result | achievement |
| --- | --- | --- | --- | --- |
| Jan | Y26 | 0.065 | 0.054 | 1.2 |

Para Logistics Cost x Prod Amount:

| month | year | logisticsCost | productionAmount | ratio |
| --- | --- | --- | --- | --- |
| Jan | Y26 | 2.38 | 47.63 | 0.05 |

Regras:

- `month` precisa ser `Jan`..`Dec` e `year` precisa ser `Y24`..`Y27`. Fora
  desses conjuntos, a linha é descartada.
- Valores em percentual são gravados como **fração** (`4,7%` → `0.047`).
- `achievement` e `ratio` são opcionais: sem eles, o parser calcula.
- O KPI é identificado pelo nome do arquivo ou da aba, nesta ordem de
  prioridade: `prod`/`production` → `logistic`/`war room` → `air`/`freight` →
  `incidental` → `total` → `demurrage`.

---

## 7. Verificações já realizadas

Registro do que foi testado neste ambiente, para servir de linha de base.

| Verificação | Resultado |
| --- | --- |
| Login IMAP com a senha de app (com espaços) | OK — INBOX aberta em readonly, 288 mensagens |
| Busca pelo assunto `Relatorio Logistico` | 0 mensagens (nenhum relatório na caixa ainda) |
| `python -m rpa_email.bot` completo | OK — `encontrados=0 erros=0`, exit code 0 |
| Cadeia extração → payload → API → banco | OK — ingestão retornou `processed` |
| Reenvio do mesmo `Message-ID` | OK — retornou `skipped` (deduplicação ativa) |
| Suíte do robô (`pytest rpa_email/tests`) | 46 testes passando |
| Imagem `Dockerfile.email-rpa` | Build OK; `extrair_kpis` + `pyxlsb` + `bot` carregam |

---

## 8. Correções aplicadas para a automação funcionar

**`pyxlsb` ausente.** Não estava instalado nem declarado em nenhum
`requirements` do projeto, embora `Automacao-Planilha/extrair_kpis.py` faça
`from pyxlsb import open_workbook`. Todo relatório `.xlsb` falhava: o
`ModuleNotFoundError` era capturado pelo `except Exception` do
`RawFileBridge.process()` e virava um genérico "Erro na extração" — os
relatórios reais nunca seriam processados. Adicionado ao `requirements.txt`.

**`Automacao-Planilha/` fora da imagem do RPA.** O `Dockerfile.email-rpa`
copiava apenas `rpa_email`, então dentro do container o import de
`extrair_kpis` quebrava e o Modo A era impossível. Adicionado o `COPY`.

---

## 9. Avisos e divergências conhecidas

### Não execute estes dois

- **`python -m rpa_email.bot_local`** — fluxo antigo. Escreve **direto** no
  PostgreSQL via `KpiPostgresRepository`, pulando a API, com upsert do conteúdo
  de `kpi_reports/` (fixtures derivadas dos mocks). Sobrescreveria os dados
  reais carregados no banco.
- **`python scripts/init_db.py`** — cria as tabelas de KPI por SQL próprio,
  competindo com o schema versionado pelo Alembic. Duas fontes de verdade para
  o mesmo schema.

### Divergências a resolver

**Direção do `achievement`.** O `extractor.py` calcula sempre `target / result`
(fórmula de custo) para todos os indicadores. Para **Task Cost Reduction** e
**Resin Consolidation**, que são "quanto maior melhor", isso fica invertido em
relação ao cálculo do backend (`server/app/core/kpi_meta.py`). A ingestão aceita
o valor como veio, sem recalcular — diferente do lançamento manual pela tela. Se
a planilha traz a coluna `achievement` preenchida, o valor da fonte prevalece e
não há problema; o risco está no Modo B sem essa coluna.

**`logistics_vs_prod` não é alimentado pelo Modo A.** O `raw_file_bridge` deixa
essa lista vazia por decisão explícita no código. O indicador Logistics Cost x
Prod Amount não é atualizado pelos relatórios brutos.

**Conta da API compartilhada.** `RPA_API_EMAIL` aponta para a mesma conta ADMIN
usada no dashboard. Para produção, criar uma conta dedicada ao robô, com o
mínimo de permissão necessária para a ingestão.

---

## 10. Diagnóstico de problemas

| Sintoma | Causa provável |
| --- | --- |
| `Variaveis obrigatorias ausentes: ...` | Falta variável no `.env`. O robô aborta antes de conectar. |
| `encontrados=0` | Nenhuma mensagem casa com assunto/remetente/data. Confirme o assunto e a janela de datas. |
| `fora_do_padrao=1` | Passou pelo filtro IMAP mas falhou na revalidação local. Veja `details` no histórico. |
| `Mensagem sem anexos` | Sem anexo convencional e sem link do Google Drive no corpo. |
| `Falha na extracao; nenhum dado enviado` | A extração acumulou erros. Confira nome do arquivo (Modo A) ou colunas e valores de `month`/`year` (Modo B). |
| `Autenticacao da API rejeitada (HTTP 401)` | `RPA_API_EMAIL` / `RPA_API_PASSWORD` inválidos. |
| `Ingestao rejeitada (HTTP 403)` | A conta da API não tem perfil ADMIN. |
| `API indisponivel; reprocessamento necessario` | A API não respondeu. Verifique `docker compose ps`. |
| E-mail conhecido não reprocessa | Status terminal no histórico. Limpe as duas camadas de deduplicação (seção 3). |

Consultar o histórico local:

```cmd
python -c "import sqlite3;print(*sqlite3.connect(r'rpa_email/resources/api_email_history.db').execute('SELECT received_at,status,details,attachment_count,subject FROM email_processing ORDER BY id DESC LIMIT 10'),sep='\n')"
```

---

## Referências

- `server/README.md` — backend, migrations e rotas de KPI
- `docs/robo-ingestao-api.md` — contrato da ingestão
- `docs/guia-execucao-testes.md` — execução e testes de ponta a ponta
