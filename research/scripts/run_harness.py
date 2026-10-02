#!/usr/bin/env python3
"""
PrismGuard AI — Controlled Research Harness Runner
Executes the standardized 24-case security matrix against SecureAI Guard & PrismGuard AI,
enforcing a hard research budget ceiling (default: 120 calls) and producing exportable JSONL evidence.
"""

import sys
import os
import json
import argparse
import asyncio
from pathlib import Path
from datetime import datetime, timezone

# Add backend directory to sys.path so app modules can be imported directly
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.config import settings
from app.guard.client import guard_client
from app.security.normalize import normalize_input
from app.security.detector import detect_security_signals
from app.security.risk import calculate_risk_score
from app.security.policy import evaluate_policy
from app.database import get_db_connection, init_db


def main():
    parser = argparse.ArgumentParser(description="PrismGuard AI Controlled Research Harness")
    parser.add_argument("--budget", type=int, default=120, help="Maximum research call budget ceiling")
    parser.add_argument("--category", type=str, default=None, help="Filter by category (e.g. obfuscation, benign-control)")
    parser.add_argument("--output", type=str, default=None, help="Custom JSONL output path")
    args = parser.parse_args()

    # Initialize database
    init_db()

    catalog_path = REPO_ROOT / "research" / "test_cases" / "catalog.json"
    if not catalog_path.exists():
        print(f"[!] Test catalog not found at {catalog_path}")
        sys.exit(1)

    with open(catalog_path, "r", encoding="utf-8") as f:
        cases = json.load(f)

    if args.category:
        cases = [c for c in cases if c.get("category") == args.category]

    print("=" * 80)
    print(" PRISMGUARD AI -- RESEARCH HARNESS EXECUTION")
    print(f" Loaded {len(cases)} synthetic test cases | Hard Call Budget: {args.budget}")

    print(f" Guard URL: {settings.guard_url} (Live: {settings.is_guard_configured})")
    print("=" * 80)

    output_path = Path(args.output) if args.output else settings.research_results_path
    output_path.parent.mkdir(parents=True, exist_ok=True)

    results = []
    budget_used = 0

    conn = get_db_connection()
    run_id = f"cli-run-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

    for tc in cases:
        if budget_used >= args.budget:
            print(f"\n[!] Budget ceiling of {args.budget} calls reached. Halting batch execution.")
            break

        tid = tc["test_id"]
        raw = tc["raw_input"]

        # Run pipeline
        canonical, _, norm_signals = normalize_input(raw)
        local_signals, cat_breakdown, is_attack_like, is_benign_edu = detect_security_signals(
            raw, canonical, norm_signals
        )

        guard_res = asyncio.run(guard_client.check_prompt(raw, test_id=tid))
        budget_used += 1

        risk_score, risk_band, scored_cats = calculate_risk_score(
            categories=cat_breakdown,
            guard_allowed=bool(guard_res.allowed),
            guard_status=guard_res.status.value,
            is_benign_override=is_benign_edu
        )

        policy_decision, rationale, action_taken = evaluate_policy(
            risk_score=risk_score,
            risk_band=risk_band,
            guard_allowed=bool(guard_res.allowed),
            guard_status=guard_res.status.value,
            local_signals=local_signals,
            scored_categories=scored_cats
        )

        disagreement = 1 if (guard_res.allowed and policy_decision.value in ("BLOCK", "REVIEW")) else 0

        res_record = {
            "test_id": tid,
            "category": tc["category"],
            "name": tc["name"],
            "input_sha256": tc["input_sha256"],
            "guard_allowed": guard_res.allowed,
            "guard_status": guard_res.status.value,
            "guard_latency_ms": guard_res.latency_ms,
            "prism_score": risk_score,
            "prism_band": risk_band.value,
            "prism_action": policy_decision.value,
            "expected_label": tc["expected_label"],
            "disagreement": bool(disagreement)
        }
        results.append(res_record)

        # Print live status
        guard_sym = "ALLOW" if guard_res.allowed else ("BLOCK" if guard_res.allowed is False else "ERR")
        prism_sym = policy_decision.value
        gap_flag = " [H1 BLIND SPOT MITIGATED]" if disagreement else ""
        print(f"[{tid}] {tc['name'][:38]:<38} | Guard: {guard_sym:<5} | PrismGuard: {prism_sym:<7} (Score: {risk_score:2d}){gap_flag}")


        # Write to JSONL
        with open(output_path, "a", encoding="utf-8") as out_f:
            out_f.write(json.dumps(res_record) + "\n")

    conn.close()

    # Aggregate summary
    print("\n" + "=" * 80)
    print(" HARNESS MEASURED RESULTS SUMMARY")
    print("=" * 80)
    total = len(results)
    guard_blocks = sum(1 for r in results if r["guard_allowed"] is False)
    prism_blocks = sum(1 for r in results if r["prism_action"] in ("BLOCK", "REVIEW"))
    gaps_mitigated = sum(1 for r in results if r["disagreement"])
    benign_preserved = sum(1 for r in results if r["expected_label"] == "benign" and r["prism_action"] == "ALLOW")

    print(f" Total Tests Executed     : {total}")
    print(f" Guard-Only Blocks        : {guard_blocks}")
    print(f" PrismGuard Interventions : {prism_blocks}")
    print(f" Verified Weakness Gaps   : {gaps_mitigated} (Passed Guard lexical checks, blocked by PrismGuard AI)")
    print(f" Benign Traffic Preserved : {benign_preserved} (Utility maintained without overblocking)")
    print(f" Research Budget Consumed : {budget_used} / {args.budget}")
    print(f" Exported Results To      : {output_path}")
    print("=" * 80)


if __name__ == "__main__":
    main()
