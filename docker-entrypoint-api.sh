#!/bin/sh
# docker-entrypoint-api.sh
# Roda a cada start do container da API: aplica migrations, garante o
# perfil ADMIN e (opcionalmente) cria o primeiro usuário admin via
# variáveis de ambiente, antes de subir o servidor de verdade.
set -e

# Espera o banco aceitar conexao antes de seguir. O compose ja usa
# depends_on com healthcheck, mas o retry cobre qualquer atraso e e seguro:
# alembic upgrade head e idempotente.
echo "[api] Aplicando migrations..."
attempt=1
max_attempts=30
until alembic upgrade head; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[api] Falha ao aplicar migrations depois de $max_attempts tentativas."
    exit 1
  fi
  echo "[api] Banco indisponivel (tentativa $attempt/$max_attempts). Nova tentativa em 3s..."
  attempt=$((attempt + 1))
  sleep 3
done

echo "[api] Garantindo perfil ADMIN..."
python scripts/seed_roles.py

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "[api] Garantindo usuário admin inicial..."
  python scripts/create_admin.py "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "${ADMIN_NAME:-Admin}" || true
fi

echo "[api] Subindo servidor..."
exec uvicorn main:app --host 0.0.0.0 --port "${API_PORT:-5001}"
