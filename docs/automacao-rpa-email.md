# Automação de e-mail e extração de KPIs

O robô é um job de execução única. Cada `python -m rpa_email` consulta a caixa,
processa os anexos elegíveis e encerra. O agendamento deve ficar fora do código
(Task Scheduler, cron ou pipeline).

## Decisão de arquitetura

Existe um único pacote de automação: `rpa_email`. A antiga pasta
`Automacao-Planilha` misturava protótipos de exploração, geração de planilhas e
código usado pelo robô. Essa divisão obrigava o runtime a alterar `sys.path` e a
imagem Docker a copiar duas árvores. Os extratores de produção agora pertencem
ao próprio pacote do robô.

```text
rpa_email/
├── __main__.py                 # permite python -m rpa_email
├── main.py                     # composição das dependências e exit code
├── email_client.py             # IMAP, download e nomes seguros
├── email_service.py            # fluxo buscar → validar → extrair → enviar
├── models.py                   # modelos do processamento
├── config/
│   └── settings.py             # configuração de ambiente
├── extractors/
│   ├── normalized.py           # entrada já normalizada
│   ├── raw.py                  # roteamento dos relatórios originais
│   ├── war_room_report.py
│   ├── air_freight.py
│   ├── resin_consolidation.py
│   ├── task_cost_reduction.py
│   ├── demurrage_cost.py
│   └── logistics_cost_vs_prod_amount.py
└── services/
    ├── api_client.py           # autenticação e ingestão HTTP
    └── processing_history.py   # deduplicação local em SQLite
```

Os módulos têm nomes de negócio, não números (`indicador_01.py`). Assim, uma
alteração no layout de Air Freight, por exemplo, fica localizada e pesquisável.
Não existe `database_service.py` no robô porque ele não é dono do banco de KPIs:
somente a API FastAPI escreve no PostgreSQL. O SQLite local guarda apenas o
histórico de tentativas e deduplicação.

## Fluxo

1. `Settings.from_env()` carrega `.env` da raiz e, por compatibilidade local,
   `rpa_email/.env` quando existir.
2. `EmailClient` abre a caixa em modo somente leitura e aplica os filtros IMAP.
3. `EmailProcessingService` revalida assunto, remetente e período e deduplica
   pelo `Message-ID`.
4. Cada tentativa recebe uma pasta própria de anexos.
5. Arquivos brutos seguem para `RawReportExtractor`; arquivos normalizados,
   para `KpiExtractor`.
6. O payload só é enviado se a extração inteira não tiver erros.
7. `ApiReportSender` autentica e chama `POST /api/ingestion/kpi-report`.
8. O histórico local só recebe `PROCESSADO` após a confirmação da API.

A caixa postal nunca é modificada. Erros ficam reprocessáveis; os estados
`PROCESSADO` e `FORA_DO_PADRAO` são terminais.

## Relatórios brutos reconhecidos

| Fragmento do arquivo | Formato | Indicadores extraídos |
| --- | --- | --- |
| `War Room` | `.xlsb` ou `.xlsx` | War Room Report |
| `Freight Air` | `.xlsb` ou `.xlsx` | Air Freight |
| `3-indicadores` | `.xlsx` | Resin Consolidation, Task Cost Reduction e Demurrage Cost |
| `Incidental Cost_Total` | `.xlsb` ou `.xlsx` | Logistics Cost x Prod Amount |

Os quatro relatórios são obrigatórios no lote bruto. Ainda que três indicadores
compartilhem o arquivo `3-indicadores.xlsx`, cada um possui seu próprio módulo,
função de extração, validação e lista de saída. Se uma fonte estiver ausente, o
lote inteiro falha antes da chamada à API; assim, um e-mail parcial não pode ser
registrado como processamento completo.

No layout legado de `Incidental Cost_Total`, o numerador aparece como
`Incidental Cost` na linha 82 e a produção como `Prod. Amt.` na linha 95 da aba
`Incidental Cost (MUSD)`. O extrator mantém esses dois valores separados no
payload e calcula a razão apenas quando a produção é positiva. Na versão 26.07,
2026 ocupa apenas as colunas de janeiro a julho; as colunas seguintes são
controles/acumulados e não são interpretadas como agosto a dezembro.

## Planilha normalizada

Os cinco KPIs padrão usam as colunas `month`, `year`, `target`, `result` e,
opcionalmente, `achievement`. `logistics_vs_prod` usa `logisticsCost`,
`productionAmount` e `ratio`.

O atingimento é calculado conforme a direção do indicador:

- custos (`logistic_cost`, `air_freight`, `demurrage`): `target / result`;
- ganhos (`total_cost`, `incidental_cost`): `result / target`.

Meses ausentes nos relatórios brutos não são estimados nem convertidos em zero.
Somente valores informados pela fonte são enviados.

## Execução

```bash
pip install -r requirements.txt
python -m rpa_email
```

No Docker:

```bash
docker compose --profile rpa up rpa-bot
```

As variáveis estão documentadas no `.env.example` da raiz. As obrigatórias são
`EMAIL_USER`, `EMAIL_PASSWORD`, `RPA_API_URL`, `RPA_API_EMAIL` e
`RPA_API_PASSWORD`.

## Testes

```bash
python -m pytest rpa_email/tests -q
```

Os testes usam mensagens e planilhas sintéticas; não acessam e-mails ou
arquivos reais do usuário.
