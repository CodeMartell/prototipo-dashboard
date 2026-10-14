# Integração FastAPI + PostgreSQL — Épico 7

Este ambiente verifica o backend por HTTP real e PostgreSQL real. Inclui o serviço do robô com mensagem/IMAP sintéticos; não conecta ao Gmail nem abre o React. Portanto, ainda não é o teste real E-mail → Dashboard.

## Executar

Com Docker Desktop em execução, na raiz do projeto:

```powershell
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from integration-tests
```

O primeiro build baixa imagens e dependências. A execução prepara o banco, aplica as migrations Alembic existentes, inicia FastAPI e executa a suíte `tests/system`; a quantidade varia por versão. O comando devolve o código de saída do executor: zero significa aprovação; valor diferente de zero significa erro. Quando o executor termina, os demais serviços são parados.

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

## Cobertura e compatibilidade

A suíte `tests/system/test_postgres_api.py` cobre login, ingestão, duplicidade,
rejeição atômica e mensagem sintética passando pelo serviço do robô com HTTP e
PostgreSQL reais. Não há mocks de banco ou HTTP; usa migrations versionadas.
O IMAP é sintético e o navegador não participa.

A API atual retorna `pending` e exige aprovação antes de aplicar KPIs. Cenários
que esperam `processed` e atualização imediata precisam de revalidação com esse
contrato. Um teste que falha por essa diferença deve continuar sinalizando a
falha; esta reorganização não altera o contrato nem o resultado esperado para
produzir uma aprovação artificial. As contagens históricas estão no
[registro do Épico 7](../history/epic-7-validation.md).

Ainda é necessário validar concorrência, IMAP real, navegador, stress,
agendamento e aceite por usuários.

## CI

O job `postgres-integration` executa o mesmo comando e publica os logs como artefato. A execução local não comprova que o job remoto foi executado. O Compose principal e o ambiente de testes usam FastAPI, com imagens e bancos separados.
