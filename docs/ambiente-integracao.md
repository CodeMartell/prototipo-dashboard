# Integração FastAPI + PostgreSQL — Épico 7

Este ambiente verifica o backend por HTTP real e PostgreSQL real. Inclui o serviço do robô com mensagem/IMAP sintéticos; não conecta ao Gmail nem abre o React. Portanto, ainda não é o teste real E-mail → Dashboard.

## Executar

Com Docker Desktop em execução, na raiz do projeto:

```powershell
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from integration-tests
```

O primeiro build baixa imagens e dependências. A execução prepara o banco, aplica as migrations Alembic existentes, inicia FastAPI e executa cinco testes. O comando devolve o código de saída do executor: zero significa aprovação; valor diferente de zero significa erro. Quando o executor termina, os demais serviços são parados.

Para consultar as evidências:

```powershell
docker compose -f docker-compose.test.yml logs integration-tests
docker compose -f docker-compose.test.yml logs api-test
```

Para remover somente os containers e a rede deste ambiente:

```powershell
docker compose -f docker-compose.test.yml down
```

## Isolamento

- Projeto Compose `datalens-epico7-tests`, separado do Compose principal.
- Nenhuma porta publicada, montagem de diretório do host ou volume persistente.
- PostgreSQL em tmpfs: os dados sintéticos são descartados quando ele para.
- Credenciais fixas exclusivas de teste; nunca reutilizar em produção.
- Nenhum `.env` do projeto é carregado nos containers; arquivos `.env` também são excluídos do contexto de build.
- Testes exigem o endereço e nome do banco isolado; configuração ausente ou diferente falha explicitamente, sem `skip` e sem fallback para produção.
- Não iniciar com o Compose principal nem conectar o robô/usuários a este banco.

## Cenários

Atualização da etapa 3: **5 testes aprovados em 3,40 s**, incluindo o serviço do robô com mensagem sintética, extração real, ingestão autenticada por HTTP e PostgreSQL. Serviços encerrados com código zero.

Execução local mais recente em 27/08/2026: migrations aplicadas, **11 testes aprovados**, sem testes ignorados ou warnings do pytest. O boot dos contêineres emitiu avisos de infraestrutura na inicialização de locale/autenticação local do PostgreSQL Alpine; esses avisos não devem ser confundidos com aprovação de configuração para produção.

1. Usuário sintético persistido faz login por HTTP; relatório é ingerido e lido pela API. Repetição do Message-ID não duplica; nova mensagem corrige o mesmo mês/ano sem criar outra linha.
2. Lote com registro válido seguido de KPI desconhecido retorna 422 e não deixa gravação parcial nem histórico de sucesso. O mesmo Message-ID pode ser reenviado após correção.
3. Campo obrigatório ausente retorna 422 sem histórico de processamento.
4. Consulta sem autenticação retorna 401.
5. Mensagem sintética com Excel passa pelo serviço do robô e cliente HTTP real; valores são conferidos na API. Reexecução com histórico local novo também não duplica no banco.

Não há mocks de banco ou de HTTP nesta suíte. Ela usa o código existente de serviços/repositórios e as migrations, não `create_all`. Ainda faltam concorrência, integração IMAP, robô → API, navegador, stress, agendamento e aceite.

## CI

O job `postgres-integration` executa o mesmo comando e publica os logs como artefato. A execução local não comprova que o job remoto foi executado. O Compose principal ainda inicia Flask; este ambiente usa `Dockerfile.test-api` para testar FastAPI sem alterar os containers existentes.
