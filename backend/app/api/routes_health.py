import time
from typing import Dict, Any, List
from fastapi import APIRouter, Depends

from app.config import settings
from app.guard.client import guard_client
from app.llm.client import llm_client
from app.database import get_db_connection
from app.security.auth import AuthenticatedUser, require_viewer

router = APIRouter(tags=["Health"])


@router.get("/health")
@router.get("/api/health")
async def health_check() -> Dict[str, Any]:
    """
    Returns system readiness and connectivity diagnostics without leaking secrets or tokens.
    """
    # 1. Database check
    db_ok = False
    try:
        conn = get_db_connection()
        conn.execute("SELECT 1;").fetchone()
        conn.close()
        db_ok = True
    except Exception:
        db_ok = False

    # 2. Guard status
    guard_health = await guard_client.get_health()

    # 3. Overall status
    all_ready = db_ok and (guard_health.get("status") in ("READY", "SIMULATED_READY"))
    
    return {
        "status": "healthy" if all_ready else "degraded",
        "timestamp": time.time(),
        "services": {
            "database": {
                "status": "READY" if db_ok else "ERROR",
                "engine": "SQLite WAL"
            },
            "secureai_guard": guard_health,
            "llm_adapter": {
                "configured": settings.is_llm_configured,
                "model": settings.llm_model,
                "base_url": settings.llm_base_url
            }
        },
        "config_summary": settings.get_safe_summary()
    }


@router.get("/api/guard/usage")
async def get_guard_usage(
    user: AuthenticatedUser = Depends(require_viewer)
) -> Dict[str, Any]:
    """Returns live Guard quota usage from the /v1/usage endpoint. Requires: VIEWER+."""
    return await guard_client.get_usage()

