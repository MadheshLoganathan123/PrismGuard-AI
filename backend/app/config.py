import os
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv

# Load .env file from project root or current working directory
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = ROOT_DIR / ".env"
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
else:
    load_dotenv()


class Settings:
    """
    Central environment-only configuration for PrismGuard AI.
    Never exposes raw tokens in logs, metrics, or error messages.
    """
    def __init__(self):
        # SecureAI Guard settings
        self.guard_url: str = os.getenv("GUARD_URL", "https://api.secureai.example.com").rstrip("/")
        self.guard_token: str = os.getenv("GUARD_TOKEN", "").strip()
        self.guard_timeout_seconds: float = float(os.getenv("GUARD_TIMEOUT_SECONDS", "5.0"))
        self.guard_max_retries: int = int(os.getenv("GUARD_MAX_RETRIES", "2"))
        self.guard_research_budget: int = int(os.getenv("GUARD_RESEARCH_BUDGET", "120"))

        # LLM settings
        self.llm_base_url: str = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        self.llm_api_key: str = os.getenv("LLM_API_KEY", "").strip()
        self.llm_model: str = os.getenv("LLM_MODEL", "gpt-4o-mini").strip()
        self.llm_timeout_seconds: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "15.0"))

        # Application & Gateway settings
        self.environment: str = os.getenv("ENVIRONMENT", "development").strip().lower()
        self.host: str = os.getenv("HOST", "0.0.0.0").strip()
        self.port: int = int(os.getenv("PORT", "8000"))
        self.debug: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

        # CORS
        cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173")
        self.cors_origins: List[str] = [origin.strip() for origin in cors_raw.split(",") if origin.strip()]

        # Storage & Telemetry paths
        db_rel = os.getenv("DATABASE_PATH", "backend/prismguard.db")
        self.database_path: Path = (ROOT_DIR / db_rel).resolve()
        
        audit_jsonl_rel = os.getenv("AUDIT_LOG_JSONL_PATH", "research/results/audit_events.jsonl")
        self.audit_log_jsonl_path: Path = (ROOT_DIR / audit_jsonl_rel).resolve()

        research_rel = os.getenv("RESEARCH_RESULTS_PATH", "research/results/research_findings.jsonl")
        self.research_results_path: Path = (ROOT_DIR / research_rel).resolve()

        # Operational ceilings & rate limits
        self.max_input_length: int = int(os.getenv("MAX_INPUT_LENGTH", "4000"))
        self.rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

        # Ensure parent directories for databases and log exports exist
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self.audit_log_jsonl_path.parent.mkdir(parents=True, exist_ok=True)
        self.research_results_path.parent.mkdir(parents=True, exist_ok=True)

    @property
    def is_guard_configured(self) -> bool:
        """Returns True if a non-placeholder Guard token and URL are present."""
        return bool(self.guard_token and len(self.guard_token) > 5 and "placeholder" not in self.guard_token.lower())

    @property
    def is_llm_configured(self) -> bool:
        """Returns True if a non-placeholder LLM API key is present."""
        return bool(self.llm_api_key and len(self.llm_api_key) > 5 and "placeholder" not in self.llm_api_key.lower())

    def get_safe_summary(self) -> dict:
        """
        Diagnostic summary safe for health endpoints and startup logs.
        Strictly prevents leaking token strings.
        """
        return {
            "environment": self.environment,
            "guard": {
                "url": self.guard_url,
                "configured": self.is_guard_configured,
                "token_present": bool(self.guard_token),
                "timeout_seconds": self.guard_timeout_seconds,
                "max_retries": self.guard_max_retries,
                "research_budget": self.guard_research_budget,
            },
            "llm": {
                "base_url": self.llm_base_url,
                "model": self.llm_model,
                "configured": self.is_llm_configured,
                "key_present": bool(self.llm_api_key),
                "timeout_seconds": self.llm_timeout_seconds,
            },
            "database_path": str(self.database_path),
            "max_input_length": self.max_input_length,
            "cors_origins": self.cors_origins
        }


# Global singleton instance
settings = Settings()
