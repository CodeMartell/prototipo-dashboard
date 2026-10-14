# 📄 RELATÓRIO TÉCNICO EXECUTIVO DO PROJETO
## Bot Extrator e Normalizador de Dados Logísticos (Épico 3 - War Room / DXI)

**Data de Elaboração:** 19 de Agosto de 2026  
**Responsável Técnico:** Equipe de Engenharia de Automação e ETL (Backend)  
**Projeto:** Plataforma War Room / DXI Dashboard  
**Repositório:** `bot-extrator-email`  

---

## 1. 🎯 FINALIDADE DO PROJETO

O **Bot Extrator de E-mails (Épico 3)** é um serviço autônomo de backend (RPA / ETL) desenvolvido para solucionar o gargalo de ingestão e tratamento manual de relatórios logísticos.

### Problema Resolvido:
- Relatórios semanais de fechamento logístico chegam por e-mail em planilhas Excel (`.xlsx`) complexas e "poluídas", contendo centenas de linhas, dezenas de colunas irrelevantes (códigos de ERP, centros de custo SAP, notas de auditoria) e abas auxiliares desnecessárias (frotas, fornecedores).
- O gestor precisava abrir manualmente cada planilha para localizar apenas meia dúzia de métricas críticas.

### Solução Entregue pelo Robô:
1. **Conexão e Ingestão Autônoma**: Conecta-se via IMAP SSL ao Gmail corporativo e localiza e-mails filtrados por assunto (`[Fechamento Logístico]`, `War Room`, etc.).
2. **Filtragem Cirúrgica**: Descarta automaticamente abas e colunas irrelevantes e isola com 100% de precisão apenas os 3 KPIs logísticos fundamentais.
3. **Data Quality & Normalização (ETL)**: Limpa e converte strings monetárias (`"$ 125.40"` -> `125.40`), percentuais (`"3,03%"` -> `0.0303`) e padroniza datas (`"Jan/26"` -> `mes="Jan", ano=2026`).
4. **Persistência Estruturada**: Grava os dados limpos em formato estruturado (`.json` e `.csv`) na pasta `dados_processados/` para que a equipe do projeto web (Dashboard DXI) consuma diretamente.
5. **Entrega Direta ao Gestor**: Dispara automaticamente um e-mail com **Relatório Executivo em HTML moderno** contendo cards de metas (🟢 Dentro da Meta / 🔴 Acima da Meta), tabela resumida e anexos CSV limpos.
6. **Controle Anti-Duplicidade**: Utiliza assinaturas criptográficas SHA-256 e IDs de e-mail para impedir reprocessamentos e envios repetidos.

---

## 2. 📊 OS 3 KPIS LOGÍSTICOS MONITORADOS

| KPI | Nome Completo | O que Mede | Mapeamento no JSON/CSV |
|---|---|---|---|
| **KPI 1** | **Logistic Cost KPI TV** | Custo Logístico Total sobre o Faturamento (%) | `logisticCost` (Faturamento MUSD, Custo MUSD, Realizado %, Meta %, Variação) |
| **KPI 2** | **Air Freight KPI TV** | Frete Aéreo sobre o Faturamento (%) | `airFreight` (Custo Frete Aéreo MUSD, Faturamento MUSD, Frete Aéreo %, Meta %) |
| **KPI 3** | **Logistics Cost x Product Amount** | Razão entre Custo Logístico e Volume de Produção | `logisticsVsProd` (Volume de Produção, Valor MUSD, Custo MUSD, Razão Custo/Prod) |

---

## 3. 🛠️ FERRAMENTAS, TECNOLOGIAS E ARQUITETURA

### Stack Tecnológica:
- **Linguagem**: Python 3.9+
- **Ambiente Virtual**: `.venv`
- **Manipulação de Dados**: `pandas` e `openpyxl`
- **Protocolos de Rede e E-mail**:
  - `imaplib` e `email` (Leitura IMAP segura SSL na porta 993)
  - `smtplib` e `MIMEMultipart` (Envio SMTP TLS na porta 587)
- **Interface e Logs**: `rich` (Terminal executivo com tabelas, cores e painéis)
- **Gestão de Segredos**: `python-dotenv` (`.env` e `.env.example`)
- **Testes Automatizados**: `pytest` (Suíte completa com 8 testes unitários)
- **Validação de Schemas**: `pydantic`

