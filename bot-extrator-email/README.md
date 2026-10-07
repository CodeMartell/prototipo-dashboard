# 🚀 Bot Extrator e Normalizador de Dados Logísticos (Épico 3)

Serviço autônomo (backend / ETL) para **extração, validação, limpeza e normalização** de indicadores logísticos para a plataforma **War Room / DXI Dashboard**, com **envio de Relatório Executivo por E-mail para o Gestor**.

---

## ⚡ Como Executar

### 1. Modo Simulação (Offline com arquivos da pasta `caixa_de_entrada/`)
```bash
python extrator.py --simulate
```

### 2. Modo Real (Conexão IMAP / SMTP com o Gmail)
```bash
python extrator.py
```

### 3. Forçar Reprocessamento (Ignorar controle de duplicidade)
```bash
python extrator.py --force
```

### 4. Executar os Testes Unitários
```bash
.venv\Scripts\pytest
```

---

## 🎯 KPIs Extraídos

1. **Logistic Cost KPI TV (War Room Report)**: Custo Logístico sobre Faturamento (`logisticCost`).
2. **Air Freight KPI TV**: Frete Aéreo sobre Faturamento (`airFreight`).
3. **Logistics Cost x Product Amount**: Razão Custo Logístico / Volume de Produção em MUSD (`logisticsVsProd`).

---

## 📁 Estrutura do Projeto

```text
bot-extrator-email/
├── .env.example              # Modelo de variáveis de ambiente seguro
├── .env                      # Configurações locais e credenciais do Gmail
├── .gitignore                # Regras de exclusão do Git (.venv, logs, saídas)
├── requirements.txt          # Dependências do projeto
├── config.json               # Regras de filtros de assunto, remetentes e KPIs
├── extrator.py               # CLI principal com visualização limpa e objetiva
├── caixa_de_entrada/         # Pasta para testes/simulações com planilhas Excel
├── dados_processados/        # Output dos dados normalizados (.json e .csv)
├── logs/                     # Trilha de auditoria e logs detalhados
├── tests/                    # Testes automatizados com Pytest
└── src/
    ├── __init__.py
    ├── email_service.py      # Conector IMAP indexado e Leitor de Simulação
    ├── parser.py             # Extração cirúrgica dos 3 KPIs
    ├── validator.py          # Data Quality, conversão de formatos e regras matemáticas
    ├── storage.py            # Persistência estruturada e controle anti-duplicidade
    └── notifier.py           # Formatação HTML e envio de relatório ao gestor via SMTP
```
