# Guia Completo de Execucao e Testes — Prototipo DataLens

Este documento contem todos os comandos detalhados, diretorios de execucao e passos necessarios para executar e validar o fluxo de ponta a ponta (E-mail -> Automacao RPA -> Extracao -> Planilha/Banco -> API -> Dashboard).

---

## 1. Estrutura dos Arquivos Principais

* Raiz do projeto: `c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard`
* Servidor API (FastAPI): `server\main.py`
* Robô de E-mail (IMAP): `python -m rpa_email`
* Frontend (Dashboard React): `dashboard\`
* Planilhas de Teste KPI: `kpi_reports\`
* Arquivo de Configuracao: `.env`
* Histórico local de deduplicação: `rpa_email\resources\api_email_history.db`

---

## 2. Configuracao Inicial do Ambiente

Abra o terminal PowerShell na raiz do projeto:
```powershell
cd c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard
```

### 2.1. Instalar as dependencias do Python
```powershell
# Backend FastAPI
pip install -r server/requirements.txt
# Robo de e-mail
pip install -r requirements.txt
```

### 2.2. Instalar as dependencias do Frontend
```powershell
cd dashboard
npm install
cd ..
```

### 2.3. Gerar as planilhas de teste (se necessario)
```powershell
python scripts/generate_kpi_reports.py
```

---

## 3. Como Executar a Aplicacao (3 Terminais)

Para o funcionamento continuo e visualizacao em tempo real, utilize 3 janelas do PowerShell abertas na raiz do projeto:

### Terminal 1 — Iniciar o Servidor API (Backend Local)
Objetivo: Fornecer os dados do banco para o Dashboard via http://localhost:5001/api/kpis/dashboard.

```powershell
cd c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard\server
python main.py
```
Saida esperada: `Uvicorn running on http://0.0.0.0:5001`

Alternativa via Docker (sobe banco + API juntos):
```powershell
docker compose up -d postgres api
```

---

### Terminal 2 — Iniciar a Interface do Dashboard (Frontend)
Objetivo: Executar a aplicacao web React + Vite.

```powershell
cd c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard\dashboard
npm run dev
```
Saida esperada: `Local: http://localhost:5173/`  
Abra seu navegador em: http://localhost:5173

> **Acesso ao Dashboard:** Se a aplicação solicitar autenticação, utilize as credenciais padrão sugeridas no `.env.example` (`bot.local@example.com` com a senha `troque-esta-senha-local`) ou as criadas localmente no seu banco através do script `create_admin.py`.

---

### Terminal 3 — Executar o Robo de E-mail (RPA)
Objetivo: Ler o e-mail recebido, baixar os anexos, extrair e atualizar a base.

```powershell
cd c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard
python -m rpa_email
```

---

## 4. Como Executar os Testes

---

### Teste A — Validacao E-mail -> Extracao -> Planilha Local

1. Envie um e-mail para a sua conta configurada (EMAIL_USER):
   * Assunto: `Relatorio Logistico`
   * Anexo: Anexe um ou mais arquivos da pasta `kpi_reports/` (ex: `kpi_reports/relatorio_logistic_cost.xlsx`).
2. No Terminal 3, execute o bot:
   ```powershell
   cd c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard
   python -m rpa_email
   ```
3. Resultado esperado nos logs:
   ```text
   [EXTRACTION] Analisando relatorio_logistic_cost.xlsx -> 48 registros extraidos
   E-mail UID ... processado com 1 anexo(s)
   Execucao concluida | encontrados=1 processados=1 erros=0
   ```

---

### Teste B — Validação local dos extratores

Execute os testes com planilhas sintéticas. Esse caminho não escreve no banco:

```powershell
python -m pytest rpa_email/tests -q
```

Para alterar dados do dashboard sem e-mail, use a API; não existe mais um fluxo
paralelo que escreve diretamente no PostgreSQL.

---

### Teste C — Teste Ponta a Ponta (E2E Completo)

1. Certifique-se de que a API (Terminal 1) e o Dashboard (Terminal 2) estao rodando.
2. Edite uma das planilhas em `kpi_reports/` com novos valores ficticios.
3. Envie essa planilha por e-mail com o assunto `Relatorio Logistico`.
4. No Terminal 3, rode o robo:
   ```powershell
   cd c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard
   python -m rpa_email
   ```
5. No Dashboard, clique em Recarregar.
6. Resultado: Os novos dados enviados por e-mail aparecem instantaneamente nos graficos e cartoes de KPI, com o selo API verde no rodape.

---

## 5. Comandos Utilitarios de Apoio

Verificar a saude da API no terminal:
```powershell
curl http://localhost:5001/api/health
```
Resposta esperada: `{"source":"excel_cache","status":"ok"}`

Verificar os ultimos e-mails recebidos na caixa postal:
```powershell
python scripts/quick_check.py
```
