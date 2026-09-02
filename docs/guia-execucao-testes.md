# Guia Completo de Execucao e Testes — Prototipo DataLens

Este documento contem todos os comandos detalhados, diretorios de execucao e passos necessarios para executar e validar o fluxo de ponta a ponta (E-mail -> Automacao RPA -> Extracao -> Planilha/Banco -> API -> Dashboard).

---

## 1. Estrutura dos Arquivos Principais

* Raiz do projeto: `c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard`
* Servidor API (FastAPI): `server\main.py`
* Robo de E-mail (IMAP): `rpa_email\bot.py`
* Robo Local (sem e-mail/offline): `rpa_email\bot_local.py`
* Frontend (Dashboard React): `dashboard\`
* Planilhas de Teste KPI: `kpi_reports\`
* Arquivo de Configuracao: `.env`
* Cache Local de Dados: `dados_dashboard.xlsx`

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

---

### Terminal 3 — Executar o Robo de E-mail (RPA)
Objetivo: Ler o e-mail recebido, baixar os anexos, extrair e atualizar a base.

```powershell
cd c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard
python -m rpa_email.bot
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
   python -m rpa_email.bot
   ```
3. Resultado esperado nos logs:
   ```text
   [EMAIL] E-mail UID ... localizado com X anexo(s)
   [EXTRACTION] Analisando relatorio_logistic_cost.xlsx -> 48 registros extraidos
   [EXCEL] Cache local salvo com sucesso: dados_dashboard.xlsx
   Execucao concluida | encontrados=1 processados=1 erros=0
   ```

---

### Teste B — Validacao Planilha Local -> Dashboard (Sem precisar enviar e-mail)

1. Abra o arquivo Excel `kpi_reports\relatorio_logistic_cost.xlsx` (ou `dados_dashboard.xlsx`).
2. Altere o valor da linha Jan / Y26 na coluna result de 0.0538 para 0.095 (9.5%).
3. Salve e feche o arquivo.
4. Execute o bot local para importar a alteracao:
   ```powershell
   cd c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard
   python -m rpa_email.bot_local
   ```
5. No navegador (http://localhost:5173), clique no botao Recarregar no rodape (ou pressione F5).
6. Selecione o filtro de periodo Ano: Y26, Mes: Jan.
7. Resultado esperado na interface: O indicador War Room mudara para 9.50%.

---

### Teste C — Teste Ponta a Ponta (E2E Completo)

1. Certifique-se de que a API (Terminal 1) e o Dashboard (Terminal 2) estao rodando.
2. Edite uma das planilhas em `kpi_reports/` com novos valores ficticios.
3. Envie essa planilha por e-mail com o assunto `Relatorio Logistico`.
4. No Terminal 3, rode o robo:
   ```powershell
   cd c:\Users\ROMULO_LIRA\Documents\prototipo-dashboard
   python -m rpa_email.bot
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