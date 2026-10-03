import sqlite3
import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pathlib import Path
from app.config import settings

logger = logging.getLogger("prismguard.database")


def get_db_connection() -> sqlite3.Connection:
    """Creates a connection to the SQLite database with row factory enabled."""
    conn = sqlite3.connect(str(settings.database_path), timeout=10.0)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for high concurrency and crash safety
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def _migrate_table_columns(conn: sqlite3.Connection, table: str, columns: Dict[str, str]):
    """Adds missing columns to a table if they do not exist."""
    cursor = conn.execute(f"PRAGMA table_info({table});")
    existing = {row["name"] for row in cursor.fetchall()}
    for col, col_def in columns.items():
        if col not in existing:
            try:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def};")
                logger.info("Migrated table %s: added column %s %s", table, col, col_def)
            except Exception as e:
                logger.warning("Could not add column %s to %s: %s", col, table, e)


def init_db():
    """Initializes tables, indexes, and migrations in the SQLite database."""
    conn = get_db_connection()
    try:
        with conn:
            # Audit events table
            conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_events (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                gateway_request_id TEXT NOT NULL UNIQUE,
                test_id TEXT,
                input_sha256 TEXT NOT NULL,
                input_length INTEGER NOT NULL,
                execution_mode TEXT DEFAULT 'LIVE',
                tenant_id TEXT DEFAULT 'default',
                transformation_metadata TEXT,
                local_signals TEXT NOT NULL,
                guard_status TEXT NOT NULL,
                guard_allowed INTEGER,
                guard_flags TEXT NOT NULL,
                guard_checks TEXT,
                guard_request_id TEXT,
                guard_latency_ms REAL,
                risk_score INTEGER NOT NULL,
                risk_band TEXT NOT NULL,
                policy_decision TEXT NOT NULL,
                response_decision TEXT,
                total_latency_ms REAL NOT NULL,
                stage_latencies TEXT NOT NULL,
                action_taken TEXT NOT NULL,
                policy_rationale TEXT NOT NULL,
                request_summary TEXT
            );
            """)

            # Research harness runs & results table
            conn.execute("""
            CREATE TABLE IF NOT EXISTS research_results (
                id TEXT PRIMARY KEY,
                test_id TEXT NOT NULL,
                run_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                execution_mode TEXT DEFAULT 'LIVE',
                tenant_id TEXT DEFAULT 'default',
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                input_sha256 TEXT NOT NULL,
                catalog_sha256 TEXT,
                hash_verified INTEGER DEFAULT 1,
                input_length INTEGER NOT NULL,
                guard_allowed INTEGER,
                guard_status TEXT NOT NULL,
                guard_flags TEXT NOT NULL,
                guard_latency_ms REAL,
                guard_request_id TEXT,
                prism_score INTEGER NOT NULL,
                prism_signals TEXT NOT NULL,
                prism_action TEXT NOT NULL,
                expected_label TEXT NOT NULL,
                disagreement INTEGER NOT NULL DEFAULT 0,
                notes TEXT
            );
            """)

            # Catalog of standardized test cases
            conn.execute("""
            CREATE TABLE IF NOT EXISTS test_catalog (
                test_id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                attack_class TEXT NOT NULL,
                name TEXT NOT NULL,
                transformation TEXT NOT NULL,
                purpose TEXT NOT NULL,
                raw_input TEXT NOT NULL,
                canonical_input TEXT NOT NULL,
                input_sha256 TEXT NOT NULL,
                canonical_sha256 TEXT,
                catalog_version TEXT DEFAULT 'v1.1.0',
                input_length INTEGER NOT NULL,
                expected_label TEXT NOT NULL,
                expected_guard_behavior TEXT,
                observed_guard_behavior TEXT,
                our_mitigation TEXT NOT NULL,
                reproducible_runs TEXT,
                mitigation_note TEXT
            );
            """)

            # Apply non-destructive migrations for existing databases
            _migrate_table_columns(conn, "audit_events", {
                "execution_mode": "TEXT DEFAULT 'LIVE'",
                "tenant_id": "TEXT DEFAULT 'default'"
            })
            _migrate_table_columns(conn, "research_results", {
                "execution_mode": "TEXT DEFAULT 'LIVE'",
                "tenant_id": "TEXT DEFAULT 'default'",
                "catalog_sha256": "TEXT",
                "hash_verified": "INTEGER DEFAULT 1"
            })
            _migrate_table_columns(conn, "test_catalog", {
                "canonical_sha256": "TEXT",
                "catalog_version": "TEXT DEFAULT 'v1.1.0'"
            })

            # Privacy hardening: sanitize historical audit logs in SQLite to wipe any raw prompts
            conn.execute("""
                UPDATE audit_events 
                SET request_summary = '[REDACTED — sha256:' || SUBSTR(input_sha256, 1, 16) || '...]'
                WHERE request_summary NOT LIKE '[REDACTED%' AND request_summary IS NOT NULL AND request_summary != '';
            """)

            # Indexes for fast querying in dashboard & audit views
            conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events (timestamp DESC);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_decision ON audit_events (policy_decision);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_risk_band ON audit_events (risk_band);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_events (tenant_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_mode ON audit_events (execution_mode);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_research_test_id ON research_results (test_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_research_timestamp ON research_results (timestamp DESC);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_research_tenant ON research_results (tenant_id);")

            # Seed / sync catalog with catalog.json to maintain canonical hashes & versions
            catalog_path = settings.database_path.parent.parent / "research" / "test_cases" / "catalog.json"
            if catalog_path.exists():
                try:
                    with open(catalog_path, "r", encoding="utf-8") as f:
                        entries = json.load(f)
                    for tc in entries:
                        conn.execute("""
                        INSERT OR REPLACE INTO test_catalog (
                            test_id, category, attack_class, name, transformation, purpose,
                            raw_input, canonical_input, input_sha256, canonical_sha256,
                            catalog_version, input_length,
                            expected_label, expected_guard_behavior, observed_guard_behavior,
                            our_mitigation, reproducible_runs, mitigation_note
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            tc.get("test_id"), tc.get("category"), tc.get("attack_class"),
                            tc.get("name"), tc.get("transformation"), tc.get("purpose"),
                            tc.get("raw_input"), tc.get("canonical_input"),
                            tc.get("input_sha256"), tc.get("canonical_sha256", tc.get("input_sha256")),
                            tc.get("catalog_version", "v1.1.0"),
                            tc.get("input_length", len(tc.get("raw_input", ""))),
                            tc.get("expected_label"),
                            tc.get("expected_guard_behavior"), tc.get("observed_guard_behavior"),
                            tc.get("our_mitigation"), tc.get("reproducible_runs"),
                            tc.get("mitigation_note")
                        ))
                    logger.info("Synchronized %d test cases in test_catalog table with canonical SHA-256 hashes", len(entries))
                except Exception as e:
                    logger.warning("Could not sync test_catalog: %s", e)

        logger.info("PrismGuard AI SQLite database initialized successfully at %s", settings.database_path)

    finally:
        conn.close()


