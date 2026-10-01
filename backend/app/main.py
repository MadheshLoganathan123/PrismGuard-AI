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
    
    yield
    
    logger.info("Shutting down PrismGuard AI Gateway.")


app = FastAPI(
    title="PrismGuard AI — Security Gateway",
    description="Defense-in-depth security gateway between user applications, SecureAI Guard, and LLMs.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for React / Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.cors_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
