"""
app/services/dashboard_service.py
Lógica de negócio dos KPIs — decide como montar a resposta pro frontend.
Não faz SQL diretamente: sempre passa pelo DashboardRepository.
"""
from app.core.exceptions import DomainError
from app.core.kpi_meta import (
    compute_achievement,
    compute_ratio,
    validate_month,
    validate_year,
)
from app.models.kpi import KPI_MODEL_MAP
from app.models.kpi_change_log import KpiChangeLog
from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard_schema import (
    KpiRecordIn,
    KpiRecordOut,
    LogisticsVsProdIn,
    LogisticsVsProdOut,
    TaskCostSummaryOut,
)
from app.services.activity_log_service import ActivityLogService

QUARTER_MONTHS: dict[str, list[str]] = {
    "Q1": ["Jan", "Feb", "Mar"],
    "Q2": ["Apr", "May", "Jun"],
    "Q3": ["Jul", "Aug", "Sep"],
    "Q4": ["Oct", "Nov", "Dec"],
}
SEMESTER_MONTHS: dict[str, list[str]] = {
    "H1": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    "H2": ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
}


class DashboardService:
    def __init__(self, repository: DashboardRepository):
        self.repository = repository

    # ------------------------------------------------------------------
    # Leitura
    # ------------------------------------------------------------------

    def get_kpi(self, kpi_type: str, year: str | None, month: str | None) -> list[KpiRecordOut]:
        self._ensure_valid_kpi_type(kpi_type)
        records = self.repository.list_kpi_records(kpi_type, year=year, month=month)
        return [KpiRecordOut.model_validate(r) for r in records]

    def get_logistics_vs_prod(self) -> list[LogisticsVsProdOut]:
        records = self.repository.list_logistics_vs_prod()
        return [LogisticsVsProdOut.model_validate(r) for r in records]

    def get_dashboard(self) -> dict[str, list]:
        payload: dict[str, list] = {
            kpi_type: self.get_kpi(kpi_type, year=None, month=None) for kpi_type in KPI_MODEL_MAP
        }
        payload["logistics_vs_prod"] = self.get_logistics_vs_prod()
        return payload

    def get_total_cost_summary(
        self, period: str, year: str, sub_period: str | None
    ) -> TaskCostSummaryOut:
        year = self._ensure_valid_year(year)
        records = self.repository.list_kpi_records("total_cost", year=year, month=None)

        if period == "monthly":
            month = validate_month(sub_period) if sub_period else None
            filtered = [r for r in records if month is None or r.month == month]
        elif period == "quarterly":
            months = QUARTER_MONTHS.get(sub_period or "", [])
            if not months:
                raise DomainError(
                    f"sub_period inválido para quarterly: {sub_period}. Válidos: {', '.join(QUARTER_MONTHS)}",
                    status_code=422,
                )
            filtered = [r for r in records if r.month in months]
        elif period == "semiannual":
            months = SEMESTER_MONTHS.get(sub_period or "", [])
            if not months:
                raise DomainError(
                    f"sub_period inválido para semiannual: {sub_period}. Válidos: {', '.join(SEMESTER_MONTHS)}",
                    status_code=422,
                )
            filtered = [r for r in records if r.month in months]
        elif period == "annual":
            filtered = list(records)
        else:
            raise DomainError(
                f"period inválido: {period}. Válidos: monthly, quarterly, semiannual, annual",
                status_code=422,
            )

        target_sum = sum(r.target for r in filtered) if filtered else None
        result_sum = sum(r.result for r in filtered) if filtered else None
        achievement = (
            compute_achievement("total_cost", target_sum, result_sum) if filtered else None
        )

        return TaskCostSummaryOut(
            period=period,
            year=year,
            sub_period=sub_period,
            target=target_sum,
            result=result_sum,
            achievement=achievement,
            status="good",
            months_included=[r.month for r in filtered],
        )

    # ------------------------------------------------------------------
    # Escrita manual (formulário do dashboard)
    # ------------------------------------------------------------------

    def save_kpi_record(
        self,
        kpi_type: str,
        year: str,
        month: str,
        payload: KpiRecordIn,
        user: dict | None = None,
    ) -> KpiRecordOut:
        self._ensure_valid_kpi_type(kpi_type)
        month, year = self._ensure_valid_period(month, year)

        achievement = payload.achievement
        if achievement is None:
            achievement = compute_achievement(kpi_type, payload.target, payload.result)

        existing_records = self.repository.list_kpi_records(kpi_type, year=year, month=month)
        existing = existing_records[0] if existing_records else None

        snapshot_before = None
        if existing:
            snapshot_before = {
                "target": float(existing.target) if existing.target is not None else None,
                "result": float(existing.result) if existing.result is not None else None,
                "achievement": float(existing.achievement) if existing.achievement is not None else None,
            }

        user_id = user.get("id") if user else None
        user_email = user.get("email") if user else None

        self.repository.upsert_kpi_record(
            kpi_type=kpi_type,
            month=month,
            year=year,
            target=payload.target,
            result=payload.result,
            achievement=achievement,
        )

        db = getattr(self.repository, "db", None)

        fields_to_check = [
            ("target", existing.target if existing else None, payload.target),
            ("result", existing.result if existing else None, payload.result),
            ("achievement", existing.achievement if existing else None, achievement),
        ]

        for field_name, old_val, new_val in fields_to_check:
            old_float = float(old_val) if old_val is not None else None
            new_float = float(new_val) if new_val is not None else None
            if old_float != new_float:
                change = KpiChangeLog(
                    user_id=user_id,
                    user_email=user_email,
                    kpi_type=kpi_type,
                    month=month,
                    year=year,
                    field_name=field_name,
                    old_value=old_float,
                    new_value=new_float,
                    source="manual",
                    snapshot_before=snapshot_before,
                )
                if db and hasattr(db, "add"):
                    db.add(change)

        self.repository.commit()

        if db and hasattr(db, "add"):
            ActivityLogService(db).log(
                action_type="MANUAL_EDIT",
                user_id=user_id,
                user_email=user_email,
                entity_type=kpi_type,
                entity_id=f"{kpi_type}:{month}:{year}",
                detail={
                    "kpi_type": kpi_type,
                    "month": month,
                    "year": year,
                    "target": payload.target,
                    "result": payload.result,
                    "achievement": achievement,
                    "snapshot_before": snapshot_before,
                },
            )

        return KpiRecordOut(
            month=month,
            year=year,
            target=payload.target,
            result=payload.result,
            achievement=achievement,
        )

    def save_logistics_vs_prod(
        self,
        year: str,
        month: str,
        payload: LogisticsVsProdIn,
        user: dict | None = None,
    ) -> LogisticsVsProdOut:
        month, year = self._ensure_valid_period(month, year)

        ratio = payload.ratio
        if ratio is None:
            ratio = compute_ratio(payload.logistics_cost, payload.production_amount)

        existing_list = [r for r in self.repository.list_logistics_vs_prod() if r.month == month and r.year == year]
        existing = existing_list[0] if existing_list else None

        snapshot_before = None
        if existing:
            snapshot_before = {
                "logistics_cost": float(existing.logistics_cost),
                "production_amount": float(existing.production_amount),
                "ratio": float(existing.ratio) if existing.ratio is not None else None,
            }

        user_id = user.get("id") if user else None
        user_email = user.get("email") if user else None

        self.repository.upsert_logistics_vs_prod(
            month=month,
            year=year,
            logistics_cost=payload.logistics_cost,
            production_amount=payload.production_amount,
            ratio=ratio,
        )

        db = getattr(self.repository, "db", None)

        fields_to_check = [
            ("logistics_cost", existing.logistics_cost if existing else None, payload.logistics_cost),
            ("production_amount", existing.production_amount if existing else None, payload.production_amount),
            ("ratio", existing.ratio if existing else None, ratio),
        ]

        for field_name, old_val, new_val in fields_to_check:
            old_float = float(old_val) if old_val is not None else None
            new_float = float(new_val) if new_val is not None else None
            if old_float != new_float:
                change = KpiChangeLog(
                    user_id=user_id,
                    user_email=user_email,
                    kpi_type="logistics_vs_prod",
                    month=month,
                    year=year,
                    field_name=field_name,
                    old_value=old_float,
                    new_value=new_float,
                    source="manual",
                    snapshot_before=snapshot_before,
                )
                if db and hasattr(db, "add"):
                    db.add(change)

        self.repository.commit()

        if db and hasattr(db, "add"):
            ActivityLogService(db).log(
                action_type="MANUAL_EDIT",
                user_id=user_id,
                user_email=user_email,
                entity_type="logistics_vs_prod",
                entity_id=f"logistics_vs_prod:{month}:{year}",
                detail={
                    "kpi_type": "logistics_vs_prod",
                    "month": month,
                    "year": year,
                    "logistics_cost": payload.logistics_cost,
                    "production_amount": payload.production_amount,
                    "ratio": ratio,
                    "snapshot_before": snapshot_before,
                },
            )

        return LogisticsVsProdOut(
            month=month,
            year=year,
            logistics_cost=payload.logistics_cost,
            production_amount=payload.production_amount,
            ratio=ratio,
        )

    def delete_kpi_record(self, kpi_type: str, year: str, month: str, user: dict | None = None) -> dict:
        self._ensure_valid_kpi_type(kpi_type)
        month, year = self._ensure_valid_period(month, year)

        existing_records = self.repository.list_kpi_records(kpi_type, year=year, month=month)
        existing = existing_records[0] if existing_records else None

        user_id = user.get("id") if user else None
        user_email = user.get("email") if user else None

        deleted = self.repository.delete_kpi_record(kpi_type, month=month, year=year)
        if not deleted:
            raise DomainError(
                f"Nenhum lançamento de {kpi_type} em {month}/{year} para remover.", status_code=404
            )

        db = getattr(self.repository, "db", None)

        if existing and db and hasattr(db, "add"):
            snapshot_before = {
                "target": float(existing.target) if existing.target is not None else None,
                "result": float(existing.result) if existing.result is not None else None,
                "achievement": float(existing.achievement) if existing.achievement is not None else None,
            }
            change = KpiChangeLog(
                user_id=user_id,
                user_email=user_email,
                kpi_type=kpi_type,
                month=month,
                year=year,
                field_name="record_deleted",
                old_value=float(existing.result) if existing.result is not None else None,
                new_value=None,
                source="manual",
                snapshot_before=snapshot_before,
            )
            db.add(change)

        self.repository.commit()

        if db and hasattr(db, "add"):
            ActivityLogService(db).log(
                action_type="MANUAL_DELETE",
                user_id=user_id,
                user_email=user_email,
                entity_type=kpi_type,
                entity_id=f"{kpi_type}:{month}:{year}",
                detail={"kpi_type": kpi_type, "month": month, "year": year},
            )

        return {"status": "deleted", "kpi_type": kpi_type, "month": month, "year": year}

    # ------------------------------------------------------------------
    # Validações
    # ------------------------------------------------------------------

    @staticmethod
    def _ensure_valid_kpi_type(kpi_type: str) -> None:
        if kpi_type not in KPI_MODEL_MAP:
            valid = ", ".join(KPI_MODEL_MAP)
            raise DomainError(f"kpi_type inválido: {kpi_type}. Válidos: {valid}", status_code=422)

    @staticmethod
    def _ensure_valid_period(month: str, year: str) -> tuple[str, str]:
        try:
            return validate_month(month), validate_year(year)
        except ValueError as exc:
            raise DomainError(str(exc), status_code=422) from exc

    @staticmethod
    def _ensure_valid_year(year: str) -> str:
        try:
            return validate_year(year)
        except ValueError as exc:
            raise DomainError(str(exc), status_code=422) from exc
