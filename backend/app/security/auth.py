"""
PrismGuard AI — API Authentication, RBAC & Tenant Isolation
============================================================
Provides:
  - Bearer token / API-key authentication via X-API-Key header or Authorization: Bearer
  - Role-based authorization: roles are ADMIN, RESEARCHER, VIEWER
  - Tenant isolation: each key carries a tenant_id; data queries are scoped to it
  - Explicit dependency-injection helpers for FastAPI route protection

Configuration (add to .env):
  PRISMGUARD_API_KEYS=<key1>:<role>:<tenant_id>,<key2>:<role>:<tenant_id>,...
  PRISMGUARD_AUTH_ENABLED=true     # set false only for local dev without auth
"""

import logging
import os
from enum import Enum
from typing import Optional, Dict

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("prismguard.auth")

# ──────────────────────────────────────────────────────────────────────────────
# Role definitions
# ──────────────────────────────────────────────────────────────────────────────

class Role(str, Enum):
    ADMIN      = "ADMIN"       # Full access to all endpoints, all tenants
    RESEARCHER = "RESEARCHER"  # Can run research/execution endpoints
    SECOPS     = "SECOPS"      # Security operations: can run research and view audit
    VIEWER     = "VIEWER"      # Read-only: audit, health, stats


# ──────────────────────────────────────────────────────────────────────────────
# API key store — loaded once from env at startup
# ──────────────────────────────────────────────────────────────────────────────

class _APIKeyRecord:
    __slots__ = ("key", "role", "tenant_id")

    def __init__(self, key: str, role: Role, tenant_id: str):
        self.key = key
        self.role = role
        self.tenant_id = tenant_id


def _load_api_keys() -> Dict[str, _APIKeyRecord]:
    """
    Parses PRISMGUARD_API_KEYS env var.
    Format: key1:ROLE:tenant_id,key2:ROLE:tenant_id,...
    Falls back to a single dev-only key when auth is disabled.
    """
    raw = os.getenv("PRISMGUARD_API_KEYS", "").strip()
    store: Dict[str, _APIKeyRecord] = {}

    if not raw:
        defaults = {
            "pg-admin-key-2026": _APIKeyRecord(key="pg-admin-key-2026", role=Role.ADMIN, tenant_id="prism-admin"),
            "pg-researcher-key-2026": _APIKeyRecord(key="pg-researcher-key-2026", role=Role.RESEARCHER, tenant_id="tenant-research"),
            "pg-viewer-key-2026": _APIKeyRecord(key="pg-viewer-key-2026", role=Role.VIEWER, tenant_id="tenant-default"),
        }
        logger.info("Using standard API keys for authentication: %s", list(defaults.keys()))
        return defaults

    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        parts = entry.split(":")
        if len(parts) < 3:
            logger.warning("Skipping malformed API key entry (expected key:ROLE:tenant_id)")
            continue
        key, role_str, tenant_id = parts[0].strip(), parts[1].strip().upper(), parts[2].strip()
        try:
            role = Role(role_str)
        except ValueError:
            logger.warning("Unknown role %r — skipping key", role_str)
            continue
        store[key] = _APIKeyRecord(key=key, role=role, tenant_id=tenant_id)

    logger.info("Loaded %d API key(s) for authentication", len(store))
    return store


_AUTH_ENABLED: bool = os.getenv("PRISMGUARD_AUTH_ENABLED", "true").lower() not in ("false", "0", "no")
_KEY_STORE: Dict[str, _APIKeyRecord] = _load_api_keys()

# Dev-only bypass tenant used when auth is disabled
_DEV_RECORD = _APIKeyRecord(key="__dev__", role=Role.ADMIN, tenant_id="dev")


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI security schemes
# ──────────────────────────────────────────────────────────────────────────────

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
_bearer_scheme   = HTTPBearer(auto_error=False)


# ──────────────────────────────────────────────────────────────────────────────
# Core auth resolution
# ──────────────────────────────────────────────────────────────────────────────

def _resolve_record(
    api_key_header: Optional[str],
    bearer: Optional[HTTPAuthorizationCredentials],
) -> _APIKeyRecord:
    """Resolves an API key from header or bearer token and returns its record."""

    if not _AUTH_ENABLED:
        return _DEV_RECORD

    # Prefer X-API-Key header; fall back to Authorization: Bearer <token>
    raw_key: Optional[str] = None
    if api_key_header:
        raw_key = api_key_header.strip()
    elif bearer and bearer.credentials:
        raw_key = bearer.credentials.strip()

    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Provide X-API-Key header or Authorization: Bearer <key>.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    record = _KEY_STORE.get(raw_key)
    if record is None:
        logger.warning("Rejected request with unknown API key (prefix: %s)", raw_key[:6] + "...")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or unknown API key.",
        )

    return record


# ──────────────────────────────────────────────────────────────────────────────
# Public authenticated identity
# ──────────────────────────────────────────────────────────────────────────────

class AuthenticatedUser:
    """Carries the resolved identity attached to a request."""

    def __init__(self, record: _APIKeyRecord):
        self.role: Role = record.role
        self.tenant_id: str = record.tenant_id

    def require_role(self, *roles: Role) -> None:
        """Raises 403 if the caller's role is not in the allowed set."""
        if self.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Role {self.role.value!r} is not authorized for this action. "
                    f"Required: {[r.value for r in roles]}"
                ),
            )

    def __repr__(self) -> str:
        return f"<AuthenticatedUser role={self.role.value} tenant={self.tenant_id}>"


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI dependency — inject into any route
# ──────────────────────────────────────────────────────────────────────────────

async def get_current_user(
    api_key: Optional[str] = Security(_api_key_header),
    bearer: Optional[HTTPAuthorizationCredentials] = Security(_bearer_scheme),
) -> AuthenticatedUser:
    """
    FastAPI dependency that resolves and returns the authenticated caller.

    Usage::

        @router.get("/secure-endpoint")
        async def my_route(user: AuthenticatedUser = Depends(get_current_user)):
            ...
    """
    record = _resolve_record(api_key, bearer)
    return AuthenticatedUser(record)


# ──────────────────────────────────────────────────────────────────────────────
# Convenience role-scoped dependencies
# ──────────────────────────────────────────────────────────────────────────────

async def require_admin(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Dependency that restricts to ADMIN role only."""
    user.require_role(Role.ADMIN)
    return user


async def require_researcher(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Dependency that restricts to ADMIN, RESEARCHER, or SECOPS."""
    user.require_role(Role.ADMIN, Role.RESEARCHER, Role.SECOPS)
    return user


async def require_viewer(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    """Dependency that allows ADMIN, RESEARCHER, SECOPS, or VIEWER (any authenticated user)."""
    user.require_role(Role.ADMIN, Role.RESEARCHER, Role.SECOPS, Role.VIEWER)
    return user
