# Épico 7 — Testes e homologação

## Escopo e execução

Referência normativa: **DXi — Guia de Engenharia de Software, versão 1.0, agosto de 2026**, especialmente seções 5, 7, 10, 12 e 14. O guia foi fornecido pelo usuário; este documento registra os requisitos aplicáveis, sem substituir a referência oficial.

Para backend Python, a referência estabelece **FastAPI com Controller–Service–Repository**. Portanto, `server/` é a base a alinhar ao guia; Flask não deve ser tratado como alternativa equivalente para esta entrega.

**Decisão do projeto (26/08/2026): manter React/JavaScript no frontend**, conforme orientação do responsável por esta tarefa. A migração para Angular/TypeScript não faz parte do escopo. Essa decisão é uma exceção explícita às seções 2.2, 6 e 7 do guia, não uma declaração de conformidade integral nem de aprovação corporativa. Registrar a exceção na revisão do time. Permanecem aplicáveis a separação de responsabilidades, os serviços de comunicação com a API, o controle de acesso, os testes e os critérios de homologação. Os testes de interface e ponta a ponta devem validar o dashboard React existente.

O guia não define o contrato específico de ingestão dos KPIs deste projeto. A conexão robô → API deve ser alinhada ao contrato existente no backend, sem atribuir ao guia detalhes que ele não fornece.

Esta entrega adiciona testes automatizados e um roteiro de aceite. Não representa aprovação por usuários nem validação de produção.
Os testes usam mensagens/planilhas sintéticas, mocks de banco e HTTP; não precisam de credenciais reais.

