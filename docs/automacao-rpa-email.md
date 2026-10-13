# Automação de e-mail e extração de KPIs

O robô é um job de execução única. Cada `python -m rpa_email` consulta a caixa,
processa os anexos elegíveis e encerra. O agendamento deve ficar fora do código
(Task Scheduler, cron ou pipeline).

## Decisão de arquitetura

O pacote integrado ao dashboard é `rpa_email`. O bot autônomo do Épico 3
permanece em [`bot-extrator-email/`](../bot-extrator-email/README.md), com
configuração, testes e saída SMTP próprios; ele não é o entrypoint da integração. A antiga pasta
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
8. HTTP 200 com `processed`, `skipped` ou `pending` confirma a entrega e permite
   marcar `PROCESSADO` no histórico local. Hoje um lote novo recebe `pending`:
   a API grava `email_ingest_queue`, e ADMIN/GESTOR revisam e aceitam o lote na
   página de perfil antes de seus KPIs aparecerem no dashboard.

A caixa postal nunca é modificada. Erros ficam reprocessáveis; os estados
`PROCESSADO` e `FORA_DO_PADRAO` são terminais.

## Relatórios brutos reconhecidos

| Fragmento do arquivo | Formato | Indicadores extraídos |
| --- | --- | --- |
| `War Room` | `.xlsb` ou `.xlsx` | War Room Report |
| `Freight Air` | `.xlsb` ou `.xlsx` | Air Freight |
| `3-indicadores` | `.xlsx` | Resin Consolidation, Task Cost Reduction e Demurrage Cost |
| `Incidental Cost_Total` | `.xlsb` ou `.xlsx` | Logistics Cost x Prod Amount |

Os quatro relatórios cobrem os seis indicadores. O runtime atual extrai as
fontes presentes: a exigência de todas as fontes está desativada em
`RawReportExtractor.identify_files`, e o teste
`test_missing_raw_source_extracts_available_reports` confirma esse comportamento.
Três indicadores compartilham `3-indicadores.xlsx`, com módulos e listas próprios.
Erros reportados pelos extratores impedem envio do lote, mas uma fonte ausente
não é tratada como erro. Confirmar com o negócio se a obrigatoriedade deve voltar;
essa decisão exige mudança funcional e nova validação.

No layout legado de `Incidental Cost_Total`, o numerador aparece como
`Incidental Cost` na linha 82 e a produção como `Prod. Amt.` na linha 95 da aba
`Incidental Cost (MUSD)`. O extrator mantém esses dois valores separados no
payload e calcula a razão apenas quando a produção é positiva. Na versão 26.07,
2026 ocupa apenas as colunas de janeiro a julho; as colunas seguintes são
controles/acumulados e não são interpretadas como agosto a dezembro.

### Regra de negócio — Air Freight (%)

| Item | Regra |
| --- | --- |
| **Base de cálculo mensal** | `Freight Amount (linha 9) / Material Cost (linha 8)` da aba "Annual Result". |
| **ACC de conferência (2024/2025)** | `SOMA(linha 9) / SOMA(linha 8)` para as colunas anuais. O extrator atual envia registros mensais. |
| **Validação obrigatória** | O ACC anual calculado precisa bater com a coluna ACC já existente na planilha (`coluna P` para 2024, `coluna AC` para 2025). Divergências emitem log de warning. |
| **Target** | Só existe para 2026 (índice 42 (coluna AQ) da linha TV Rate: 0,0022 ou 0,22%). Anos 2024 e 2025 não têm meta na fonte; `_build_record` usa `target: 0.0` técnico e `achievement: null`. |
| **Resultado** | Extraído de Freight Amount / Material Cost, com fallback para TV Rate da planilha. Lançamento manual também existe na API/interface. |
| **% do KPI** | `Target / Resultado` para frete, pois menor é melhor (ver `air_freight.py` e `kpi_meta.py`). |
| **Agregação** | Média dos meses do período (trimestral, semestral e anual). |
| **Regras de semáforo** | 🟢 **Verde:** `>= 100%`<br>🟡 **Amarelo:** `90% a 99%`<br>🔴 **Vermelho:** `< 90%` |
| **Limite temporal** | Para 2026, a extração encerra no primeiro mês sem dado; o limite depende da fonte, sem fixar julho no código. Meses subsequentes não são preenchidos com valores falsos ou zerados. |

