from typing import Optional, List
from fastapi import APIRouter, Query, Depends

from app.database import query_audit_events, get_audit_summary_stats
from app.security.auth import AuthenticatedUser, require_viewer, require_admin

router = APIRouter(prefix="/api/audit", tags=["Audit"])


@router.get("", response_model=List[dict])
async def list_audit_events(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    decision: Optional[str] = Query(default=None),
    risk_band: Optional[str] = Query(default=None),
    execution_mode: Optional[str] = Query(default=None),
    user: AuthenticatedUser = Depends(require_viewer)
):
    """
    Returns paginated audit trail events scoped to the caller's tenant.
    Responses contain only privacy-preserving hashes — never raw prompts.
    Supports filtering by decision, risk_band, and execution_mode.
    Requires: VIEWER, RESEARCHER, or ADMIN role.
    """
    events = query_audit_events(
        limit=limit,
        offset=offset,
        decision=decision,
        risk_band=risk_band,
        execution_mode=execution_mode,
        tenant_id=user.tenant_id
    )
    # Strip request_summary from all returned events to prevent prompt exposure
    for evt in events:
        evt.pop("request_summary", None)
    return events


@router.get("/stats")
async def get_audit_statistics(user: AuthenticatedUser = Depends(require_viewer)):
    """
    Returns aggregate summary statistics measured from the audit log database.
    Requires: VIEWER, RESEARCHER, or ADMIN role.
    """
    return get_audit_summary_stats(tenant_id=user.tenant_id)
