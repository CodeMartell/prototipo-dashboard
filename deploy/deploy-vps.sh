#!/bin/bash
# Deploy do DataLens na VPS (Docker Swarm + Traefik existentes).
# Executar na VPS, dentro de /root/datalens.
#
# Nao toca em nenhuma stack existente (traefik, n8n, portainer, postgres).
# Idempotente: rodar de novo atualiza a imagem e o servico.
set -euo pipefail

STACK=datalens
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$APP_DIR/.env"
CRED_FILE="$APP_DIR/CREDENCIAIS.txt"

cd "$APP_DIR"

# ---------------------------------------------------------------------------
# 1. Segredos: gerados aqui, uma unica vez, e nunca sobrescritos
# ---------------------------------------------------------------------------
if [ ! -f "$ENV_FILE" ]; then
  echo "[deploy] Gerando segredos de producao em $ENV_FILE"
  POSTGRES_PASSWORD="$(openssl rand -base64 33 | tr -d '/+=' | cut -c1-32)"
  JWT_SECRET="$(openssl rand -hex 48)"
  ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-20)"

  cat > "$ENV_FILE" <<EOF
# Gerado automaticamente pelo deploy em $(date -Iseconds). Nao versionar.
API_DOMAIN=${API_DOMAIN:?defina API_DOMAIN antes do primeiro deploy}

POSTGRES_DB=datalens
POSTGRES_USER=datalens
POSTGRES_PASSWORD=$POSTGRES_PASSWORD

JWT_SECRET=$JWT_SECRET
JWT_ALGORITHM=HS256
JWT_EXPIRES_MINUTES=480

# Origens autorizadas no CORS (lista separada por virgula).
FRONTEND_ORIGIN=${FRONTEND_ORIGIN:-https://localhost}

ADMIN_EMAIL=${ADMIN_EMAIL:-admin@r-fael.com.br}
ADMIN_PASSWORD=$ADMIN_PASSWORD
ADMIN_NAME=Admin
EOF
  chmod 600 "$ENV_FILE"

  cat > "$CRED_FILE" <<EOF
Credenciais do DataLens em producao (gerado em $(date -Iseconds))

  URL da API : https://${API_DOMAIN}
  Login      : ${ADMIN_EMAIL:-admin@r-fael.com.br}
  Senha      : $ADMIN_PASSWORD

Troque a senha depois do primeiro acesso.
Os demais segredos estao em $ENV_FILE (chmod 600).
EOF
  chmod 600 "$CRED_FILE"
  echo "[deploy] Credenciais de acesso salvas em $CRED_FILE"
else
  echo "[deploy] $ENV_FILE ja existe — mantendo os segredos atuais"
fi

# ---------------------------------------------------------------------------
# 2. Carrega as variaveis para a interpolacao do stack
# ---------------------------------------------------------------------------
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

: "${API_DOMAIN:?API_DOMAIN ausente no .env}"
: "${JWT_SECRET:?JWT_SECRET ausente no .env}"

# ---------------------------------------------------------------------------
# 3. Build da imagem (Swarm de no unico usa a imagem local, sem registry)
# ---------------------------------------------------------------------------
echo "[deploy] Construindo a imagem datalens-api:latest"
docker build -f Dockerfile.api -t datalens-api:latest .

# ---------------------------------------------------------------------------
# 4. Deploy do stack
# ---------------------------------------------------------------------------
echo "[deploy] Publicando a stack '$STACK'"
docker stack deploy --detach=true -c "$APP_DIR/datalens.stack.yml" "$STACK"

# ---------------------------------------------------------------------------
# 5. Espera a API ficar saudavel
# ---------------------------------------------------------------------------
echo "[deploy] Aguardando a API responder..."
for i in $(seq 1 60); do
  cid="$(docker ps -q -f name="${STACK}_datalens-api" | head -1)"
  if [ -n "$cid" ] && docker exec "$cid" curl -fsS http://localhost:5001/api/health >/dev/null 2>&1; then
    echo "[deploy] API saudavel apos ${i}0s no maximo"
    docker exec "$cid" curl -sS http://localhost:5001/api/health
    echo
    exit 0
  fi
  sleep 5
done

echo "[deploy] A API nao respondeu no tempo esperado. Logs:"
docker service logs "${STACK}_datalens-api" --tail 40 --raw 2>&1 || true
exit 1
