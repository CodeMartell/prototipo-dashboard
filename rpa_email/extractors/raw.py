"""Orquestra a extração dos relatórios logísticos em seu formato original."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from rpa_email.extractors.air_freight import extract as extract_air_freight
from rpa_email.extractors.demurrage_cost import extract as extract_demurrage_cost
from rpa_email.extractors.logistics_cost_vs_prod_amount import extract as extract_logistics_vs_prod
from rpa_email.extractors.resin_consolidation import extract as extract_resin_consolidation
from rpa_email.extractors.task_cost_reduction import extract as extract_task_cost_reduction
from rpa_email.extractors.war_room_report import extract as extract_war_room_report
from rpa_email.extractors.models import ExtractionResult, KpiMonthlyRow


LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class FileSignature:
    fragment: str
    extensions: tuple[str, ...]
    key: str


FILE_SIGNATURES = (
    FileSignature("3-indicadores", (".xlsx",), "indicators"),
    FileSignature("Incidental Cost_Total", (".xlsb", ".xlsx"), "cost_vs_prod"),
    FileSignature("Freight Air", (".xlsb", ".xlsx"), "freight"),
    FileSignature("War Room", (".xlsb", ".xlsx"), "war_room"),
)

REQUIRED_FILES = {signature.key: signature.fragment for signature in FILE_SIGNATURES}


def is_raw_report(folder: Path) -> bool:
    for path in folder.iterdir():
        if path.name.startswith("~$"):
            continue
        if path.suffix.lower() == ".xlsb":
            return True
        normalized_name = path.stem.lower().replace("'", "")
        if any(signature.fragment.lower() in normalized_name for signature in FILE_SIGNATURES):
            return True
    return False


class RawReportExtractor:
    """Seleciona os arquivos-fonte e executa os extratores de cada KPI."""

    def identify_files(self, folder: Path) -> dict[str, Path]:
        files: dict[str, Path] = {}
        for path in folder.iterdir():
            if path.name.startswith("~$"):
                continue
            normalized_name = path.stem.lower().replace("'", "")
            for signature in FILE_SIGNATURES:
                if (
                    signature.fragment.lower() in normalized_name
                    and path.suffix.lower() in signature.extensions
                    and (
                        signature.key not in files
                        or path.stat().st_mtime > files[signature.key].stat().st_mtime
                    )
                ):
                    files[signature.key] = path
                    break
        missing = [label for key, label in REQUIRED_FILES.items() if key not in files]
        if missing:
            raise ValueError("Relatórios brutos obrigatórios ausentes: " + ", ".join(missing))
        return files

    @staticmethod
    def _append(
        result: ExtractionResult,
        kpi_key: str,
        source: Path,
        extractor: Callable[[Path], list[dict]],
    ) -> None:
        try:
            records = extractor(source)
            if not records:
                raise ValueError("nenhum registro encontrado")
            target = getattr(result, kpi_key)
            for record in records:
                target.append(
                    KpiMonthlyRow(
                        month=record["month"],
                        year=record["year"],
                        target=record.get("target", 0.0),
                        result=record.get("result", 0.0),
                        achievement=record.get("achievement"),
                        kpi_key=kpi_key,
                    )
                )
        except Exception as exc:
            message = f"{source.name} ({kpi_key}): {exc}"
            LOGGER.exception("Falha na extração do relatório bruto: %s", message)
            result.errors.append(message)

    @staticmethod
    def _append_logistics_vs_prod(result: ExtractionResult, source: Path) -> None:
        try:
            records = extract_logistics_vs_prod(source)
            if not records:
                raise ValueError("nenhum registro encontrado")
            result.logistics_vs_prod.extend(records)
        except Exception as exc:
            message = f"{source.name} (logistics_vs_prod): {exc}"
            LOGGER.exception("Falha na extração do relatório bruto: %s", message)
            result.errors.append(message)

    def extract(self, folder: Path) -> ExtractionResult:
        result = ExtractionResult()
        try:
            files = self.identify_files(folder)
        except ValueError as exc:
            result.errors.append(str(exc))
            return result

        if source := files.get("war_room"):
            self._append(result, "logistic_cost", source, extract_war_room_report)
            result.replace_kpis.add("logistic_cost")
        if source := files.get("freight"):
            self._append(result, "air_freight", source, extract_air_freight)
        if source := files.get("indicators"):
            self._append(result, "incidental_cost", source, extract_resin_consolidation)
            self._append(result, "total_cost", source, extract_task_cost_reduction)
            self._append(result, "demurrage", source, extract_demurrage_cost)
        if source := files.get("cost_vs_prod"):
            self._append_logistics_vs_prod(result, source)
        return result
