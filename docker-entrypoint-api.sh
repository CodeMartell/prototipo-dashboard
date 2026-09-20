#!/bin/sh
# docker-entrypoint-api.sh
# Roda a cada start do container da API: aplica migrations, garante o
# perfil ADMIN e (opcionalmente) cria o primeiro usuário admin via
# variáveis de ambiente, antes de subir o servidor de verdade.
set -e

echo "[api] Aplicando migrations..."
# A base local pode ter sido criada por uma revisão histórica que não está
# mais versionada no repositório. Nesse caso ela já contém o schema usado
# pela API e não deve ficar indisponível só porque o Alembic não acha a
# revisão anterior. Mantemos a inicialização estrita para qualquer outro
# erro de migration.
if ! migration_output=$(alembic upgrade head 2>&1); then
  printf '%s\n' "$migration_output"
  if printf '%s' "$migration_output" | grep -q "Can't locate revision identified by"; then
    echo "[api] Aviso: revisão histórica ausente; usando o schema existente."
  else
    exit 1
  fi
fi

echo "[api] Garantindo perfil ADMIN..."
python scripts/seed_roles.py

if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "[api] Garantindo usuário admin inicial..."
  python scripts/create_admin.py "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "${ADMIN_NAME:-Admin}" || true
fi

echo "[api] Subindo servidor..."
exec uvicorn main:app --host 0.0.0.0 --port "${API_PORT:-5001}"
