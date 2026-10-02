from typing import Optional, List
from fastapi import APIRouter, Query

from app.database import query_audit_events, get_audit_summary_stats

router = APIRouter(prefix="/api/audit", tags=["Audit"])


@router.get("", response_model=List[dict])
async def list_audit_events(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    decision: Optional[str] = Query(default=None),
    risk_band: Optional[str] = Query(default=None)
):
    """
    Returns paginated audit trail events with privacy-preserving hashes and zero secrets.
    """
    return query_audit_events(limit=limit, offset=offset, decision=decision, risk_band=risk_band)


@router.get("/stats")
async def get_audit_statistics():
    """
    Returns aggregate summary statistics measured from the audit log database.
    """
    return get_audit_summary_stats()
