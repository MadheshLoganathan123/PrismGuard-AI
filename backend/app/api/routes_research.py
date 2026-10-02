import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException

from app.config import settings, ROOT_DIR
from app.models.schemas import ResearchRunRequest, ResearchRunResult, TestCaseModel
from app.security.normalize import normalize_input
from app.security.detector import detect_security_signals
from app.security.risk import calculate_risk_score
from app.security.policy import evaluate_policy
from app.guard.client import guard_client
from app.database import get_db_connection

router = APIRouter(prefix="/api/research", tags=["Research"])

CATALOG_PATH = ROOT_DIR / "research" / "test_cases" / "catalog.json"


def load_test_catalog() -> List[Dict[str, Any]]:
    """Loads standardized test catalog from SQLite test_catalog table with JSON fallback."""
    try:
        conn = get_db_connection()
        cursor = conn.execute("SELECT * FROM test_catalog ORDER BY test_id ASC")
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        if rows:
            return rows
    except Exception:
        pass

    if CATALOG_PATH.exists():
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []



@router.get("/test-cases", response_model=List[TestCaseModel])
async def get_test_cases():
    """Returns catalog of standardized synthetic test cases."""
    return load_test_catalog()


@router.post("/run", response_model=ResearchRunResult)
async def run_research_batch(request: ResearchRunRequest):
    """
    Executes controlled research harness tests against SecureAI Guard and PrismGuard AI.
    Enforces the configurable hard research call budget (default 120 calls).
    """
    catalog = {tc["test_id"]: tc for tc in load_test_catalog()}
    valid_ids = [tid for tid in request.test_ids if tid in catalog]

    if not valid_ids:
        raise HTTPException(status_code=400, detail="No recognized test IDs provided in request.")

    # Check budget ceiling before running
    if guard_client.quota_remaining < len(valid_ids):
        raise HTTPException(
            status_code=429,
            detail=f"Requested {len(valid_ids)} tests, but remaining research budget is {guard_client.quota_remaining}."
        )

    run_id = f"run-{uuid.uuid4().hex[:8]}"
    run_timestamp = datetime.now(timezone.utc).isoformat()
    results = []

    conn = get_db_connection()
    try:
        for tid in valid_ids:
            tc = catalog[tid]
            raw_text = tc["raw_input"]

            # 1. Normalization
            canonical_text, _, norm_signals = normalize_input(raw_text)

            # 2. Local detector
            local_signals, cat_breakdown, is_attack_like, is_benign_edu = detect_security_signals(
                raw_text, canonical_text, norm_signals
            )

            # 3. Guard screening
            guard_res = await guard_client.check_prompt(raw_text, test_id=tid)

            # 4. Risk engine
            risk_score, risk_band, scored_cats = calculate_risk_score(
                categories=cat_breakdown,
                guard_allowed=bool(guard_res.allowed),
                guard_status=guard_res.status.value,
                is_benign_override=is_benign_edu
            )

            # 5. Policy engine
            policy_decision, rationale, action_taken = evaluate_policy(
                risk_score=risk_score,
                risk_band=risk_band,
                guard_allowed=bool(guard_res.allowed),
                guard_status=guard_res.status.value,
                local_signals=local_signals,
                scored_categories=scored_cats
            )

            # Disagreement check (Guard allowed vs PrismGuard blocked/flagged)
            disagreement = 1 if (guard_res.allowed and policy_decision.value in ("BLOCK", "REVIEW")) else 0

            test_result = {
                "id": f"res-{uuid.uuid4().hex[:8]}",
                "test_id": tid,
                "run_id": run_id,
                "timestamp": run_timestamp,
                "category": tc["category"],
                "description": tc["name"],
                "input_sha256": tc["input_sha256"],
                "input_length": tc["input_length"],
                "guard_allowed": 1 if guard_res.allowed is True else (0 if guard_res.allowed is False else None),
                "guard_status": guard_res.status.value,
                "guard_flags": json.dumps(guard_res.flags),
                "guard_latency_ms": guard_res.latency_ms,
                "guard_request_id": guard_res.request_id,
                "prism_score": risk_score,
                "prism_signals": json.dumps(local_signals),
                "prism_action": policy_decision.value,
                "expected_label": tc["expected_label"],
                "disagreement": disagreement,
                "notes": tc.get("mitigation_note", "")
            }

            # Persist to research_results table
            conn.execute("""
            INSERT INTO research_results (
                id, test_id, run_id, timestamp, category, description, input_sha256,
                input_length, guard_allowed, guard_status, guard_flags, guard_latency_ms,
                guard_request_id, prism_score, prism_signals, prism_action, expected_label,
                disagreement, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                test_result["id"], test_result["test_id"], test_result["run_id"],
                test_result["timestamp"], test_result["category"], test_result["description"],
                test_result["input_sha256"], test_result["input_length"],
                test_result["guard_allowed"], test_result["guard_status"],
                test_result["guard_flags"], test_result["guard_latency_ms"],
                test_result["guard_request_id"], test_result["prism_score"],
                test_result["prism_signals"], test_result["prism_action"],
                test_result["expected_label"], test_result["disagreement"],
                test_result["notes"]
            ))

            # Clean JSON representation for response & JSONL export
            clean_res = dict(test_result)
            clean_res["guard_flags"] = guard_res.flags
            clean_res["prism_signals"] = local_signals
            results.append(clean_res)

        conn.commit()

        # Append to research results JSONL
        with open(settings.research_results_path, "a", encoding="utf-8") as f:
            for r in results:
                f.write(json.dumps(r) + "\n")

    finally:
        conn.close()

    return ResearchRunResult(
        run_id=run_id,
        timestamp=run_timestamp,
        tests_executed=len(results),
        results=results,
        quota_used_in_run=len(results),
        total_quota_consumed=guard_client.calls_made,
        budget_limit=settings.guard_research_budget
    )


@router.get("/results")
async def get_research_results():
    """
    Returns aggregate research findings and evidence comparison.
    Shows measured detection rates without hardcoded values.
    """
    conn = get_db_connection()
    try:
        cursor = conn.execute("""
            SELECT 
                COUNT(*) as total_tests,
                SUM(CASE WHEN guard_allowed = 0 THEN 1 ELSE 0 END) as guard_detections,
                SUM(CASE WHEN prism_action IN ('BLOCK', 'REVIEW') THEN 1 ELSE 0 END) as prism_detections,
                SUM(CASE WHEN disagreement = 1 THEN 1 ELSE 0 END) as weakness_demonstrated_count,
                SUM(CASE WHEN expected_label = 'benign' AND prism_action = 'ALLOW' THEN 1 ELSE 0 END) as benign_preserved_count,
                AVG(guard_latency_ms) as avg_guard_latency_ms
            FROM research_results
        """)
        row = cursor.fetchone()

        # Recent runs list
        recent_cursor = conn.execute("""
            SELECT test_id, category, description, input_sha256, guard_allowed, 
                   guard_status, prism_score, prism_action, disagreement, timestamp
            FROM research_results
            ORDER BY timestamp DESC LIMIT 30
        """)
        recent_rows = [dict(r) for r in recent_cursor.fetchall()]

        total_tests = row["total_tests"] or 0
        return {
            "metrics": {
                "total_executed": total_tests,
                "guard_only_detections": row["guard_detections"] or 0,
                "prismguard_detections": row["prism_detections"] or 0,
                "weakness_demonstrated_count": row["weakness_demonstrated_count"] or 0,
                "benign_preserved_count": row["benign_preserved_count"] or 0,
                "avg_guard_latency_ms": round(row["avg_guard_latency_ms"] or 0.0, 1),
                "budget_calls_made": guard_client.calls_made,
                "budget_ceiling": settings.guard_research_budget,
                "quota_remaining": guard_client.quota_remaining
            },
            "recent_records": recent_rows
        }
    finally:
        conn.close()
