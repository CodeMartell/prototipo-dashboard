"""Carrega e valida uma atualização incremental na homologação local.

O script usa exclusivamente a API marcada como ``homologacao-local`` no
arquivo .env.homologacao. Ele cria a série de Resina de Jan–Out e, depois,
envia Nov–Dez como uma segunda planilha, aprova as duas cargas na fila e
confere que os valores anteriores permanecem intactos.
"""

from pathlib import Path
from uuid import uuid4

import httpx
from dotenv import dotenv_values


ROOT = Path(__file__).resolve().parents[1]
VALUES = {
    "Jan": 1017.0,
    "Feb": 1034.0,
    "Mar": 1051.0,
    "Apr": 1068.0,
    "May": 1085.0,
    "Jun": 1102.0,
    "Jul": 1119.0,
    "Aug": 1136.0,
    "Sep": 1153.0,
    "Oct": 1170.0,
    "Nov": 1221.0,
    "Dec": 1258.0,
}


def send_and_accept(client: httpx.Client, headers: dict[str, str], label: str, months: list[str]) -> None:
    records = [
        {
            "kpi_type": "incidental_cost",
            "month": month,
            "year": "Y26",
            "target": 1100.0,
            "result": VALUES[month],
            "achievement": None,
        }
        for month in months
    ]
    payload = {
        "email": {
            "message_id": f"<homologacao-{label}-{uuid4()}@datalens.local>",
            "subject": f"Planilha sintética Resina {label}",
            "sender": "bot-homologacao@example.com",
            "file_name": f"resina_{label}.xlsx",
            "period_start": months[0],
            "period_end": months[-1],
        },
        "records": records,
        "logistics_vs_prod": [],
        "replace_kpis": [],
    }
    response = client.post("/api/ingestion/kpi-report", json=payload, headers=headers)
    response.raise_for_status()
    queued = response.json()
    if queued.get("status") != "pending":
        raise RuntimeError(f"A carga não entrou na fila de aprovação: {queued}")

    approved = client.post(
        f"/api/profile/ingestions/{queued['queue_id']}/accept", headers=headers
    )
    approved.raise_for_status()
    if approved.json().get("applied_records") != len(months):
        raise RuntimeError(f"Quantidade de registros aplicada é inesperada: {approved.json()}")


def main() -> None:
    config = dotenv_values(ROOT / ".env.homologacao")
    base_url = config.get("RPA_API_URL", "")
    credentials = {
        "email": config.get("RPA_API_EMAIL", ""),
        "password": config.get("RPA_API_PASSWORD", ""),
    }
    if not base_url or not all(credentials.values()):
        raise RuntimeError("Configuração de homologação incompleta.")

    with httpx.Client(base_url=base_url, timeout=20, trust_env=False) as client:
        health = client.get("/api/health")
        health.raise_for_status()
        if health.json().get("environment") != "homologacao-local":
            raise RuntimeError("Execução bloqueada: a API não é a homologação local.")

        login = client.post("/api/auth/login", json=credentials)
        login.raise_for_status()
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        send_and_accept(client, headers, "jan-out", list(VALUES)[:10])
        send_and_accept(client, headers, "nov-dez", list(VALUES)[10:])

        actual = {}
        for month in VALUES:
            response = client.get(
                "/api/kpis/incidental_cost",
                params={"month": month, "year": "Y26"},
                headers=headers,
            )
            response.raise_for_status()
            rows = response.json()
            if len(rows) != 1:
                raise RuntimeError(f"Período {month}/Y26 não foi encontrado corretamente.")
            actual[month] = float(rows[0]["result"])

    if actual != VALUES:
        raise RuntimeError(f"Validação falhou: {actual}")
    print("APROVADO: Jan–Out preservado; Nov–Dez incluídos; 12 períodos disponíveis.")


if __name__ == "__main__":
    main()
