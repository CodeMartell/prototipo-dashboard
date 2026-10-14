# 🤖 Manual Rápido: Execução do Bot (RPA) e Reset de Dados de KPIs

> **⚡ Comandos Rápidos no Terminal (VSCode / Antigravity):**
> * 🎯 **Zerar os dados dos Cards de KPI (SEM apagar usuários):**
>   ```cmd
>   .\reset_kpis.bat
>   ```
>   *(ou `python scripts/reset_kpis.py`)*
> * 🚀 **Executar o Robô de E-mail (via Docker):**
>   ```cmd
>   docker compose run --rm --build rpa-bot
>   ```
> * 🐍 **Executar o Robô de E-mail (Local):**
>   ```cmd
>   python -m rpa_email
>   ```

---

## 🎯 Fluxo Recomendado de Teste do Robô (Ciclo do Zero)

Quando você quiser testar o processamento do robô com base limpa:

1. **Zere os dados dos KPIs** no terminal:
   ```cmd
   .\reset_kpis.bat
   ```
   *(ou `python scripts/reset_kpis.py` - Funciona tanto para o Docker quanto local. Apaga apenas os cards, a fila de aprovação e o histórico do robô. Seus usuários `admin`, `gestor`, etc. continuam intactos).*
2. **Execute o robô**:
   ```cmd
   docker compose run --rm --build rpa-bot
   ```
