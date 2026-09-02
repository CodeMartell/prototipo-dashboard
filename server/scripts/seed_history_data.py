"""
scripts/seed_history_data.py
Carga inicial dos dados reais de KPI (fonte: history_and_data.txt, na raiz
do repositorio) no Postgres.

Uso (dentro do container da API):
    docker compose exec api python scripts/seed_history_data.py

E idempotente: usa upsert por (month, year), entao rodar de novo apenas
reescreve os mesmos periodos. NAO roda no entrypoint de proposito — se
rodasse a cada start, sobrescreveria as edicoes manuais feitas na tela.

Convencoes aplicadas na conversao da planilha:
- Indicadores em "%" sao gravados como fracao (3,8% -> 0.038).
- Meses sem resultado na fonte (ex.: Jul/26 de Task Cost) nao sao
  gravados: ficam ausentes e o dashboard mostra "sem dados".
- achievement usa o "%" informado na fonte quando existe; quando a fonte
  traz "-", o valor e calculado a partir de target/result respeitando a
  direcao do indicador (ver app/core/kpi_meta.py).
- Demurrage guarda quantidade de conteineres (a fonte tem "CTNR Qty" como
  resultado e meta zero).
- Resin Consolidation usa o saving bruto ("Saving Valor USD ... CTN 20 Fts")
  como target e o saving liquido ("Saving", ja descontados custos e
  imposto) como result.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.kpi_meta import compute_achievement, compute_ratio  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.repositories.dashboard_repository import DashboardRepository  # noqa: E402

MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")

PCT = 0.01  # fator de conversao de "%" informado para fracao


def _pct(value: float | None) -> float | None:
    return None if value is None else value * PCT


# ---------------------------------------------------------------------------
# WAR ROOM (%) -> logistic_cost
# ---------------------------------------------------------------------------
LOGISTIC_COST = {
    "Y25": {
        "target": [3.8, 6.1, 3.5, 6.2, 5.9, 6.2, 5.3, 4.0, 3.2, 5.1, 4.9, 4.9],
        "result": [3.9, 3.3, 3.9, 6.6, 4.7, 3.5, 4.3, 4.5, 2.9, 3.1, 7.0, 4.5],
        "achievement": [97, 184, 89, 94, 126, 177, 123, 89, 111, 165, 70, 109],
    },
    "Y26": {
        "target": [6.5, 3.9, 3.8, 4.1, 4.6, 5.0, 5.6],
        "result": [5.4, 3.5, 4.7, 4.1, 4.7, 5.4, 4.6],
        "achievement": [120, 112, 81, 100, 97, 93, None],
    },
}

# ---------------------------------------------------------------------------
# AIR FREIGHT (%) -> air_freight
# ---------------------------------------------------------------------------
AIR_FREIGHT = {
    "Y25": {
        "target": [0.40] * 12,
        "result": [0.12, 0.23, 0.38, 0.10, 0.19, 0.34, 0.10, 0.15, 0.16, 0.24, 1.63, 0.33],
        "achievement": [333, 174, 105, 400, 211, 118, 400, 267, 250, 167, 25, 121],
    },
    "Y26": {
        "target": [0.22] * 7,
        "result": [0.56, 0.29, 0.74, 0.35, 0.58, 0.66, 0.53],
        "achievement": [39.29, 75.86, 29.73, 62.86, 37.93, 33.33, None],
    },
}

# ---------------------------------------------------------------------------
# TASK COST (KBRL) -> total_cost  (quanto maior o resultado, melhor)
# Jul/26 nao entra: a fonte nao tem resultado para o mes.
# ---------------------------------------------------------------------------
TOTAL_COST = {
    "Y25": {
        "target": [1108, 1111, 996, 825, 786, 933, 933, 933, 933, 786, 786, 786],
        "result": [1108, 1111, 982, 832, 828, 1058, 1061, 861, 798, 769, 615, 690],
        "achievement": [100, 100, 99, 101, 105, 113, 114, 92, 86, 98, 78, 88],
    },
    "Y26": {
        "target": [750, 750, 641, 621, 621, 641],
        "result": [722, 725, 657, 658, 687, 688],
        "achievement": [96, 97, 103, 106, 111, 107],
    },
}

# ---------------------------------------------------------------------------
# DEMURRAGE (quantidade de conteineres) -> demurrage
# ---------------------------------------------------------------------------
DEMURRAGE = {
    "Y25": {
        "target": [0] * 12,
        "result": [3, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0],
        "achievement": [None] * 12,
    },
    "Y26": {
        "target": [0] * 6,
        "result": [0] * 6,
        "achievement": [None] * 6,
    },
}

# ---------------------------------------------------------------------------
# LOGISTICS COST RESIN CONSOLIDATION (KUSD) -> incidental_cost
# target = saving bruto / result = saving liquido
# ---------------------------------------------------------------------------
INCIDENTAL_COST = {
    "Y25": {
        "target": [4.0, 5.9, 9.9, 27.7, 17.8, 9.9, 7.9, 5.9, 7.9, 9.9, 11.9, 9.9],
        "result": [2.8, 4.0, 6.5, 19.5, 14.1, 6.6, 6.7, 3.8, 5.4, 7.1, 8.7, 7.4],
        "achievement": [None] * 12,
    },
    "Y26": {
        "target": [11.87, 17.81, 11.87, 15.83, 11.87, 3.96],
        "result": [8.75, 12.66, 8.93, 11.34, 9.02, 3.34],
        "achievement": [None] * 6,
    },
}

# ---------------------------------------------------------------------------
# LOGISTIC COST x PROD AMOUNT (MUSD) -> logistics_vs_prod
# ---------------------------------------------------------------------------
LOGISTICS_VS_PROD = {
    "Y25": {
        "logistics_cost": [2.66, 1.91, 1.97, 2.20, 2.07, 1.97, 2.55, 2.33, 1.48, 1.58, 1.65, 1.36],
        "production_amount": [49.9, 39.5, 35.9, 41.8, 44.4, 56.56, 59.27, 51.94, 51.38, 51.55, 23.43, 29.99],
    },
    "Y26": {
        "logistics_cost": [2.38, 1.61, 2.77, 2.77, 2.70, 2.64],
        "production_amount": [47.63, 45.88, 59.51, 67.77, 57.15, 49.27],
    },
}

# Indicadores cujos valores da fonte estao em "%" e viram fracao no banco.
PERCENT_KPIS = {"logistic_cost", "air_freight"}

STANDARD_DATASETS = {
    "logistic_cost": LOGISTIC_COST,
    "air_freight": AIR_FREIGHT,
    "total_cost": TOTAL_COST,
    "demurrage": DEMURRAGE,
    "incidental_cost": INCIDENTAL_COST,
}


def seed_standard(repository: DashboardRepository) -> dict[str, int]:
    written: dict[str, int] = {}

    for kpi_type, per_year in STANDARD_DATASETS.items():
        is_percent = kpi_type in PERCENT_KPIS
        count = 0

        for year, series in per_year.items():
            for index, month in enumerate(MONTHS[: len(series["result"])]):
                target = series["target"][index]
                result = series["result"][index]
                if target is None or result is None:
                    continue  # mes sem dado na fonte fica ausente no banco

                reported = series["achievement"][index]
                if is_percent:
                    target, result = _pct(target), _pct(result)

                achievement = (
                    _pct(reported)
                    if reported is not None
                    else compute_achievement(kpi_type, target, result)
                )

                repository.upsert_kpi_record(
                    kpi_type=kpi_type,
                    month=month,
                    year=year,
                    target=target,
                    result=result,
                    achievement=achievement,
                )
                count += 1

        written[kpi_type] = count

    return written


def seed_logistics_vs_prod(repository: DashboardRepository) -> int:
    count = 0
    for year, series in LOGISTICS_VS_PROD.items():
        for index, month in enumerate(MONTHS[: len(series["logistics_cost"])]):
            cost = series["logistics_cost"][index]
            prod = series["production_amount"][index]
            if cost is None or prod is None:
                continue

            repository.upsert_logistics_vs_prod(
                month=month,
                year=year,
                logistics_cost=cost,
                production_amount=prod,
                ratio=compute_ratio(cost, prod),
            )
            count += 1
    return count


def main() -> None:
    with SessionLocal() as db:
        repository = DashboardRepository(db)
        written = seed_standard(repository)
        written["logistics_vs_prod"] = seed_logistics_vs_prod(repository)
        repository.commit()

    total = sum(written.values())
    for kpi_type, count in written.items():
        print(f"  {kpi_type:<20} {count:>3} periodos")
    print(f"Carga concluida: {total} registros gravados.")


if __name__ == "__main__":
    main()
