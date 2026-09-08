"""
rpa_email/extractors/air_freight.py

Extrator do KPI AIR Freight (%).

Regra de negócio
────────────────
  Base de cálculo mensal : Freight Amount (linha 9) / Material Cost (linha 8)
  ACC anual (2024/2025)  : SUM(Freight, 12 meses) / SUM(Material, 12 meses)
  Validação de ACC       : O ACC calculado é comparado contra a coluna ACC
                           pré-existente na planilha (col P para 2024, col AC
                           para 2025). Divergências são sinalizadas como WARNING
                           mas NÃO bloqueiam a extração.
  Target                 : Só existe para 2026. Fixo para todos os meses do ano.
                           Preenchimento manual anual (col 42, linha TV Rate).
  Semáforo               : >= 100 % → verde | 90-99 % → amarelo | < 90 % → vermelho
  Agregação              : Média dos meses do período (trimestral/semestral/anual).

Layout da aba "Annual Result" (índices de coluna 0-based):
┌──────────────┬─────────────────────────────────────────────────────────────┐
│ Ano          │ Meses (cols)     │ ACC referência │ Target                  │
├──────────────┼──────────────────┼────────────────┼─────────────────────────┤
│ 2024 (Y24)   │ Jan–Dez: 3–14   │ col 15  (P)    │ sem target              │
│ 2025 (Y25)   │ Jan–Dez: 16–27  │ col 28  (AC)   │ sem target              │
│ 2026 (Y26)   │ Jan–???  : 29+  │ —              │ col 42 (TV Rate row)    │
└──────────────┴──────────────────┴────────────────┴─────────────────────────┘

Índices de linha (0-based, read_sheet devolve 0-indexed):
  rows[7]  → linha 8  → Material Cost    (denominador)
  rows[8]  → linha 9  → Freight Amount   (numerador)
  rows[9]  → linha TV Rate (pré-calculado pelo Excel) — usado apenas para
              ler o target de 2026 (col 42) e os ACC de referência.
"""
from __future__ import annotations

import logging
import math
from pathlib import Path
from typing import Any

from rpa_email.extractors.common import MONTHS, parse_number, read_sheet

LOGGER = logging.getLogger(__name__)

KPI_KEY = "air_freight"
DISPLAY_NAME = "Air Freight"

# ── Constantes de layout ─────────────────────────────────────────────────────
_ROW_MATERIAL   = 7   # linha 8 (0-based): Material Cost
_ROW_FREIGHT    = 8   # linha 9 (0-based): Freight Amount
_ROW_TV_RATE    = 9   # linha TV Rate (pré-calculada pelo Excel)

_Y24_COLS       = range(3,  15)   # Jan–Dez 2024 (cols D–O)
_Y24_ACC_COL    = 15              # col P  → ACC 2024 de referência
_Y25_COLS       = range(16, 28)   # Jan–Dez 2025 (cols Q–AB)
_Y25_ACC_COL    = 28              # col AC → ACC 2025 de referência
_Y26_FIRST_COL  = 29              # Jan 2026 (col AD)
_Y26_TARGET_COL = 42              # Target 2026 (linha TV Rate)

_ACC_TOLERANCE  = 0.001           # diferença admissível: 0,1 %
# ─────────────────────────────────────────────────────────────────────────────


def _safe_float(value: Any) -> float | None:
    """Converte célula da planilha em float; devolve None se ausente/inválido."""
    if value is None or value == "":
        return None
    try:
        if isinstance(value, (int, float)):
            v = float(value)
        else:
            v = parse_number(value)
        return v if math.isfinite(v) else None
    except (TypeError, ValueError):
        return None


def _ratio(
    freight_row: dict,
    material_row: dict,
    tv_rate_row: dict,
    col: int,
) -> float | None:
    """
    Calcula Freight Amount / Material Cost para a coluna (mês) indicada.
    Se as linhas de valor bruto não estiverem presentes (ex: mocks de teste),
    utiliza diretamente o percentual pré-calculado na linha TV Rate.
    """
    freight  = _safe_float(freight_row.get(col))
    material = _safe_float(material_row.get(col))
    if freight is not None and material is not None and material > 0:
        return freight / material
    return _safe_float(tv_rate_row.get(col))


def _compute_acc(
    freight_row: dict,
    material_row: dict,
    tv_rate_row: dict,
    cols,
    acc_col: int,
) -> float | None:
    """
    ACC = SUM(Freight Amount) / SUM(Material Cost) sobre os meses fornecidos.
    Se as linhas brutas não existirem, faz fallback para a coluna de ACC da linha TV Rate.
    """
    total_freight  = 0.0
    total_material = 0.0
    has_raw = False
    for col in cols:
        f = _safe_float(freight_row.get(col))
        m = _safe_float(material_row.get(col))
        if f is not None:
            total_freight += f
            has_raw = True
        if m is not None:
            total_material += m
            has_raw = True
    if has_raw and total_material > 0:
        return total_freight / total_material
    return _safe_float(tv_rate_row.get(acc_col))


