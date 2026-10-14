"""Aprova a carga pendente de Nov–Dec recebida pelo bot na homologação local."""

from pathlib import Path

import httpx
from dotenv import dotenv_values


ROOT = Path(__file__).resolve().parents[1]
SUBJECT = "Relatorio Logistico - Atualizacao Resina Nov Dez"


def main() -> None:
    config = dotenv_values(ROOT / ".env.homologacao")
    with httpx.Client(base_url=config["RPA_API_URL"], timeout=20, trust_env=False) as client:
        health = client.get("/api/health")
        health.raise_for_status()
        if health.json().get("environment") != "homologacao-local":
            raise RuntimeError("Execução bloqueada fora da homologação local.")
        login = client.post("/api/auth/login", json={"email": config["RPA_API_EMAIL"], "password": config["RPA_API_PASSWORD"]})
        login.raise_for_status()
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        pending = client.get("/api/profile/pending-ingestions", headers=headers)
        pending.raise_for_status()
        items = [item for item in pending.json() if item.get("subject") == SUBJECT]
        if len(items) != 1:
            raise RuntimeError(f"Esperada uma carga pendente do teste; encontradas: {len(items)}")
        accepted = client.post(f"/api/profile/ingestions/{items[0]['id']}/accept", headers=headers)
        accepted.raise_for_status()
        if accepted.json().get("applied_records") != 2:
            raise RuntimeError(f"Aprovação inesperada: {accepted.json()}")
    print("Carga do e-mail aprovada: Nov e Dec estão disponíveis na API de homologação.")


if __name__ == "__main__":
    main()
