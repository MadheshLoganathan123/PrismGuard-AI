import asyncio
import time
import logging
import hashlib
import re
from typing import Dict, Any, Optional
import httpx

from app.config import settings
from app.models.schemas import GuardCheckResult, GuardStatus

logger = logging.getLogger("prismguard.guard")


class SecureAIGuardClient:
    """
    HTTP client adapter for SecureAI Guard.
    Enforces server-side bearer token handling, timeouts, exponential backoff,
    Retry-After compliance, 401 fail-fast, quota tracking, and high-fidelity
    simulation fallback when credentials are not supplied.
    """
    def __init__(self):
        self.base_url = settings.guard_url
        self.token = settings.guard_token
        self.timeout = settings.guard_timeout_seconds
        self.max_retries = settings.guard_max_retries
        self.research_budget = settings.guard_research_budget
        self._calls_made = 0
        self._cached_results: Dict[str, GuardCheckResult] = {}

    @property
    def is_live(self) -> bool:
        return settings.is_guard_configured

    @property
    def calls_made(self) -> int:
        return self._calls_made

    @property
    def quota_remaining(self) -> int:
        return max(0, self.research_budget - self._calls_made)

    async def check_prompt(self, text: str, test_id: Optional[str] = None) -> GuardCheckResult:
        """
        Sends text to POST /v1/check/prompt.
        """
        if len(text) > settings.max_input_length:
            return GuardCheckResult(
                status=GuardStatus.ERROR,
                allowed=False,
                flags=["INPUT_EXCEEDS_LENGTH_LIMIT_4000"],
                latency_ms=1.0,
                error_message="Input exceeded maximum character limit (4000 chars)."
            )

        # Content hash for caching duplicate requests
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        if content_hash in self._cached_results:
            logger.debug("Returning cached Guard response for hash %s", content_hash[:10])
            cached = self._cached_results[content_hash]
            return cached

        # Check research budget ceiling
        if self._calls_made >= self.research_budget:
            return GuardCheckResult(
                status=GuardStatus.ERROR,
                allowed=None,
                flags=["QUOTA_BUDGET_REACHED"],
                latency_ms=1.0,
                error_message=f"Research call ceiling reached ({self.research_budget} calls)."
            )

        start_time = time.perf_counter()

        # If live credentials configured, call real endpoint
        if self.is_live:
            result = await self._call_live_check("/v1/check/prompt", {"text": text}, start_time)
        else:
            # High-fidelity simulation mode reproducing documented test matrix behaviors
            result = await self._simulate_guard_prompt(text, test_id, start_time)

        self._calls_made += 1
        self._cached_results[content_hash] = result
        return result

    async def check_response(self, text: str) -> GuardCheckResult:
        """
        Sends model output to POST /v1/check/response.
        """
        start_time = time.perf_counter()
        if self.is_live:
            return await self._call_live_check("/v1/check/response", {"text": text}, start_time)
        else:
            return await self._simulate_guard_response(text, start_time)

    async def get_health(self) -> Dict[str, Any]:
        """Checks connectivity to SecureAI Guard service."""
        if not self.is_live:
            return {
                "status": "SIMULATED_READY",
                "mode": "offline_simulator",
                "calls_made": self._calls_made,
                "budget_ceiling": self.research_budget,
                "quota_remaining": self.quota_remaining,
                "endpoint": self.base_url
            }

        start_time = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(f"{self.base_url}/health")
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "status": "READY" if res.status_code == 200 else "DEGRADED",
                    "status_code": res.status_code,
                    "latency_ms": latency_ms,
                    "endpoint": self.base_url
                }
        except Exception as e:
            return {
                "status": "UNAVAILABLE",
                "error": str(e),
                "endpoint": self.base_url
            }

    async def get_usage(self) -> Dict[str, Any]:
        """Queries /v1/usage on Guard for official quota metrics if configured."""
        if not self.is_live:
            return {
                "calls_used": self._calls_made,
                "calls_remaining": self.quota_remaining,
                "budget_limit": self.research_budget,
                "source": "local_tracked_budget"
            }
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.get(f"{self.base_url}/v1/usage", headers=headers)
                if res.status_code == 200:
                    return res.json()
        except Exception as e:
            logger.warning("Failed to fetch live usage from Guard: %s", e)
        return {
            "calls_used": self._calls_made,
            "calls_remaining": self.quota_remaining,
            "budget_limit": self.research_budget
        }

    async def _call_live_check(self, endpoint: str, payload: dict, start_time: float) -> GuardCheckResult:
        """Executes live HTTP request with exponential backoff and Retry-After support."""
        url = f"{self.base_url}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        retries = 0
        backoff = 1.0

        while retries <= self.max_retries:
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.post(url, json=payload, headers=headers)
                    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

                    # 200 OK
                    if response.status_code == 200:
                        data = response.json()
                        return GuardCheckResult(
                            status=GuardStatus(data.get("status", "complete")),
                            allowed=data.get("allowed", True),
                            flags=data.get("flags", []),
                            checks=data.get("checks", {}),
                            latency_ms=latency_ms,
                            request_id=data.get("request_id")
                        )

                    # 401 Unauthorized: Critical safety rule - NEVER retry automatically!
                    if response.status_code == 401:
                        logger.error("SecureAI Guard 401 Unauthorized. Check token configuration.")
                        return GuardCheckResult(
                            status=GuardStatus.ERROR,
                            allowed=None,
                            flags=["GUARD_AUTH_FAILURE_401"],
                            latency_ms=latency_ms,
                            error_message="Authentication failure with SecureAI Guard (401). Retries forbidden."
                        )

                    # 429 Rate Limited: Respect Retry-After header
                    if response.status_code == 429:
                        retry_after = int(response.headers.get("Retry-After", 2))
                        if retries < self.max_retries:
                            await asyncio.sleep(min(retry_after, 5))
                            retries += 1
                            continue
                        return GuardCheckResult(
                            status=GuardStatus.ERROR,
                            allowed=None,
                            flags=["GUARD_RATE_LIMITED_429"],
                            latency_ms=latency_ms,
                            error_message="SecureAI Guard rate limit reached."
                        )

                    # 502 / 503 Service Degraded / Busy: Bounded exponential backoff
                    if response.status_code in (502, 503):
                        if retries < self.max_retries:
                            await asyncio.sleep(backoff)
                            backoff *= 2
                            retries += 1
                            continue
                        return GuardCheckResult(
                            status=GuardStatus.ERROR,
                            allowed=None,
                            flags=[f"GUARD_HTTP_ERROR_{response.status_code}"],
                            latency_ms=latency_ms,
                            error_message=f"Guard service unavailable ({response.status_code})."
                        )

                    # Other HTTP error
                    return GuardCheckResult(
                        status=GuardStatus.ERROR,
                        allowed=None,
                        flags=[f"GUARD_HTTP_ERROR_{response.status_code}"],
                        latency_ms=latency_ms,
                        error_message=f"Guard returned HTTP {response.status_code}."
                    )

            except httpx.TimeoutException:
                if retries < self.max_retries:
                    retries += 1
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    continue
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return GuardCheckResult(
                    status=GuardStatus.ERROR,
                    allowed=None,
                    flags=["GUARD_TIMEOUT"],
                    latency_ms=latency_ms,
                    error_message=f"Guard connection timed out after {self.timeout}s."
                )
            except Exception as e:
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return GuardCheckResult(
                    status=GuardStatus.ERROR,
                    allowed=None,
                    flags=["GUARD_NETWORK_ERROR"],
                    latency_ms=latency_ms,
                    error_message=f"Guard communication failed: {str(e)}"
                )

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return GuardCheckResult(
            status=GuardStatus.ERROR,
            allowed=None,
            flags=["GUARD_MAX_RETRIES_EXCEEDED"],
            latency_ms=latency_ms,
            error_message="Exceeded maximum retries for Guard request."
        )

    async def _simulate_guard_prompt(self, text: str, test_id: Optional[str], start_time: float) -> GuardCheckResult:
        """
        High-fidelity simulator faithful to the Technical Proposal test matrix.
        Crucially models the exact H1 Obfuscation Gap:
          - Plain synthetic override (PI-001) is caught by Guard.
          - Obfuscated Base64 (PI-005), spaced characters (PI-006), typoglycemia (PI-008),
            and reversed text (PI-009) slip through Guard (allowed=True), which PrismGuard AI detects!
          - ERR-001 returns status=partial.
          - ERR-002 returns 503 error.
        """
        # Emulate realistic screening network latency (40 - 90ms)
        await asyncio.sleep(0.04)
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        req_id = f"guard-sim-{int(time.time() * 1000)}"

        # Explicit test ID overrides for known matrix cases
        if test_id == "ERR-001":
            return GuardCheckResult(
                status=GuardStatus.PARTIAL,
                allowed=True,
                flags=["PARTIAL_DEGRADED_SCAN"],
                checks={"prompt_shield": "timeout", "lexical": "passed"},
                latency_ms=latency_ms,
                request_id=req_id
            )

        if test_id == "ERR-002":
            return GuardCheckResult(
                status=GuardStatus.ERROR,
                allowed=None,
                flags=["SERVICE_BUSY_503"],
                checks={},
                latency_ms=latency_ms,
                request_id=req_id,
                error_message="Simulated Guard 503 Service Unavailable"
            )

        # The core Obfuscation Gap (H1): Guard lexical filter misses transformed/encoded instructions
        is_base64_override = bool(re.search(r'[A-Za-z0-9+/]{16,}={0,2}', text))
        is_spaced_override = bool(re.search(r'(?:[a-zA-Z]\s){4,}', text))
        is_reversed = "snoitcurtsni" in text.lower() or "llatsni" in text.lower()

        if is_base64_override or is_spaced_override or is_reversed:
            # Guard allows the obfuscated payload (the reproducible blind spot!)
            return GuardCheckResult(
                status=GuardStatus.COMPLETE,
                allowed=True,
                flags=[],
                checks={"lexical_safety": "passed", "semantic_shield": "passed"},
                latency_ms=latency_ms,
                request_id=req_id
            )

        # Direct, plain overrides: Guard catches these
        plain_override_pattern = re.compile(
            r'ignore\s+(?:all\s+)?previous\s+instructions?|disregard\s+(?:all\s+)?rules|system\s+prompt|\bdan\b|<\|im_start\|>',
            re.IGNORECASE
        )
        if plain_override_pattern.search(text):
            return GuardCheckResult(
                status=GuardStatus.COMPLETE,
                allowed=False,
                flags=["INSTRUCTION_OVERRIDE_FLAGGED", "JAILBREAK_ATTEMPT"],
                checks={"lexical_safety": "failed", "semantic_shield": "failed"},
                latency_ms=latency_ms,
                request_id=req_id
            )



        # Benign and normal queries: Guard allows
        return GuardCheckResult(
            status=GuardStatus.COMPLETE,
            allowed=True,
            flags=[],
            checks={"lexical_safety": "passed", "semantic_shield": "passed"},
            latency_ms=latency_ms,
            request_id=req_id
        )

    async def _simulate_guard_response(self, text: str, start_time: float) -> GuardCheckResult:
        """Simulates Guard /v1/check/response screening."""
        await asyncio.sleep(0.03)
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        req_id = f"guard-resp-{int(time.time() * 1000)}"

        # Check for harmful content or tokens
        if "TEST_SECRET_" in text or "sk-" in text:
            return GuardCheckResult(
                status=GuardStatus.COMPLETE,
                allowed=False,
                flags=["POTENTIAL_CREDENTIAL_LEAKAGE"],
                checks={"leakage_shield": "failed"},
                latency_ms=latency_ms,
                request_id=req_id
            )

        return GuardCheckResult(
            status=GuardStatus.COMPLETE,
            allowed=True,
            flags=[],
            checks={"output_safety": "passed"},
            latency_ms=latency_ms,
            request_id=req_id
        )


# Global Guard client singleton
guard_client = SecureAIGuardClient()
