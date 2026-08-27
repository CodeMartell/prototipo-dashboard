#!/bin/sh
# docker-entrypoint-api.sh
# Roda a cada start do container da API: aplica migrations, garante o
# perfil ADMIN e (opcionalmente) cria o primeiro usuário admin via
# variáveis de ambiente, antes de subir o servidor de verdade.
set -e

echo "[api] Aplicando migrations..."
alembic upgrade head

echo "[api] Garantindo perfil ADMIN..."
python scripts/seed_roles.py

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "[api] Garantindo usuário admin inicial..."
  python scripts/create_admin.py "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "${ADMIN_NAME:-Admin}" || true
fi

echo "[api] Subindo servidor..."
exec uvicorn main:app --host 0.0.0.0 --port "${API_PORT:-5001}"