3. **Acesse o Dashboard** em [http://localhost:5173](http://localhost:5173) e faça login com seu usuário existente (ex: `admin@lge.com` / `admin123` ou suas credenciais do `.env`).
4. **Vá em Perfil / Ingestões** e clique em **Aprovar** no lote recebido.
5. **Pronto!** Os novos dados preencherão os cards e gráficos dos KPIs.

---

## Índice
1. [🔄 Como Resetar os Dados de KPIs (Sem Apagar Usuários)](#-como-resetar-os-dados-de-kpis-sem-apagar-usuários)
   - [1.1 O que o script de reset de KPIs faz](#11-o-que-o-script-de-reset-de-kpis-faz)
   - [1.2 Comando para rodar no terminal (VSCode / Antigravity)](#12-comando-para-rodar-no-terminal-vscode--antigravity)
   - [1.3 Alternativa dentro do container Docker](#13-alternativa-dentro-do-container-docker)
2. [🤖 Como Executar o Bot (RPA)](#-como-executar-o-bot-rpa)
   - [2.1 Configuração do .env](#21-configuração-do-env)
   - [2.2 Execução via Docker (Recomendado)](#22-execução-via-docker-recomendado)
   - [2.3 Execução Local via Python](#23-execução-local-via-python)
   - [2.4 Geração de Planilhas de Teste](#24-geração-de-planilhas-de-teste)
   - [2.5 Aprovação no Dashboard (Passo Obrigatório!)](#25-aprovação-no-dashboard-passo-obrigatório)
   - [2.6 Troubleshooting do Bot](#26-troubleshooting-do-bot)
3. [⚠️ Outros Tipos de Reset (Opcionais)](#️-outros-tipos-de-reset-opcionais)
   - [3.1 Reset Total Destrutivo no Docker (Apaga Volumes e Recria Usuários)](#31-reset-total-destrutivo-no-docker-apaga-volumes-e-recria-usuários)
   - [3.2 Re-popular com Dados Históricos de Demonstração (Seed)](#32-re-popular-com-dados-históricos-de-demonstração-seed)

---

# 🔄 Como Resetar os Dados de KPIs (Sem Apagar Usuários)

Para testar o robô enviando novos e-mails, você **não precisa e não deve** recriar os usuários do sistema. O objetivo é deixar a base de dados de KPIs **zerada**, mantendo os usuários e acessos já existentes.

### 1.1 O que o script de reset de KPIs faz

O script `scripts/reset_kpis.py`:
* ✅ **Esvazia os registros de todos os KPIs** (`kpi_logistic_cost`, `kpi_air_freight`, `kpi_incidental_cost`, `kpi_total_cost`, `kpi_demurrage`, `kpi_logistics_vs_prod`, `kpi_records`).
* ✅ **Limpa a fila de aprovação de e-mails** (`email_ingest_queue`).
* ✅ **Limpa o histórico de e-mails processados na API** (`processed_emails`), permitindo reprocessar os mesmos e-mails de teste.
* ✅ **Limpa evidências e planos de ação antigos** (`evidences`, `action_plans`, `kpi_change_logs`).
* ✅ **Reseta o arquivo de histórico do robô** (`email_history.db` no Docker e localmente) para que ele não ignore e-mails como duplicados.
* 🛡️ **PRESERVA TOTALMENTE INTACTOS:** As tabelas `users`, `roles`, `permissions`, senhas e logins.

### 1.2 Comando para rodar no terminal (VSCode / Antigravity)

Abra o terminal do VSCode ou Antigravity na raiz do projeto e execute:

```powershell
python scripts/reset_kpis.py
```
*(Ou se o seu terminal estiver dentro da pasta `scripts`: `python reset_kpis.py`)*

**Exemplo de saída no terminal:**
```text
=================================================================
  RESET ESPECIFICO DE DADOS DE KPI (USUARIOS PRESERVADOS)
=================================================================
Conectando ao banco: postgresql+psycopg:***@localhost:5434/dashboard

[1/2] Limpando tabelas de dados de KPI no banco de dados...
  [OK] action_plans: 2 registro(s) apagado(s) (tabela zerada)
  [OK] evidences: 0 registro(s) apagado(s) (tabela zerada)
  [OK] kpi_change_logs: 188 registro(s) apagado(s) (tabela zerada)
  [OK] email_ingest_queue: 4 registro(s) apagado(s) (tabela zerada)
  [OK] processed_emails: 4 registro(s) apagado(s) (tabela zerada)
  [OK] kpi_logistic_cost: 19 registro(s) apagado(s) (tabela zerada)
  [OK] kpi_air_freight: 19 registro(s) apagado(s) (tabela zerada)
  [OK] kpi_incidental_cost: 18 registro(s) apagado(s) (tabela zerada)
  [OK] kpi_total_cost: 18 registro(s) apagado(s) (tabela zerada)
  [OK] kpi_demurrage: 18 registro(s) apagado(s) (tabela zerada)
  [OK] kpi_logistics_vs_prod: 18 registro(s) apagado(s) (tabela zerada)

  [SEGURANCA] 6 usuario(s) mantido(s) intacto(s) na tabela 'users'!
  [SEGURANCA] 5 perfil(is) mantido(s) intacto(s) na tabela 'roles'!

[2/2] Limpando historico de e-mails e anexos do robo...
  [OK] Pasta de anexos esvaziada
  [OK] Historico do robo no container/volume Docker resetado com sucesso!

=================================================================
  [SUCESSO] BASE DE DADOS DE KPIS TOTALMENTE ZERADA!
  Os usuarios, senhas e permissoes de login continuam intactos.
  O robo de e-mail agora pode ser executado para processar do zero.
=================================================================
```

### 1.3 Alternativa dentro do container Docker

Caso prefira rodar diretamente dentro do container da API:

```powershell
docker compose exec api python scripts/reset_kpis.py
```

---

# 🤖 Como Executar o Bot (RPA)

O robô conecta na caixa de e-mail via IMAP, baixa os relatórios anexados (`.xlsx`/`.xlsb`), extrai os indicadores e envia para a fila da API.

### 2.1 Configuração do .env

Confira no `.env` as variáveis de e-mail e de autenticação:

```dotenv
# --- Configuração de E-mail (Gmail IMAP) ---
EMAIL_USER=seu-email-de-teste@gmail.com
EMAIL_PASSWORD=sua-senha-de-aplicativo        # Senha de aplicativo de 16 caracteres gerada na conta Google
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_MAILBOX=INBOX
EMAIL_SUBJECT_FILTER="Relatorio Logistico, Incidental Cost, Freight Air result, War Room, Vessel Report"
EMAIL_SENDER_FILTER=                         # Opcional (deixe vazio para aceitar qualquer remetente)
EMAIL_DATE_FROM=2026-01-01                   # Intervalo onde se encontram os e-mails
EMAIL_DATE_TO=2026-12-31

# --- Autenticação do Robô na API ---
RPA_API_EMAIL=admin@lge.com                  # Usuário existente no banco (ou bot.local@example.com)
RPA_API_PASSWORD=admin123                    # Senha do usuário
RPA_API_URL=http://localhost:5001            # Use http://localhost:5001 (local) ou http://localhost:9192 (se API no Docker)
```

> [!TIP]
> **Gmail:** Ative a verificação em duas etapas no Google e gere uma **Senha de App** (*App Password*) de 16 letras em *Segurança > Verificação em duas etapas > Senhas de app*.

---

### 2.2 Execução via Docker (Recomendado)

Com o banco e a API ativos (`docker compose ps`):

```powershell
docker compose run --rm --build rpa-bot
```

**Resultado esperado:**
```text
Execucao concluida | encontrados=4 processados=4 duplicados=0 fora_do_padrao=0 erros=0
```

---

### 2.3 Execução Local via Python

Se estiver rodando a API na máquina hospedeira sem Docker:

```powershell
python -m rpa_email
```

---

### 2.4 Como fazer o robô executar TODOS os scripts de extração existentes

No seu teste anterior, o log indicava:
```text
E-mail UID 2923 processado com 1 anexo(s)
```
Como o e-mail continha apenas **1 anexo**, o robô executou apenas o extrator específico correspondente àquele arquivo. O robô só roda os extratores dos arquivos que ele de fato encontrar nos anexos do e-mail.

O projeto possui **6 scripts de extração especializados** em `rpa_email/extractors/`:
1. `war_room_report.py` (Logistic Cost)
2. `air_freight.py` (Air Freight)
3. `resin_consolidation.py` (Resin Consolidation)
4. `task_cost_reduction.py` (Task Cost Reduction)
5. `demurrage_cost.py` (Demurrage Cost)
6. `logistics_cost_vs_prod_amount.py` (Logistics vs Prod)

Para fazer o robô executar **TODOS os extratores**, utilize uma das opções documentadas no `development.md`:

#### Opção 1: Enviar os 4 Relatórios Brutos (Seção 10 do development.md)
Envie um e-mail com assunto `Relatorio Logistico` contendo os 4 arquivos originais da LG (exemplos em `scratch/test_email_686/`):
* `War Room` (`.xlsb` ou `.xlsx`) ➔ dispara `war_room_report.py`
* `Freight Air` (`.xlsb` ou `.xlsx`) ➔ dispara `air_freight.py`
* `3-indicadores` (`.xlsx`) ➔ dispara `resin_consolidation.py`, `task_cost_reduction.py` e `demurrage_cost.py`
* `Incidental Cost_Total` (`.xlsb` ou `.xlsx`) ➔ dispara `logistics_cost_vs_prod_amount.py`

Em seguida, execute o robô:
```cmd
docker compose run --rm --build rpa-bot
# ou local:
python -m rpa_email
```

#### Opção 2: Enviar Todas as 6 Planilhas Normalizadas (Seção 9 do development.md)
O repositório possui um script que gera e envia automaticamente por e-mail as **6 planilhas normalizadas de uma só vez**:
```cmd
# Envia o e-mail com as 6 planilhas anexadas:
python scripts/send_all_kpis_incremental_test_email.py

# Executa o robô para processar as 6 planilhas:
python -m rpa_email
```

#### Opção 3: Executar Todos os Extratores Imediatamente via Testes (Seção 3 do development.md)
Se você deseja validar a execução do código de **todos os extratores diretamente no terminal** (sem depender de envio ou leitura de e-mails):
```cmd
python -m pytest rpa_email/tests -q
```
*(Executa a suíte de testes passando planilhas reais/sintéticas por todos os 6 extratores).*

---

### 2.5 Aprovação no Dashboard (Passo Obrigatório!)

> [!IMPORTANT]
> O log `processados=4` do robô confirma a **entrega para a fila da API**. Para que os dados preencham os cards e gráficos:

1. Acesse o Dashboard em [http://localhost:5173](http://localhost:5173).
2. Faça login com seu usuário (ex: `admin@lge.com` / `admin123`).
3. Vá na tela de **Perfil** / Ingestões.
4. Localize o lote pendente e clique no botão **Aprovar**.
5. Volte para os dashboards de indicadores para visualizar os cards preenchidos!

---

### 2.6 Troubleshooting do Bot

* **`duplicados=N` e `processados=0`:**
  O robô já processou esses e-mails antes. Execute `python scripts/reset_kpis.py` para limpar o histórico do robô e a fila da API.
* **`AUTHENTICATIONFAILED` no IMAP:**
  Verifique se `EMAIL_USER` e a senha de app de 16 caracteres estão corretos no `.env`.
* **`encontrados=0`:**
  Verifique se o assunto contém os termos de `EMAIL_SUBJECT_FILTER`, se a data está dentro de `EMAIL_DATE_FROM` e `EMAIL_DATE_TO`, e se a mensagem está na pasta `INBOX`.

---

# ⚠️ Outros Tipos de Reset (Opcionais)

### 3.1 Reset Total Destrutivo no Docker (Apaga Volumes e Recria Usuários)

Use este método **somente** se você quiser destruir tudo e recriar o banco do zero absoluto:

```powershell
# 1. Encerra contêineres e APAGA todos os volumes (inclusive usuários cadastrados)
docker compose down -v

# 2. Sobe novamente a infraestrutura limpa
docker compose up -d --build db api frontend
```

### 3.2 Re-popular com Dados Históricos de Demonstração (Seed)

Se após zerar os KPIs você quiser preencher o banco com os dados históricos de demonstração do projeto:

* **No Docker:**
  ```powershell
  docker compose exec api python scripts/seed_history_data.py
  ```
* **No Local:**
  ```powershell
  python server/scripts/seed_history_data.py
  ```
