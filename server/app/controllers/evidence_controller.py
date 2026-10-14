"""
Endpoints de evidências: upload, listagem, download e exclusão.
Cada registro pertence ao usuário autenticado e ao contexto do KPI/período.
"""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, get_db
from app.models.evidence import Evidence
from app.services.activity_log_service import ActivityLogService

router = APIRouter(prefix="/api/evidences", tags=["evidences"], dependencies=[Depends(get_current_user)])

ALLOWED_EXTENSIONS = {"ppt", "pptx", "pdf"}
MAX_SIZE = 50 * 1024 * 1024

KPI_MAP = {
    "logisticCost": "logistic_cost",
    "incidentialCost": "incidental_cost",
    "totalCost": "total_cost",
    "airFreight": "air_freight",
    "demurrage": "demurrage",
    "logisticsVsProd": "logistics_vs_prod",
}


def _normalize_kpis(kpi: str) -> list[str]:
    kpis = [kpi]
    norm = KPI_MAP.get(kpi)
    if norm and norm not in kpis:
        kpis.append(norm)
    for k, v in KPI_MAP.items():
        if v == kpi and k not in kpis:
            kpis.append(k)
    return kpis


def _normalize_years(year: str) -> list[str]:
    y = str(year).strip()
    res = [y]
    if y.startswith("Y") and y[1:].isdigit():
        alt = f"20{y[1:]}"
        if alt not in res:
            res.append(alt)
    elif len(y) == 4 and y.startswith("20") and y[2:].isdigit():
        alt = f"Y{y[2:]}"
        if alt not in res:
            res.append(alt)
    return res


def _current_user(authorization_user: dict = Depends(get_current_user)):
    return authorization_user


@router.get("")
def list_evidences(
    kpi_key: str = Query(...),
    year: str = Query(...),
    period: str = Query(...),
    current_user: dict = Depends(_current_user),
    db: Session = Depends(get_db),
):
    kpi_candidates = _normalize_kpis(kpi_key)
    year_candidates = _normalize_years(year)
    rows = (
        db.query(Evidence)
        .filter(
            Evidence.kpi_key.in_(kpi_candidates),
            Evidence.year.in_(year_candidates),
            Evidence.period == period,
        )
        .order_by(Evidence.created_at.desc())
        .all()
    )
    return [
        {
            "id": row.id,
            "kpiKey": row.kpi_key,
            "year": row.year,
            "period": row.period,
            "name": row.name,
            "size": row.size,
            "type": row.content_type,
            "createdAt": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.get("/user")
def list_user_evidences(
    current_user: dict = Depends(_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Evidence)
        .filter(Evidence.user_id == current_user["id"])
        .order_by(Evidence.created_at.desc())
        .all()
    )
    return [
        {
            "id": row.id,
            "kpiKey": row.kpi_key,
            "year": row.year,
            "period": row.period,
            "name": row.name,
            "size": row.size,
            "type": row.content_type,
            "createdAt": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


@router.post("", status_code=201)
async def upload_evidence(
    kpi_key: str = Query(...),
    year: str = Query(...),
    period: str = Query(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(_current_user),
    db: Session = Depends(get_db),
):
    extension = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Envie somente apresentações PowerPoint (.ppt ou .pptx) ou documentos PDF (.pdf).")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="O arquivo excede o limite máximo permitido de 50 MB.")

    canonical_kpi = KPI_MAP.get(kpi_key, kpi_key)
    evidence = Evidence(
        user_id=current_user["id"],
        kpi_key=canonical_kpi,
        year=year,
        period=period,
        name=file.filename,
        content_type=file.content_type,
        size=len(content),
        blob=content,
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    # Registrar no log de auditoria
    try:
        activity_service = ActivityLogService(db)
        activity_service.log(
            action_type="EVIDENCE_UPLOAD",
            user_id=current_user["id"],
            user_email=current_user.get("email"),
            entity_type="EVIDENCE",
            entity_id=evidence.id,
            detail={
                "kpi_key": kpi_key,
                "year": year,
                "period": period,
                "name": file.filename,
                "size": len(content),
            },
        )
    except Exception:
        pass

    return {
        "id": evidence.id,
        "kpiKey": evidence.kpi_key,
        "year": evidence.year,
        "period": evidence.period,
        "name": evidence.name,
        "size": evidence.size,
        "type": evidence.content_type,
        "createdAt": evidence.created_at.isoformat() if evidence.created_at else None,
    }


@router.get("/{evidence_id}/download")
def download_evidence(
    evidence_id: str,
    current_user: dict = Depends(_current_user),
    db: Session = Depends(get_db),
):
    evidence = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidência não encontrada.")
    return Response(
        content=evidence.blob,
        media_type=evidence.content_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{evidence.name}"'},
    )


@router.delete("/{evidence_id}", status_code=204)
def delete_evidence(
    evidence_id: str,
    current_user: dict = Depends(_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Evidence).filter(Evidence.id == evidence_id)
    if current_user.get("role") not in ("ADMIN", "GESTOR", "ANALISTA"):
        query = query.filter(Evidence.user_id == current_user["id"])
    evidence = query.first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidência não encontrada ou sem permissão para exclusão.")

    file_name = evidence.name
    kpi_key = evidence.kpi_key
    db.delete(evidence)
    db.commit()

    # Registrar exclusão no log de auditoria
    try:
        activity_service = ActivityLogService(db)
        activity_service.log(
            action_type="EVIDENCE_DELETE",
            user_id=current_user["id"],
            user_email=current_user.get("email"),
            entity_type="EVIDENCE",
            entity_id=evidence_id,
            detail={
                "kpi_key": kpi_key,
                "name": file_name,
            },
        )
    except Exception:
        pass

    return Response(status_code=204)
