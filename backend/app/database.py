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


def init_db():
    """Initializes tables and indexes in the SQLite database."""
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
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                input_sha256 TEXT NOT NULL,
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
                input_length INTEGER NOT NULL,
                expected_label TEXT NOT NULL,
                expected_guard_behavior TEXT,
                observed_guard_behavior TEXT,
                our_mitigation TEXT NOT NULL,
                reproducible_runs TEXT,
                mitigation_note TEXT
            );
            """)

            # Indexes for fast querying in dashboard & audit views
            conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events (timestamp DESC);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_decision ON audit_events (policy_decision);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_risk_band ON audit_events (risk_band);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_research_test_id ON research_results (test_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_research_timestamp ON research_results (timestamp DESC);")

        logger.info("PrismGuard AI SQLite database initialized successfully at %s", settings.database_path)
    finally:
        conn.close()


# Ensure tables are initialized on startup
init_db()



def save_audit_event(event: Dict[str, Any]) -> None:
    """Inserts a structured audit event into SQLite."""
    conn = get_db_connection()
    try:
        with conn:
            conn.execute("""
            INSERT INTO audit_events (
                id, timestamp, gateway_request_id, test_id, input_sha256, input_length,
                transformation_metadata, local_signals, guard_status, guard_allowed,
                guard_flags, guard_checks, guard_request_id, guard_latency_ms,
                risk_score, risk_band, policy_decision, response_decision,
                total_latency_ms, stage_latencies, action_taken, policy_rationale,
                request_summary
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.get("id"),
                event.get("timestamp"),
                event.get("gateway_request_id"),
                event.get("test_id"),
                event.get("input_sha256"),
                event.get("input_length", 0),
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
                event.get("request_summary", "")
            ))
    finally:
        conn.close()


def query_audit_events(
    limit: int = 50,
    offset: int = 0,
    decision: Optional[str] = None,
    risk_band: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieves paginated audit events with optional filtering."""
    conn = get_db_connection()
    try:
        query = "SELECT * FROM audit_events"
        conditions = []
        params = []

        if decision:
            conditions.append("policy_decision = ?")
            params.append(decision.upper())
        if risk_band:
            conditions.append("risk_band = ?")
            params.append(risk_band.upper())

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor = conn.execute(query, params)
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            results.append({
                "id": r["id"],
                "timestamp": r["timestamp"],
                "gateway_request_id": r["gateway_request_id"],
                "test_id": r["test_id"],
                "input_sha256": r["input_sha256"],
                "input_length": r["input_length"],
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


def get_audit_summary_stats() -> Dict[str, Any]:
    """Computes measured dashboard metrics from the audit database."""
    conn = get_db_connection()
    try:
        cursor = conn.execute("""
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
        """)
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
