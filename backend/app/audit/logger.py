import json
import logging
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from pathlib import Path

from app.config import settings
from app.database import save_audit_event

logger = logging.getLogger("prismguard.audit")


def compute_sha256(text: str) -> str:
    """Computes SHA-256 hash of text for privacy-preserving auditing."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


class AuditLogger:
    """
    Records privacy-preserving, structured security audit events to SQLite and JSONL.
    Never stores secrets, tokens, or unredacted confidential keys.
    """
    def __init__(self):
        self.jsonl_path = settings.audit_log_jsonl_path

    def record_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enriches and records an audit event to SQLite and appends to research JSONL.
        """
        # Ensure timestamp is ISO-8601 UTC
        if "timestamp" not in event_data or not event_data["timestamp"]:
            event_data["timestamp"] = datetime.now(timezone.utc).isoformat()

        # Save to SQLite
        try:
            save_audit_event(event_data)
        except Exception as e:
            logger.error("Failed to save audit event to SQLite: %s", e)

        # Append to JSONL research export file
        try:
            with open(self.jsonl_path, "a", encoding="utf-8") as f:
                f.write(json.dumps(event_data) + "\n")
        except Exception as e:
            logger.error("Failed to append audit event to JSONL: %s", e)

        return event_data


# Global audit logger singleton
audit_logger = AuditLogger()
