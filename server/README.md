# Dashboard KPI Logístico — Backend

FastAPI, padrão CSR (Controller-Service-Repository). Este backend é dono do banco — o bot de extração chama `POST /api/ingestion/kpi-report` em vez de escrever direto no Postgres. Perfil único por enquanto: **ADMIN**.

## Passo a passo

```bash
# 1. Postgres via Docker
docker run --name pg-dashboard -e POSTGRES_PASSWORD=senha123 -e POSTGRES_DB=dashboard_kpi -p 5432:5432 -d postgres:16
# próximas vezes: docker start pg-dashboard

# 2. Ambiente virtual
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt

# 3. Configurar .env
copy .env.example .env       # Windows
cp .env.example .env         # Mac/Linux

# 4. Migrations
# Primeira vez (arquivo já vem pronto no repo), só aplica:
alembic upgrade head

# Se você mudou algum model (app/models/*.py) e precisa gerar uma migration NOVA:
alembic revision --autogenerate -m "descricao da mudanca"
alembic upgrade head

# 5. Criar perfil ADMIN + usuário
python scripts/seed_roles.py
python scripts/create_admin.py teste@gmail.com senha123

# 6. Subir a API
python main.py
```

API em `http://localhost:5001` — docs em `/docs`. 

## Estrutura

server/
├── main.py # entry point, registra rotas e middlewares
├── app/
│ ├── controllers/ # recebe HTTP, valida entrada, devolve resposta
│ │ ├── auth_controller.py # login
│ │ ├── user_controller.py # criar usuário (ADMIN)
│ │ ├── dashboard_controller.py # GET /api/kpis/*
│ │ ├── analysis_controller.py # GET /api/analysis/* (anomalia, YoY)
│ │ └── ingestion_controller.py # POST /api/ingestion/kpi-report
│ ├── services/ # regra de negócio
│ │ ├── auth_service.py
│ │ ├── user_service.py
│ │ ├── dashboard_service.py
│ │ ├── analysis_service.py
│ │ └── ingestion_service.py
│ ├── repositories/ # única camada que faz SQL
│ │ ├── user_repository.py
│ │ ├── role_repository.py
│ │ ├── dashboard_repository.py
│ │ └── processed_email_repository.py
│ ├── models/ # tabelas (SQLAlchemy)
│ │ ├── user.py / role.py
│ │ ├── kpi.py # 5 tabelas de KPI + logistics_vs_prod
│ │ └── processed_email.py
│ ├── schemas/ # contratos de entrada/saída (Pydantic)
│ ├── database/ # engine + sessão do Postgres
│ └── core/ # config, JWT, exceções, logging, dependencies
├── alembic/ # migrations versionadas
├── scripts/
│ ├── seed_roles.py # cria perfil ADMIN
│ └── create_admin.py # cria o primeiro usuário
└── tests/ # pytest (5 testes)


## Testes

```bash
pytest tests/
```