### Estrutura Modular do Projeto:
```text
bot-extrator-email/
├── .env.example              # Modelo seguro de variáveis de ambiente
├── .env                      # Configurações locais (Gmail IMAP/SMTP)
├── .gitignore                # Proteção contra vazamento de credenciais e logs
├── requirements.txt          # Dependências do projeto
├── config.json               # Regras de filtros de assunto, remetentes e mapeamento de KPIs
├── extrator.py               # Script principal CLI do robô
├── pytest.ini                # Configuração do executor de testes
├── caixa_de_entrada/         # Entrada de simulação offline (com planilha complexa)
├── dados_processados/        # Outputs (.json, .csv e registro anti-duplicidade)
├── logs/                     # Trilha de auditoria detalhada com timestamps
├── scripts/
│   ├── gerar_planilha_simulacao.py  # Gerador de planilha densa de testes
│   ├── diagnostico_email.py         # Teste e diagnóstico rápido da conexão IMAP
│   └── gerar_relatorio_pdf.py       # Gerador deste relatório em PDF
├── tests/                    # Suíte de testes unitários automatizados (Pytest)
│   ├── test_email_service.py
│   ├── test_parser.py
│   ├── test_validator.py
│   └── test_notifier.py
└── src/
    ├── __init__.py
    ├── email_service.py      # Conector IMAP indexado e Leitor Simulado
    ├── parser.py             # Extração cirúrgica de abas/colunas de Excel
    ├── validator.py          # Data Quality, conversão de formatos e deduplicação
    ├── storage.py            # Persistência estruturada e controle anti-duplicidade
    └── notifier.py           # Formatação HTML executiva e envio SMTP ao gestor
```

---

## 4. 🔧 ERROS IDENTIFICADOS E CORREÇÕES REALIZADAS

Durante o ciclo de desenvolvimento e testes reais, foram superados os seguintes desafios técnicos:

### 1. Travamento de Rede no IMAP (`KeyboardInterrupt` / Caixa com 39.000 e-mails)
- **Causa**: O código original fazia `fetch(RFC822)` de todos os e-mails não lidos sequencialmente. Como a caixa continha mais de 39.000 mensagens não lidas, a leitura de rede ficava bloqueada.
- **Correção**: Implementada **Busca Indexada no Servidor IMAP** (`SUBJECT "Fechamento"`) combinada com leitura de cabeçalhos leves (`BODY.PEEK[HEADER.FIELDS]`). A localização passou de vários minutos para **menos de 2 segundos**.

### 2. Mapeamento de Colunas com Caracteres Especiais no Excel
- **Causa**: Colunas como `"Faturamento (MUSD)"` e `"Realizado %"` continham parênteses e símbolos que impediam o mapeamento direto por nome.
- **Correção**: Criado algoritmo flexível de normalização de cabeçalhos (`_limpar_cabecalhos`) que remove caracteres de pontuação e implementada busca por sinônimos em `_obter_campo()`.

### 3. Erro de Encoding no Terminal Windows (`UnicodeEncodeError: charmap`)
- **Causa**: No console Windows com encoding `cp1252`, emojis e caracteres UTF-8 geravam falhas de renderização.
- **Correção**: Adicionada reconfiguração automática de `sys.stdout` e `sys.stderr` para `utf-8`.

### 4. Controle Anti-Duplicidade para E-mails Reabertos
- **Causa**: E-mails lidos no webmail deixavam de constar como `UNSEEN`.
- **Correção**: A busca IMAP foi aprimorada para buscar por tags de assunto no servidor e registrar as mensagens processadas no arquivo `.processed_registry.json`. Criada a flag `--force` para reprocessamento manual a qualquer momento.

---

## 5. 🚀 GUIA DE RETOMADA RÁPIDA (PARA O PRÓXIMO CHAT / SESSÃO)

### Como rodar o projeto:
```bash
# 1. Ativar o ambiente virtual
.venv\Scripts\activate

# 2. Rodar no Modo Real (Gmail ativo)
python extrator.py

# 3. Forçar reprocessamento ignorando duplicidades
python extrator.py --force

# 4. Rodar no Modo Simulação (Offline com caixa_de_entrada/)
python extrator.py --simulate

# 5. Executar os Testes Automatizados (8 testes unitários)
.venv\Scripts\pytest

# 6. Rodar diagnóstico de e-mails da caixa de entrada
python scripts/diagnostico_email.py
```

### Configurações Ativas no `.env`:
- `EXECUTION_MODE=REAL` (ou `SIMULATION`)
- `IMAP_SERVER=imap.gmail.com` / `SMTP_SERVER=smtp.gmail.com`
- `EMAIL_USER=gilvandnel@gmail.com`
- `EMAIL_GESTOR_DESTINO=gilvandnel@gmail.com`
- `ENVIAR_RELATORIO_GESTOR=true`