## Planilha normalizada

Os cinco KPIs padrão usam as colunas `month`, `year`, `target`, `result` e,
opcionalmente, `achievement`. `logistics_vs_prod` usa `logisticsCost`,
`productionAmount` e `ratio`.

O atingimento é calculado conforme a direção do indicador:

- custos (`logistic_cost`, `air_freight`, `demurrage`): `target / result`;
- ganhos (`total_cost`, `incidental_cost`): `result / target`.

Meses ausentes nos relatórios brutos não são estimados nem convertidos em zero.
Somente valores informados pela fonte são enviados.

## Configuração e ingestão

As variáveis ficam no [`.env.example`](../.env.example) da raiz. São obrigatórias
`EMAIL_USER`, `EMAIL_PASSWORD`, `RPA_API_URL`, `RPA_API_EMAIL` e `RPA_API_PASSWORD`.
As credenciais `RPA_API_*` são de um usuário ADMIN da FastAPI, diferentes das
credenciais Gmail. Use conta técnica dedicada e HTTPS fora do teste local.

| Variável | Uso |
| --- | --- |
| `RPA_API_URL` | API local `http://localhost:5001`; API Docker vista do host `http://localhost:9192`; dentro do Compose `http://api:5001` |
| `RPA_API_TIMEOUT` | Limite HTTP; exemplo atual: 20 segundos |
| `RPA_HISTORY_PATH` | Local: `rpa_email/resources/api_email_history.db`; no Compose: volume `email_history` |

O Compose de integração não publica API no host; nenhum endereço acima aponta
para ele. Ao trocar o banco de destino, use outro histórico local: mensagens já
marcadas como processadas podem ser ignoradas mesmo ausentes no novo banco.
Não apague o histórico antigo sem revisar o reprocessamento.

Não há retry automático de ingestão HTTP na mesma execução. Falhas de envio
registram `ERRO` e permitem nova tentativa com o mesmo Message-ID; se a API já
persistiu o lote antes de uma falha de rede/histórico, retorna `skipped`. O fetch
IMAP possui uma tentativa de reconexão para sessão encerrada. Mensagem sem anexo
ou link utilizável é `FORA_DO_PADRAO`, terminal; não é sucesso de ingestão.

Não existe fallback de gravação em Excel nesse entrypoint. A fila e o histórico
são distintos: `PROCESSADO` no robô significa entrega confirmada, inclusive
quando a aprovação na API ainda está pendente. As rotas de revisão estão no
[guia do backend](../server/README.md).

## Execução e testes

Os comandos de instalação, `python -m rpa_email`, perfil Docker e testes estão
centralizados no [roteiro principal](roteiro-testes-aplicacao.md). Para mensagens
normalizadas separadas, consulte o [exemplo de três e-mails](fluxo-local-tres-emails.md).

A suíte local usa mensagens/planilhas sintéticas, transporte HTTP simulado,
401/403/422/500, timeout, conexão, JSON inválido, confirmação desconhecida,
reconexão IMAP, nova tentativa e deduplicação. Não acessa a caixa real do usuário.
A [integração Docker](ambiente-integracao.md) usa mensagem/IMAP sintéticos com
extratores, login, HTTP, PostgreSQL e histórico SQLite reais; não abre React nem Gmail.
As evidências de Gmail/React de agosto de 2026 estão em
[Homologação Gmail local](homologacao-gmail-local.md) e
[Épico 7](epico-7-homologacao.md). Elas descrevem o fluxo anterior à fila de aprovação;
não comprovam que os scripts antigos aceitem o novo retorno `pending`.

## Limites e pendências

- Revalidar o fluxo completo Gmail → fila → aprovação → dashboard. As evidências
  históricas de aplicação imediata não substituem essa validação.
- Confirmar com o negócio o envio de subconjuntos de fontes brutas. Extratores
  de layouts brutos podem pular períodos sem dados; não declarar rejeição
  universal de toda linha incompleta com base apenas nos testes normalizados.
- Concorrência, limites de anexos, política final de remetente/período, conta do
  robô com menor privilégio, rotação de credenciais, stress e agendamento.
- Monitoramento, homologação com usuários e validação autorizada de produção;
  preservar os requisitos e decisões registrados no Épico 7.
