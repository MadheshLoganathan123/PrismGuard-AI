import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.api.routes_chat import router as chat_router
from app.api.routes_research import router as research_router
from app.api.routes_audit import router as audit_router
from app.api.routes_health import router as health_router

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("prismguard")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup initialization and shutdown cleanup."""
    logger.info("Initializing PrismGuard AI Security Gateway...")
    
    # Initialize SQLite database schema
    init_db()
    
    # Startup validation without printing secrets
    summary = settings.get_safe_summary()
    logger.info("Environment: %s", summary["environment"])
    logger.info("Guard integration mode: %s (token present: %s)", 
                "LIVE" if summary["guard"]["configured"] else "SIMULATED_RESEARCH",
                summary["guard"]["token_present"])
    logger.info("LLM integration mode: %s (key present: %s)", 
                "LIVE" if summary["llm"]["configured"] else "SIMULATED_ADAPTER",
                summary["llm"]["key_present"])
    logger.info("Max input length: %s chars | Research budget ceiling: %s calls", 
                summary["max_input_length"], summary["guard"]["research_budget"])
    import os
    auth_enabled = os.getenv("PRISMGUARD_AUTH_ENABLED", "true").lower() not in ("false", "0", "no")
    logger.info("API authentication: %s", "ENABLED" if auth_enabled else "DISABLED (dev mode)")
    
    yield
    
    logger.info("Shutting down PrismGuard AI Gateway.")


app = FastAPI(
    title="PrismGuard AI — Security Gateway",
    description="Defense-in-depth security gateway between user applications, SecureAI Guard, and LLMs.",
    version="1.0.0",
    lifespan=lifespan
)

# Explicit CORS configuration — no wildcard origins, no credentials leak
# Allowed origins are loaded from CORS_ORIGINS env var; Regex covers all localhost ports
_ALLOWED_METHODS = ["GET", "POST", "OPTIONS"]
_ALLOWED_HEADERS = ["Content-Type", "Authorization", "X-API-Key"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # Never falls back to ["*"]; set CORS_ORIGINS in .env
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=_ALLOWED_METHODS,
    allow_headers=_ALLOWED_HEADERS,
)

# Global safe error handling
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled gateway exception on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Security Gateway Error",
            "message": "A safe error occurred while evaluating security policies.",
            "path": request.url.path
        }
    )

# Include API route modules
app.include_router(chat_router)
app.include_router(research_router)
app.include_router(audit_router)
app.include_router(health_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
