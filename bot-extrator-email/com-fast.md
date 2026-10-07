# 1. Ativar o ambiente virtual
.venv\Scripts\activate

# 2. Executar o robô em Modo Real (Gmail ativo)
python extrator.py

# 3. Forçar reprocessamento ignorando duplicidades
python extrator.py --force

# 4. Executar em Modo Simulação (Offline com pasta caixa_de_entrada/)
python extrator.py --simulate

# 5. Rodar a suíte de testes unitários (8 testes)
.venv\Scripts\pytest

# 6. Rodar diagnóstico rápido de conexão da caixa de entrada
python scripts/diagnostico_email.py



Ler relatorio_projeto_epico3.md