Na raiz, com Python 3.12:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-test.txt
.\.venv\Scripts\python.exe -m pytest -q
cd dashboard
npm test
```

O teste JavaScript usa o runner nativo do Node (22 ou superior), sem dependências adicionais.
`requirements-test.txt` adota as versões do backend FastAPI. Não instalar junto com o requirements da raiz no mesmo comando: existem versões conflitantes.

## Matriz de cobertura

### Etapa 4 — Gmail real → ingestão local controlada

Verificado com a mensagem sintética enviada pelo usuário: Gmail → anexo → extrator → cliente HTTP do robô → FastAPI → PostgreSQL de homologação → React. Primeiro envio `processed`, repetição `skipped`, valores confirmados por consulta autenticada e pela interface. Ambiente separado, porta limitada a 127.0.0.1:15001 e credenciais próprias da API. Instruções em [homologacao-gmail-local.md](homologacao-gmail-local.md). É um E2E técnico controlado; não equivale ao aceite dos usuários nem à produção.

### Etapa 5 — serviço completo e histórico real (26/08/2026)

Executado `scripts/validate_full_gmail_bot.py` contra o Gmail de teste e a API local. O script restringiu a busca ao assunto exato e ao único anexo `logistic_cost.xlsx`, manteve a INBOX somente leitura e usou `EmailProcessingService`, `KpiExtractor`, `ApiReportSender` e `SqliteProcessingRepository` reais. Primeira execução: 1 encontrada, 1 processada, 0 erros. Segunda execução com o mesmo histórico: 1 encontrada, 1 duplicada, 0 processadas, 0 erros. O SQLite registrou uma linha `PROCESSADO` com um anexo; a API preservou Jan/Y26 = 0.04/0.05/0.8. Isso valida o ciclo manual do serviço, mas não o agendamento no BotCity nem concorrência.

### Etapa 6 — permissões na homologação local (26/08/2026)

O ambiente passou a preparar os papéis ADMIN e VISUALIZADOR e credenciais locais distintas, ignoradas pelo Git. Executado `scripts/validate_local_permissions.py`: ADMIN autenticou e cadastrou o VISUALIZADOR; o novo usuário autenticou, confirmou o papel em `/api/auth/me` e leu Jan/Y26; cadastro de usuário e análise administrativa foram bloqueados com HTTP 403. Acesso sem token, token inválido e senha incorreta foram bloqueados com HTTP 401. Os 15 testes automatizados de segurança também passaram. Na conferência visual, o cabeçalho exibiu VISUALIZADOR e a Visão Geral mostrou Jan/Y26 = 5%/4%/80%; Cost x Product permaneceu vazio por ausência de dados. O teste revelou que Analytics era acessível localmente no React; a interface foi corrigida para ocultar menu, alertas administrativos e impedir a navegação interna para esse painel fora do papel ADMIN. Após a correção, 12 testes JavaScript e o build foram aprovados, e o usuário confirmou visualmente que Analytics desapareceu no modo VISUALIZADOR.

### Etapa 7 — dados incompletos e incorretos (27/08/2026)

O extrator passou a rejeitar explicitamente planilhas sem registros, colunas obrigatórias ausentes, mês/ano inválidos, texto ou célula vazia em número obrigatório, valores negativos, `NaN` e infinito. O lote é atômico: se qualquer linha for inválida, todas as listas extraídas são descartadas e nada é enviado à API. A API aplica as mesmas restrições, rejeita metadados de e-mail vazios e payload sem registros com HTTP 422. A suíte local terminou com **81 testes aprovados, zero skips e zero warnings**. No Docker isolado, **11 testes** passaram com FastAPI e PostgreSQL reais, confirmando ausência de KPI e histórico parcial após rejeição, além de permitir nova tentativa corrigida. As mensagens de locale/trust vistas no início são emitidas pelo `initdb` da imagem oficial `postgres:17-alpine`; não são warnings do pytest nem da aplicação.

### Etapa 3 — envio do robô pela API

Implementado `ApiReportSender` e conectado ao entrypoint `rpa_email.bot`. O serviço deixou de escrever KPIs diretamente no PostgreSQL/cache Excel; registra sucesso somente após confirmação da API. Falhas e anexos sem registros válidos permitem nova tentativa, com pastas separadas. Configuração e limites em [robo-ingestao-api.md](robo-ingestao-api.md). Verificação: 62 testes locais aprovados, 1 externo ignorado; 5 testes Docker aprovados, incluindo mensagem sintética → serviço do robô → HTTP real → PostgreSQL. Gmail e React não participaram dessa execução.

Os achados sobre escrita direta e sucesso após falha abaixo descrevem o diagnóstico inicial: foram tratados no bot principal. O legado `bot_local.py`, os Composes normais e a validação completa de linhas inválidas ainda exigem trabalho.

### Validação Gmail → anexo → extração (26/08/2026)

Executado `scripts/validate_gmail_test.py` com credenciais locais não exibidas: autenticação Gmail, abertura da INBOX somente leitura, busca pelo assunto exato `Relatorio Logistico - TESTE EPICO 7`, download de `logistic_cost.xlsx` e extração usando `KpiExtractor` do projeto. Conferidos Jan/Y26, target 0.04, result 0.05 e achievement 0.8. Nenhuma mensagem foi alterada e nenhum dado foi enviado à API/banco. Esta evidência não equivale à execução do robô completo nem ao E2E até o React.

Para repetir somente esta verificação com a mensagem sintética e o `.env` configurado:

```powershell
.\.venv\Scripts\python.exe scripts/validate_gmail_test.py
```

O script consulta até dez candidatos pelo assunto e usa o mais recente com assunto exato; salva somente o anexo esperado, numa pasta nova em `rpa_email/resources/attachments/gmail-validation/` (ignorada pelo Git). Não executa automaticamente na suíte local/CI e não substitui o teste de integração pendente.

### Etapa 1 — autenticação e contrato API/React (26/08/2026)

- Corrigido o login do cliente: token e usuário só são armazenados depois da resposta válida de `/api/auth/me`; falhas não deixam a sessão anterior ou uma sessão parcial.
- Corrigido o mapeamento `logistics_cost`/`production_amount` da FastAPI para `logisticsCost`/`productionAmount` consumidos pelo React, incluindo valores zero.
- Adicionados testes com SQLite real em memória, usando rotas, serviços, repositórios, bcrypt e JWT: cadastro por ADMIN, login do usuário cadastrado, leitura dos KPIs e bloqueio de cadastro por VISUALIZADOR. Esse perfil é criado apenas no banco temporário; não define a matriz corporativa de permissões.
- Verificados 26 testes do backend e 11 testes do cliente JavaScript. O build React passou após instalar dependências declaradas que faltavam localmente; persiste o aviso de bundle acima de 500 kB. Não houve verificação visual no navegador nesta etapa.
- SQLite não substitui os testes de PostgreSQL (migrations, upsert e concorrência), nem os testes E2E. O `skip` da integração externa permanece pendente, sem ser ocultado.

Para repetir a verificação desta etapa na raiz:

```powershell
.\.venv\Scripts\python.exe -m pytest server/tests -v -p no:cacheprovider
npm.cmd --prefix dashboard test
npm.cmd --prefix dashboard run build
```

O parâmetro `-p no:cacheprovider` desativa apenas o cache opcional do pytest; outros avisos e falhas continuam visíveis.

**Etapa 2:** ambiente isolado implementado em `docker-compose.test.yml`, com migrations, FastAPI, PostgreSQL descartável e testes HTTP reais. Instruções e limites em [ambiente-integracao.md](ambiente-integracao.md). Não executar o Compose principal como prova de homologação: `Dockerfile.api` ainda inicia Flask. Depois conectar o robô à ingestão HTTP com tratamento de falhas e executar o fluxo integrado.

| Item do épico | Evidência automatizada | Validação ainda necessária |
| --- | --- | --- |
| Autenticação | `server/tests/integration/test_security.py`: login, senha incorreta, usuário inexistente, token ausente/inválido/expirado | Login no navegador e credenciais corporativas, se adotadas |
| Permissões | ADMIN e VISUALIZADOR reais; backend com 401/403; React restringe Analytics ao ADMIN; revalidação visual aprovada | Aprovar formalmente a matriz corporativa com o time |
| Integração e-mail | MIME sintético e Gmail real somente leitura com filtro exato aprovados | Falhas/reconexão do provedor e política final de filtros |
| Identificação dos títulos | Assunto MIME codificado existente; identificação de cinco KPIs pelo nome do anexo | Assuntos aceitos/rejeitados pelo robô e planilhas reais aprovadas |
| Leitura de anexos | `rpa_email/tests/test_extraction.py`: gravação e leitura Excel, arquivo corrompido | Múltiplos anexos, limites de tamanho e formatos oficialmente aceitos |
| Extração dos dados | Valores e cálculo de achievement em cinco KPIs | Comparação de todos os indicadores com planilha de referência |
| Dados incompletos/incorretos | Planilha e API rejeitam lote inteiro para campos/colunas ausentes, vazio, mês/ano inválido, texto, negativo, NaN, infinito e arquivo corrompido; PostgreSQL real sem gravação parcial | Regras adicionais de limite máximo dependem do negócio |
| Prevenção de duplicidade | API por Message-ID e histórico local do serviço completo aprovados em reexecução real | Concorrência e regra corporativa de atualização |
| API → Dashboard | Testes do cliente e conferência autenticada da API real no navegador | Ampliar para todos os indicadores e automatizar navegador |
| E-mail → Dashboard | E2E técnico controlado aprovado com Gmail, serviço, API e React | Automação E2E, agendamento e aceite do usuário |
| Homologação com usuários | Roteiro abaixo | Execução e aceite dos usuários |
| Produção | Checklist abaixo | Execução autorizada no ambiente de produção |

## Pontos encontrados por inspeção, a confirmar com o time

1. `rpa_email/app/services.py` grava diretamente no PostgreSQL/cache, embora `server/` documente ingestão via HTTP. Alinhar a integração com o backend FastAPI e testar o caminho efetivamente implantado.
2. O robô captura falhas de extração/persistência e pode registrar o e-mail como PROCESSADO mesmo assim. Testar falha de banco e arquivo inválido antes de liberar: pode impedir nova tentativa.
3. Os schemas da ingestão não restringem mês/ano nem exigem lista não vazia. A política de validação precisa ser acordada; os testes atuais não comprovam rejeição de todos os dados incorretos.
4. `rpa_email/tests/integration_tests.py` apenas verifica presença de variáveis quando habilitado. Isso não comprova uma integração IMAP/PostgreSQL real.
5. Existem duas APIs (`api_server/` Flask e `server/` FastAPI). A suíte padrão usa FastAPI; conferir Docker, entrypoint e proxy para que o ambiente homologado use esse backend conforme o guia.

## Requisitos adicionais do guia DXi

| Requisito | Implementação/execução necessária | Estado |
| --- | --- | --- |
| E2E (10.1) | Fluxo técnico controlado Gmail → serviço → API → React registrado | Aprovado no cenário Jan/Y26; automação e demais cenários pendentes |
| Stress Test (10.1) | Definir carga, duração e limites aceitáveis com o time; executar em ambiente de teste isolado; medir erros, latência, perdas e duplicidade | Pendente |
| Schedule Test (10.1) | Agendar no BotCity Orchestrator, registrar horário previsto/real, runner, resultado e reexecução | Pendente; exige acesso corporativo |
| Segurança do ambiente de testes (10.2) | Não enviar dados ao area owner/usuário final; desabilitar ou remover a chamada `send_log` do caminho de testes, se existente; usar destinatários exclusivos de teste | Obrigatório em toda execução |
| DX Machine (10.2) | Executar e conferir o RPA no servidor definido pelo time; validar resolução 1920×1080/100% somente se houver automação visual | Pendente |
| Definition of Done (10.4) | Código e documentação no GitLab, code review, formulário, fluxograma, vídeo, artefato e aprovação do output pelo area owner | Pendente |
| Deploy (12.3) | Testes unitários aprovados antes de cada deploy; Docker, Portainer e Nginx; revisão e versionamento comprovados | Pendente de validação do ambiente |
| Monitoramento (12.1–12.2) | Integrar execução de produção ao Smart Office e acompanhar running rate acima de 85% | Pendente; exige acesso/contrato corporativo |
| DX Lake (13) | Validar envio dos dados pela Metadata API com contrato, autenticação e ambiente fornecidos pelo time | Pendente; contrato não consta no guia |

O guia exige GitLab para versionamento e cita GitHub Actions para CI/CD. Confirmar com o time como o pipeline é conectado ao repositório oficial; não migrar ou publicar o repositório automaticamente.

Os testes automatizados existentes não comprovam estes itens externos. Não remover cenários ou silenciar avisos para produzir uma evidência falsa de aceite. A integração técnica real já possui ambiente isolado; homologação com usuários, produção e acessos corporativos continuam dependendo de execução externa registrada.

## Roteiro ponta a ponta em homologação

Pré-condições: ambiente separado, banco de teste, caixa postal dedicada, ADMIN de teste, versão/commit registrados, robô/API/dashboard em execução. Usar dados sintéticos; não registrar senhas ou tokens nas evidências.

1. Confirmar FastAPI no ambiente e o caminho do robô até a API/banco. Registrar URLs, versão e configuração sem segredos. Bloquear envio ao usuário final e desabilitar `send_log` no caminho de testes, se existente.
2. Preparar Excel de referência com mês/ano aceitos, KPI identificado pelo nome/aba e valores conhecidos (ex.: target 0.04, result 0.05, achievement 0.8). Registrar formato percentual esperado na tela.
3. Enviar para a caixa de teste com assunto/remetente permitidos e Message-ID único. Registrar horário e identificador.
4. Executar o robô e conferir anexos salvos, logs e persistência. Nenhum erro deve ser mascarado como sucesso.
5. Fazer login no dashboard. Conferir valores na resposta da API e na tela, período, unidades, arredondamento e ausência de dados mock substituindo silenciosamente os reais.
6. Reexecutar o mesmo e-mail. Confirmar que a contagem de registros não aumenta. Enviar outro Message-ID para o mesmo período com valor corrigido e confirmar a regra de atualização acordada.
7. Repetir com assunto inválido, anexo corrompido, campo obrigatório ausente e falha de banco/API. Exigir erro rastreável, ausência de dados parciais e possibilidade de reprocessamento quando aplicável.
8. Testar saída da sessão, acesso sem token, token expirado e acesso não autorizado às rotas administrativas. Não criar perfis novos em produção só para testar.
9. Anexar evidências e abrir defeitos com passos de reprodução. Reexecutar após correção.

## Homologação com usuários

Separar testes técnicos de aceite: durante os testes do RPA, o usuário final fica fora do ambiente e não recebe dados, conforme 10.2. Depois da validação técnica, organizar com o time uma sessão de aceite do output pelo area owner, conforme 10.4, sem envio automático dos dados de teste. Registrar a aprovação e, na sessão de homologação autorizada, a avaliação de login, indicadores, filtros e comparação com a referência.

Critério proposto para aceite (aprovar com o time): cenários obrigatórios aprovados; nenhuma falha crítica/alta aberta; valores conferidos; permissões respeitadas; processamento rastreável; aprovação nominal do responsável do negócio. Itens não executados permanecem pendentes.

Usar o [Termo de Homologação com Usuários](termo-homologacao-usuarios.md) durante a sessão. O arquivo deve permanecer pendente até ser preenchido e confirmado por um representante real do negócio.

| ID/cenário | Versão/ambiente | Resultado esperado | Resultado observado | Evidência sem segredos | Defeito | Executor/data | Aceite |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A preencher | | | | | | | Pendente |

## Validação de produção — somente com autorização

Antes do deploy: aprovação da mudança, backup/restauração verificados, migrations revisadas, plano de rollback com responsável, segredos fora do repositório, JWT_SECRET próprio, HTTPS, origem CORS e proxy conferidos.

Após deploy, iniciar com verificações de leitura: health (não comprova banco), login autorizado, resposta dos KPIs, renderização e logs sem segredos. Não fazer testes de carga, falha induzida, alteração de permissões ou envio de dados fictícios sem autorização específica. Se permitido, usar um relatório controlado e rastreável para confirmar o fluxo completo, com plano de limpeza aprovado.

Registrar versão, horário, responsáveis, evidências e decisão de manter/reverter. Sem acesso e execução reais, marcar produção como **pendente**, nunca aprovada por inferência dos testes locais.
