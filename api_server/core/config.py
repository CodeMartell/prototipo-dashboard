from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

# Root of the project repository
ROOT_DIR = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class AppConfig:
    root_dir: Path
    database_url: str
    port: int
    cors_origins: list[str]
    excel_path: Path
    kpi_reports_dir: Path

    @classmethod
    def load(cls) -> AppConfig:
        # Load environment files
        load_dotenv(ROOT_DIR / ".env")
        load_dotenv(ROOT_DIR / "rpa_email" / ".env")

        database_url = os.getenv("DATABASE_URL", "").strip()
        port = int(os.getenv("API_PORT", "5001"))
        
        origins_raw = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost,http://127.0.0.1"
        )
        cors_origins = [o.strip() for o in origins_raw.split(",") if o.strip()]
        
        excel_path = ROOT_DIR / "dados_dashboard.xlsx"
        kpi_reports_dir = ROOT_DIR / "kpi_reports"

        return cls(
            root_dir=ROOT_DIR,
            database_url=database_url,
            port=port,
            cors_origins=cors_origins,
            excel_path=excel_path,
            kpi_reports_dir=kpi_reports_dir,
        )
