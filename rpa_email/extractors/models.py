from dataclasses import dataclass, field


@dataclass
class KpiMonthlyRow:
    """Registro mensal dos KPIs que usam target, result e achievement."""

    month: str
    year: str
    target: float
    result: float
    achievement: float | None
    kpi_key: str


@dataclass
class LogisticsVsProdRow:
    """Registro mensal do custo logístico em relação à produção."""

    month: str
    year: str
    logistics_cost: float
    production_amount: float
    ratio: float


@dataclass
class ExtractionResult:
    logistic_cost: list[KpiMonthlyRow] = field(default_factory=list)
    air_freight: list[KpiMonthlyRow] = field(default_factory=list)
    logistics_vs_prod: list[LogisticsVsProdRow] = field(default_factory=list)
    incidental_cost: list[KpiMonthlyRow] = field(default_factory=list)
    total_cost: list[KpiMonthlyRow] = field(default_factory=list)
    demurrage: list[KpiMonthlyRow] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
