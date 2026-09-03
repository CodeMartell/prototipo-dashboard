# Robô → FastAPI: implementação e limites

O entrypoint `python -m rpa_email` envia KPIs à FastAPI. O antigo `bot_local.py`, que escrevia diretamente no banco, foi removido; a API é a única porta de entrada para os dados de KPI.

## Fluxo

1. O robô seleciona as mensagens conforme os filtros existentes.
2. Cada tentativa salva os anexos em uma pasta nova.
3. O extrator produz os registros; ausência de anexos, extração com erros reportados e ausência de registros válidos impedem envio.
4. O cliente faz login na API e envia o contrato para `/api/ingestion/kpi-report`, com JWT e limite de espera configurável.
5. Somente resposta HTTP 200 com `processed` ou `skipped` permite marcar PROCESSADO localmente.
6. Falha registra ERRO. A próxima execução pode tentar novamente com o mesmo Message-ID. Se a API já havia gravado antes de ocorrer uma falha de rede ou de histórico local, ela reconhece a duplicidade.

Não há retries automáticos dentro da mesma execução. O histórico local está separado do histórico legado: `rpa_email/resources/api_email_history.db`. KPIs não são escritos diretamente pelo robô no PostgreSQL e não há atualização/fallback para Excel neste entrypoint.

## Configuração (não executar ainda contra produção)

Além das credenciais Gmail e filtros já configurados, o bot exige:

```dotenv
RPA_API_URL=http://localhost:5001
RPA_API_EMAIL=
RPA_API_PASSWORD=
RPA_API_TIMEOUT=20
RPA_HISTORY_PATH=rpa_email/resources/api_email_history.db
```

Email/senha acima pertencem a um usuário da **FastAPI**, não ao Gmail. A rota atual exige ADMIN; usar conta dedicada no ambiente de testes. Não reutilizar senha de app do Gmail. Usar HTTPS fora de ambiente local/rede de testes confiável. O `.env` real não foi alterado pela implementação.

O Docker de testes não publica a API no host: `localhost:5001` é apenas exemplo e **não aponta para esse ambiente isolado**. Não preencher automaticamente nem iniciar o robô real antes de preparar a conexão controlada ao ambiente correto.

Ao mudar de banco/ambiente, usar outro arquivo de histórico local: mensagens marcadas PROCESSADO podem ser ignoradas localmente mesmo se não existirem no novo banco. Não excluir o histórico antigo sem revisar o impacto do reprocessamento.

## Testes

Suíte local: cliente HTTP com respostas simuladas (401/403/422/500, timeout, conexão, JSON inválido e confirmação desconhecida), falha seguida de tentativa bem-sucedida, duplicidade e rejeição de anexos/extração sem sucesso falso.

Teste Docker adicional: mensagem e transporte IMAP simulados; salvamento do Excel, extrator, serviço do robô, login e envio por HTTP reais, FastAPI, PostgreSQL e histórico SQLite reais. Confere os valores consultados na API e reprocessamento com histórico novo sem duplicidade no banco. Não conecta ao Gmail nem abre o React.

```powershell
.\.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from integration-tests
```

## Pendências preservadas

- Validar Gmail → robô → API no mesmo ambiente e depois conferir a tela React.
- Completar a validação de linhas parcialmente inválidas: o extrator ainda pode ignorar algumas linhas sem reportar erro. Este trabalho não declara rejeição integral de todo lote incorreto.
- Concorrência, limites de anexos, política de remetente/período, menor privilégio para conta do bot, rotação de credenciais, stress e agendamento.
- Composes de execução normal, monitoramento e homologação em produção.
