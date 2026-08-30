"""rpa_email/app/raw_file_bridge.py
Ponte entre os anexos brutos do email 'Relatorio Logistico' e as
funções de extração de KPIs do módulo Automacao-Planilha.

Responsabilidades:
- Identificar os 4 arquivos brutos pelo fragmento do nome
- Chamar as funções extract_*_data() do extrair_kpis.py
- Converter os dicts retornados em ExtractionResult (compatível com build_payload)
"""
from __future__ import annotations

import logging
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from rpa_email.app.extractor import (
    ExtractionResult,
    KpiMonthlyRow,
    LogisticsVsProdRow,
)

LOGGER = logging.getLogger(__name__)

# Adiciona o diretório Automacao-Planilha ao path para importar extrair_kpis
_AUTOMACAO_DIR = Path(__file__).resolve().parents[2] / "Automacao-Planilha"
if str(_AUTOMACAO_DIR) not in sys.path:
    sys.path.insert(0, str(_AUTOMACAO_DIR))


@dataclass(frozen=True)
class FileSignature:
    """Define como identificar um arquivo bruto pelo fragmento do nome."""
    fragment: str          # Substring (case-insensitive) que identifica o arquivo
    extensions: tuple[str, ...]  # Extensões aceitas (.xlsb, .xlsx)
    key: str               # Identificador interno (war_room, freight, incidental, indicators)
    description: str       # Descrição legível para logs


# Ordem de matching: mais específico primeiro
FILE_SIGNATURES = [
    FileSignature(
        fragment="3-indicadores",
        extensions=(".xlsx",),
        key="indicators",
        description="Planilha de 3 indicadores consolidados",
    ),
    FileSignature(
        fragment="Incidental Cost_Total",
        extensions=(".xlsb", ".xlsx"),
        key="incidental",
        description="Incidental Cost Total",
    ),
    FileSignature(
        fragment="Freight Air",
        extensions=(".xlsb", ".xlsx"),
        key="freight",
        description="Freight Air Monthly",
    ),
    FileSignature(
        fragment="War Room",
        extensions=(".xlsb", ".xlsx"),
        key="war_room",
        description="LGESP War Room",
    ),
]

REQUIRED_KEYS = {sig.key for sig in FILE_SIGNATURES}


def is_raw_report(folder: Path) -> bool:
    """Verifica se a pasta contém arquivos brutos (vs KPI pré-processados).
    
    Retorna True se encontrar pelo menos um .xlsb OU um arquivo
    cujo nome corresponda a um dos FILE_SIGNATURES.
    """
    for path in folder.iterdir():
        if path.name.startswith("~$"):
            continue
        if path.suffix.lower() == ".xlsb":
            return True
        clean_name = path.stem.lower().replace("'", "")
        for sig in FILE_SIGNATURES:
            if sig.fragment.lower() in clean_name:
                return True
    return False


class RawFileBridge:
    def identify_files(self, folder: Path) -> dict[str, Path]:
        """Identifica os 4 arquivos brutos na pasta de anexos.
        
        Returns:
            Mapa key -> Path (ex: {"war_room": Path(...), "freight": Path(...), ...})
        
        Raises:
            ValueError: se algum arquivo obrigatório não for encontrado
        """
        file_map: dict[str, Path] = {}
        for path in folder.iterdir():
            if path.name.startswith("~$"):
                continue
            clean_name = path.stem.lower().replace("'", "")
            ext = path.suffix.lower()
            for sig in FILE_SIGNATURES:
                if sig.fragment.lower() in clean_name and ext in sig.extensions:
                    if sig.key in file_map:
                        if path.stat().st_mtime > file_map[sig.key].stat().st_mtime:
                            file_map[sig.key] = path
                    else:
                        file_map[sig.key] = path
                    break
        
        missing = REQUIRED_KEYS - set(file_map.keys())
        if missing:
            raise ValueError(f"Arquivos obrigatórios não encontrados: {missing}")
        return file_map

    def _extract_all(self, file_map: dict[str, Path]) -> dict[str, list[dict]]:
        """Executa todas as funções de extração e retorna os dados brutos."""
        from extrair_kpis import (
            extract_air_freight_data,
            extract_incidental_cost_data,
            extract_war_room_data,
            extract_task_cost_data,
            extract_demurrage_data,
            extract_resin_data,
        )
        
        return {
            "air_freight": extract_air_freight_data(file_map["freight"]),
            "incidental_cost": extract_incidental_cost_data(file_map["incidental"]),
            "logistic_cost": extract_war_room_data(file_map["war_room"]),
            "total_cost": extract_task_cost_data(file_map["indicators"]),
            "demurrage": extract_demurrage_data(file_map["indicators"]),
            "incidental_cost_resin": extract_resin_data(file_map["indicators"]),
        }

    def _to_extraction_result(self, raw: dict[str, list[dict]]) -> ExtractionResult:
        result = ExtractionResult()
        
        for kpi_key in ("logistic_cost", "air_freight", "incidental_cost", "total_cost", "demurrage"):
            records = raw.get(kpi_key, [])
            for record in records:
                row = KpiMonthlyRow(
                    month=record["month"],
                    year=record["year"],
                    target=record.get("target", 0.0),
                    result=record.get("result", 0.0),
                    achievement=record.get("achievement") or 0.0,
                    kpi_key=kpi_key,
                )
                getattr(result, kpi_key).append(row)
        
        # logistics_vs_prod is not directly extracted from raw files.
        # It can be derived if needed, but we leave it empty for now.
        
        return result

    def process(self, folder: Path) -> ExtractionResult:
        """Processa uma pasta de anexos brutos e retorna ExtractionResult."""
        LOGGER.info("[RAW_BRIDGE] Identificando arquivos em: %s", folder)
        
        try:
            file_map = self.identify_files(folder)
        except ValueError as exc:
            result = ExtractionResult()
            result.errors.append(str(exc))
            return result
        
        LOGGER.info("[RAW_BRIDGE] Arquivos identificados: %s", 
                    {k: v.name for k, v in file_map.items()})
        
        try:
            raw_data = self._extract_all(file_map)
        except Exception as exc:
            result = ExtractionResult()
            result.errors.append(f"Erro na extração: {exc}")
            LOGGER.exception("[RAW_BRIDGE] Falha na extração")
            return result
        
        extraction = self._to_extraction_result(raw_data)
        
        total = sum(
            len(getattr(extraction, k))
            for k in ("logistic_cost", "air_freight", "incidental_cost", "total_cost", "demurrage")
        )
        LOGGER.info("[RAW_BRIDGE] Extração concluída: %d registros totais", total)
        
        if total == 0:
            extraction.errors.append("Nenhum registro extraído dos arquivos brutos")
        
        return extraction
