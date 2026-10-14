"""Cria somente o histórico Jan–Out de Resina na homologação local.

Use antes do teste manual no DataLens Desktop. Novembro e dezembro ficam
ausentes de propósito para serem incluídos pela interface desktop.
"""

from pathlib import Path
from uuid import uuid4

import httpx
from dotenv import dotenv_values


ROOT = Path(__file__).resolve().parents[1]
VALUES = {
    "Jan": 1017.0, "Feb": 1034.0, "Mar": 1051.0, "Apr": 1068.0,
    "May": 1085.0, "Jun": 1102.0, "Jul": 1119.0, "Aug": 1136.0,
    "Sep": 1153.0, "Oct": 1170.0,
}


def main() -> None:
    config = dotenv_values(ROOT / ".env.homologacao")
    base_url = config.get("RPA_API_URL", "")
    credentials = {"email": config.get("RPA_API_EMAIL", ""), "password": config.get("RPA_API_PASSWORD", "")}
    with httpx.Client(base_url=base_url, timeout=20, trust_env=False) as client:
        health = client.get("/api/health")
        health.raise_for_status()
        if health.json().get("environment") != "homologacao-local":
            raise RuntimeError("Execução bloqueada fora da homologação local.")
        login = client.post("/api/auth/login", json=credentials)
        login.raise_for_status()
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        records = [
            {"kpi_type": "incidental_cost", "month": month, "year": "Y26", "target": 1100.0, "result": result, "achievement": None}
            for month, result in VALUES.items()
        ]
        payload = {
            "email": {"message_id": f"<desktop-baseline-{uuid4()}@datalens.local>", "subject": "Base sintética Resina Jan-Out", "sender": "bot-homologacao@example.com", "file_name": "resina_jan_out.xlsx", "period_start": "Jan", "period_end": "Oct"},
            "records": records, "logistics_vs_prod": [], "replace_kpis": [],
        }
        queued = client.post("/api/ingestion/kpi-report", json=payload, headers=headers)
        queued.raise_for_status()
        body = queued.json()
        if body.get("status") != "pending":
            raise RuntimeError(f"Carga não entrou na fila: {body}")
        accepted = client.post(f"/api/profile/ingestions/{body['queue_id']}/accept", headers=headers)
        accepted.raise_for_status()
    print("Base criada: Resina Y26 de Jan a Oct. Inclua Nov e Dec pelo DataLens Desktop.")


if __name__ == "__main__":
    main()