def _validate_acc(computed: float, reference: float | None, year: str) -> None:
    """
    Compara ACC calculado com a coluna de referência da planilha.
    Registra WARNING se a diferença ultrapassar _ACC_TOLERANCE.
    """
    if reference is None:
        LOGGER.warning(
            "[AIR FREIGHT] ACC %s: coluna de referência vazia na planilha.", year
        )
        return
    diff = abs(computed - reference)
    if diff > _ACC_TOLERANCE:
        LOGGER.warning(
            "[AIR FREIGHT] DIVERGÊNCIA ACC %s — calculado=%.6f  planilha=%.6f  diff=%.6f "
            "(tolerância=%.3f). Verificar fonte de dados.",
            year, computed, reference, diff, _ACC_TOLERANCE,
        )
    else:
        LOGGER.info(
            "[AIR FREIGHT] ACC %s OK — calculado=%.6f  planilha=%.6f  diff=%.6f",
            year, computed, reference, diff,
        )


def _build_record(
    month: str,
    year: str,
    result: float,
    target: float | None = None,
) -> dict:
    """
    Monta o registro no contrato esperado pelo dashboard.

    - Anos sem target (2024/2025): target=0.0, achievement=None.
    - 2026: target preenchido; achievement = target / result (lowerIsBetter=True).
    """
    target_value = target if (target is not None and target > 0) else 0.0
    if target_value > 0 and result > 0:
        achievement = round(target_value / result, 6)
    elif target_value > 0 and result == 0:
        achievement = 1.0
    else:
        achievement = None
    return {
        "month": month,
        "year":  year,
        "target": round(target_value, 8),
        "result": round(result,       8),
        "achievement": achievement,
    }


def extract(source: Path) -> list[dict]:
    """
    Extrai o KPI Air Freight do relatório.

    Processamento por ano:
    ─────────────────────
    Y24 (2024)
      • Lê Freight Amount (linha 9) e Material Cost (linha 8) para Jan–Dez
        nas colunas D–O (0-based: 3–14).
      • Calcula ACC = SUM(Freight)/SUM(Material).
      • Valida ACC contra coluna P (col 15) da linha TV Rate.
      • Gera até 12 registros mensais (pula meses sem dado).

    Y25 (2025)
      • Mesma lógica; colunas Q–AB (16–27); ACC referência coluna AC (28).

    Y26 (2026)
      • Mesma lógica; colunas AD+ (29+); para automaticamente no primeiro
        mês sem dado (stop ≠ fill-forward) — evita exibir meses futuros.
      • Target fixo anual lido da linha TV Rate (col 42).
    """
    rows = read_sheet(source, "Annual Result")

    material_row = rows[_ROW_MATERIAL] if len(rows) > _ROW_MATERIAL else {}   # linha 8: Material Cost
    freight_row  = rows[_ROW_FREIGHT] if len(rows) > _ROW_FREIGHT else {}    # linha 9: Freight Amount
    tv_rate_row  = rows[_ROW_TV_RATE] if len(rows) > _ROW_TV_RATE else {}    # linha TV Rate (pré-calculada)

    records: list[dict] = []

    # ── 2024 ────────────────────────────────────────────────────────────────
    acc_y24 = _compute_acc(freight_row, material_row, tv_rate_row, _Y24_COLS, _Y24_ACC_COL)
    if acc_y24 is not None:
        _validate_acc(acc_y24, _safe_float(tv_rate_row.get(_Y24_ACC_COL)), "Y24")

    for month, col in zip(MONTHS, _Y24_COLS):
        ratio = _ratio(freight_row, material_row, tv_rate_row, col)
        if ratio is None:
            LOGGER.debug("[AIR FREIGHT] Y24 %s (col %d): sem dado, ignorado.", month, col)
            continue
        records.append(_build_record(month, "Y24", ratio))

    # ── 2025 ────────────────────────────────────────────────────────────────
    acc_y25 = _compute_acc(freight_row, material_row, tv_rate_row, _Y25_COLS, _Y25_ACC_COL)
    if acc_y25 is not None:
        _validate_acc(acc_y25, _safe_float(tv_rate_row.get(_Y25_ACC_COL)), "Y25")

    for month, col in zip(MONTHS, _Y25_COLS):
        ratio = _ratio(freight_row, material_row, tv_rate_row, col)
        if ratio is None:
            LOGGER.debug("[AIR FREIGHT] Y25 %s (col %d): sem dado, ignorado.", month, col)
            continue
        records.append(_build_record(month, "Y25", ratio))

    # ── 2026 ────────────────────────────────────────────────────────────────
    target_y26 = _safe_float(tv_rate_row.get(_Y26_TARGET_COL))
    col = _Y26_FIRST_COL
    for month in MONTHS:
        ratio = _ratio(freight_row, material_row, tv_rate_row, col)
        if ratio is None:
            # Para no primeiro mês sem dado — NÃO preenche meses futuros com zero/default.
            LOGGER.info(
                "[AIR FREIGHT] Y26 %s (col %d): sem dado — extração encerrada no mês anterior.",
                month, col,
            )
            break
        records.append(_build_record(month, "Y26", ratio, target=target_y26))
        col += 1

    # Contagem por ano para log de auditoria
    n = {yr: sum(1 for r in records if r["year"] == yr) for yr in ("Y24", "Y25", "Y26")}
    LOGGER.info(
        "[AIR FREIGHT] Extração concluída — total=%d  Y24=%d  Y25=%d  Y26=%d",
        len(records), n["Y24"], n["Y25"], n["Y26"],
    )
    return records