# Ensure tables are initialized on startup
init_db()


def save_audit_event(event: Dict[str, Any]) -> None:
    """Inserts a structured audit event into SQLite with tenant isolation and execution mode."""
    conn = get_db_connection()
    try:
        raw_summary = event.get("request_summary", "")
        input_sha256 = event.get("input_sha256", "")
        # Strict privacy enforcement: never save raw prompt text
        if not raw_summary.startswith("[REDACTED"):
            redacted_summary = f"[REDACTED — sha256:{input_sha256[:16]}...]"
        else:
            redacted_summary = raw_summary

        with conn:
            conn.execute("""
            INSERT INTO audit_events (
                id, timestamp, gateway_request_id, test_id, input_sha256, input_length,
                execution_mode, tenant_id,
                transformation_metadata, local_signals, guard_status, guard_allowed,
                guard_flags, guard_checks, guard_request_id, guard_latency_ms,
                risk_score, risk_band, policy_decision, response_decision,
                total_latency_ms, stage_latencies, action_taken, policy_rationale,
                request_summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.get("id"),
                event.get("timestamp"),
                event.get("gateway_request_id"),
                event.get("test_id"),
                input_sha256,
                event.get("input_length", 0),
                event.get("execution_mode", "LIVE"),
                event.get("tenant_id", "default"),
                json.dumps(event.get("transformation_metadata", {})),
                json.dumps(event.get("local_signals", [])),
                event.get("guard_status", "complete"),
                1 if event.get("guard_allowed") is True else (0 if event.get("guard_allowed") is False else None),
                json.dumps(event.get("guard_flags", [])),
                json.dumps(event.get("guard_checks", {})),
                event.get("guard_request_id"),
                event.get("guard_latency_ms", 0.0),
                event.get("risk_score", 0),
                event.get("risk_band", "LOW"),
                event.get("policy_decision", "ALLOW"),
                event.get("response_decision"),
                event.get("total_latency_ms", 0.0),
                json.dumps(event.get("stage_latencies", {})),
                event.get("action_taken", ""),
                event.get("policy_rationale", ""),
                redacted_summary
            ))
    finally:
        conn.close()


def query_audit_events(
    limit: int = 50,
    offset: int = 0,
    decision: Optional[str] = None,
    risk_band: Optional[str] = None,
    tenant_id: Optional[str] = None,
    execution_mode: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieves paginated audit events with tenant scoping and optional filtering."""
    conn = get_db_connection()
    try:
        query = "SELECT * FROM audit_events"
        conditions = []
        params = []

        # Tenant isolation: unless caller is admin / tenant-all, scope strictly to tenant
        if tenant_id and tenant_id not in ("prism-admin", "admin", "all"):
            conditions.append("(tenant_id = ? OR tenant_id = 'default' OR tenant_id IS NULL)")
            params.append(tenant_id)

        if decision:
            conditions.append("policy_decision = ?")
            params.append(decision.upper())
        if risk_band:
            conditions.append("risk_band = ?")
            params.append(risk_band.upper())
        if execution_mode:
            conditions.append("execution_mode = ?")
            params.append(execution_mode.upper())

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            keys = r.keys()
            results.append({
                "id": r["id"],
                "timestamp": r["timestamp"],
                "gateway_request_id": r["gateway_request_id"],
                "test_id": r["test_id"],
                "input_sha256": r["input_sha256"],
                "input_length": r["input_length"],
                "execution_mode": r["execution_mode"] if "execution_mode" in keys else "LIVE",
                "tenant_id": r["tenant_id"] if "tenant_id" in keys else "default",
                "transformation_metadata": json.loads(r["transformation_metadata"] or "{}"),
                "local_signals": json.loads(r["local_signals"] or "[]"),
                "guard_status": r["guard_status"],
                "guard_allowed": None if r["guard_allowed"] is None else bool(r["guard_allowed"]),
                "guard_flags": json.loads(r["guard_flags"] or "[]"),
                "guard_checks": json.loads(r["guard_checks"] or "{}"),
                "guard_request_id": r["guard_request_id"],
                "guard_latency_ms": r["guard_latency_ms"],
                "risk_score": r["risk_score"],
                "risk_band": r["risk_band"],
                "policy_decision": r["policy_decision"],
                "response_decision": r["response_decision"],
                "total_latency_ms": r["total_latency_ms"],
                "stage_latencies": json.loads(r["stage_latencies"] or "{}"),
                "action_taken": r["action_taken"],
                "policy_rationale": r["policy_rationale"],
                "request_summary": r["request_summary"],
            })
        return results
    finally:
        conn.close()


def get_audit_summary_stats(tenant_id: Optional[str] = None) -> Dict[str, Any]:
    """Computes measured dashboard metrics from the audit database, scoped by tenant."""
    conn = get_db_connection()
    try:
        where_clause = ""
        params = []
        if tenant_id and tenant_id not in ("prism-admin", "admin", "all"):
            where_clause = "WHERE (tenant_id = ? OR tenant_id = 'default' OR tenant_id IS NULL)"
            params.append(tenant_id)

        query = f"""
            SELECT 
                COUNT(*) as total_requests,
                SUM(CASE WHEN policy_decision = 'ALLOW' THEN 1 ELSE 0 END) as allowed_count,
                SUM(CASE WHEN policy_decision = 'WARN' THEN 1 ELSE 0 END) as warned_count,
                SUM(CASE WHEN policy_decision = 'BLOCK' THEN 1 ELSE 0 END) as blocked_count,
                SUM(CASE WHEN policy_decision LIKE 'REVIEW%' THEN 1 ELSE 0 END) as review_count,
                SUM(CASE WHEN guard_allowed = 0 THEN 1 ELSE 0 END) as guard_blocks,
                SUM(CASE WHEN risk_score >= 60 THEN 1 ELSE 0 END) as local_high_risk,
                AVG(total_latency_ms) as avg_latency_ms,
                AVG(guard_latency_ms) as avg_guard_latency_ms
            FROM audit_events
            {where_clause}
        """
        cursor = conn.execute(query, params)
        row = cursor.fetchone()
        
        return {
            "total_requests": row["total_requests"] or 0,
            "allowed_count": row["allowed_count"] or 0,
            "warned_count": row["warned_count"] or 0,
            "blocked_count": row["blocked_count"] or 0,
            "review_count": row["review_count"] or 0,
            "guard_blocks": row["guard_blocks"] or 0,
            "local_high_risk": row["local_high_risk"] or 0,
            "avg_latency_ms": round(row["avg_latency_ms"] or 0.0, 1),
            "avg_guard_latency_ms": round(row["avg_guard_latency_ms"] or 0.0, 1)
        }
    finally:
        conn.close()
