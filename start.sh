#!/bin/bash

# Define cores para o output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}      DataLens - Inicializacao via Docker     ${NC}"
echo -e "${GREEN}==============================================${NC}"
echo ""

# 1. Checa se o Docker esta rodando
if ! docker info >/dev/null 2>&1; then
    echo -e "${YELLOW}[SETUP] Docker nao esta respondendo. Tentando iniciar o servico do Docker...${NC}"
    
    # Tenta iniciar via systemctl se existir
    if command -v systemctl >/dev/null 2>&1; then
        sudo systemctl start docker
    elif command -v service >/dev/null 2>&1; then
        sudo service docker start
    else
        echo -e "${RED}[ERRO] Nao foi possivel iniciar o Docker automaticamente.${NC}"
        echo -e "Certifique-se de que o Docker esta instalado e inicie o daemon manualmente."
        exit 1
    fi

    echo -e "${YELLOW}[SETUP] Aguardando o motor do Docker inicializar (isso pode levar um minutinho)...${NC}"
    
    DOCKER_READY=0
    for i in {1..30}; do
        if docker info >/dev/null 2>&1; then
            DOCKER_READY=1
            break
        fi
        sleep 4
    done

    if [ $DOCKER_READY -eq 0 ]; then
        echo ""
        echo -e "${RED}[ERRO] O Docker demorou muito para iniciar ou voce nao tem permissoes suficientes.${NC}"
        echo -e "Tente rodar o script com 'sudo' ou adicione seu usuario ao grupo 'docker'."
        exit 1
    fi
fi

echo -e "${GREEN}[OK] Docker esta rodando perfeitamente!${NC}"
echo ""

# 2. Cria arquivo .env se nao existir
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo -e "${YELLOW}[SETUP] Criando arquivo .env a partir do .env.example...${NC}"
        cp .env.example .env
    else
        echo -e "${YELLOW}[AVISO] Arquivo .env.example nao encontrado. Pulando a criacao do .env.${NC}"
    fi
fi

# 3. Garante pasta de logs
mkdir -p logs

# 4. Inicia/Executa a aplicacao (Docker Compose)
echo -e "${YELLOW}[RUN] Construindo e iniciando a aplicacao no Docker (pode demorar no primeiro uso)...${NC}"

# Checa qual comando do docker compose esta disponivel (docker compose vs docker-compose)
if docker compose version >/dev/null 2>&1; then
    docker compose up -d --build
elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose up -d --build
else
    echo -e "${RED}[ERRO] plugin docker compose nao foi encontrado. Instale-o para continuar.${NC}"
    exit 1
fi

# 5. Captura continua de logs dos servicos em segundo plano
echo -e "${YELLOW}[LOGS] Iniciando captura de logs em logs/docker.log e logs/api.log...${NC}"
nohup docker compose logs -f --no-color > logs/docker.log 2>&1 &
nohup docker compose logs -f --no-color api > logs/api.log 2>&1 &

echo ""
echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}  SUCESSO! O Docker subiu o sistema em segundo plano.${NC}"
echo ""
echo -e "  - Frontend: http://localhost:5173"
echo -e "  - Backend:  http://localhost:9192"
echo -e "  - Desktop:  http://localhost:5001 (API)"
echo ""
echo -e "  - Logs gerais: logs/docker.log"
echo -e "  - Logs da API: logs/api.log"
echo ""
echo -e "  DICA: Para acompanhar os logs da API em tempo real na tela,"
echo -e "  execute:"
echo -e "    docker compose logs -f api"
echo -e "${GREEN}==============================================${NC}"
