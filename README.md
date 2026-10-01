# PrismGuard AI — Security Gateway

> **Adaptive Defense-in-Depth Security Gateway for AI Applications placed between User-Facing Clients, SecureAI Guard, and Large Language Models.**

---

## 1. Problem & Project Concept

SecureAI Guard provides essential probabilistic screening, but like any filter, it has structural blind spots—particularly around canonicalization, obfuscation (Base64 encoding, homoglyphs, whitespace manipulation), instruction boundaries, and output credential leakage.

**PrismGuard AI — Security Gateway** adds an explainable second control plane that:
- Normalizes input text (Unicode NFKC, homoglyphs, zero-width spaces, bounded Base64/hex/reversed decoding).
- Keeps system policy, user content, and security telemetry in strictly separated trust zones.
- Screens prompts through SecureAI Guard before LLM inference, and screens responses after inference.
- Combines deterministic local signals and Guard verdicts into a documented additive risk score (0–100).
- Enforces an allow, warn, review, redact, or block decision policy.
- Preserves benign educational and utility traffic, avoiding blanket overblocking.
- Logs structured, privacy-preserving audit telemetry (SHA-256 hashes, zero raw secrets) to SQLite and JSONL exports.

---

## 2. System Architecture

```
User / Demo UI (React + TypeScript)
        │
        ▼  [POST /api/chat]
FastAPI Security Gateway
        │
        ├── 1. Input Normalizer (Unicode NFKC, Homoglyphs, Bounded Decoders)
        ├── 2. Custom Weakness Detector (H1 Obfuscation, Boundaries, Extraction)
        ├── 3. SecureAI Guard Adapter [POST /v1/check/prompt]
        ├── 4. Additive Risk Engine (0-100 Score & Risk Bands)
        ├── 5. Multi-Layer Policy Engine (ALLOW / WARN / REVIEW / BLOCK)
        │       │
        │       ├─► [BLOCKED / REVIEW] ──► Safe Explanation (No LLM Call)
        │       │
        │       └─► [ALLOWED / WARNED]
        │               │
        │               ▼
        │        LLM Client (OpenAI-compatible /chat/completions)
        │               │
        │               ▼
        ├── 6. Output Analyzer (Secret Redaction, Prompt Leakage, Link Defanging)
        ├── 7. Guard Response Check [POST /v1/check/response]
        └── 8. Privacy-Preserving Audit Logger (SQLite WAL & JSONL Export)
```

---

## 3. Technology Stack

- **Backend:** Python 3.11, FastAPI, Pydantic, HTTPX, SQLite3 (WAL mode)
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Testing:** Pytest, HTTPX ASGI TestClient
- **Research:** Python CLI harness, JSONL evidence persistence, 24-case test catalog

---

## 4. Configuration & `.env` Setup

Copy [.env.example](file:///.env.example) to `.env` in the repository root:

```bash
cp .env.example .env
```

### Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `GUARD_URL` | Official SecureAI Guard screening API endpoint | `https://api.secureai.example.com` |
| `GUARD_TOKEN` | Team-specific authentication bearer token (server-side only) | *(empty / placeholder)* |
| `GUARD_TIMEOUT_SECONDS` | HTTP timeout for Guard calls | `5.0` |
| `GUARD_MAX_RETRIES` | Maximum retries with exponential backoff on 502/503 (401 is never retried) | `2` |
| `GUARD_RESEARCH_BUDGET` | Hard ceiling for live research API calls | `120` |
| `LLM_BASE_URL` | Base URL for configured LLM API (OpenAI-compatible) | `https://api.openai.com/v1` |
| `LLM_API_KEY` | Provider API key (server-side only) | *(empty / placeholder)* |
| `LLM_MODEL` | LLM model identifier | `gpt-4o-mini` |
| `DATABASE_PATH` | Local SQLite database file path | `backend/prismguard.db` |
| `AUDIT_LOG_JSONL_PATH` | JSONL export path for audit events | `research/results/audit_events.jsonl` |
| `RESEARCH_RESULTS_PATH` | JSONL export path for research findings | `research/results/research_findings.jsonl` |
| `MAX_INPUT_LENGTH` | Maximum input length before local rejection | `4000` |

> [!NOTE]
> When `GUARD_TOKEN` or `LLM_API_KEY` are left blank or contain placeholders, PrismGuard AI automatically operates in resilient **high-fidelity simulation mode**, faithfully reproducing the test matrix behaviors for offline demonstrations, unit tests, and local evaluation.

---

## 5. Running the Application

### 1. Run the Backend API Server

```bash
# From repository root
python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- **API Base:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/health`

### 2. Run the Frontend Development Server

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at: `http://localhost:5173`

---

## 6. Running Tests & Research Harness

### Run Backend Unit & Integration Tests (19/19 Passing)

```bash
python -m pytest backend/tests -v
```

### Run Controlled Research Harness (CLI)

```bash
python research/scripts/run_harness.py --budget 120
```

The harness runs the standardized 24 test cases (PI-001 to PI-014, FP-001 to FP-004, OUT-001 to OUT-004, ERR-001, ERR-002), tracks call quota, identifies Guard blind spots, and records evidence to `research/results/research_findings.jsonl`.

---

## 7. Security & Privacy Guarantees

- **Zero Secret Exposure:** Tokens and API keys are read server-side only and never logged or reflected in responses.
- **Input Bounds:** Enforces strict 4,000-character ceiling to prevent buffer exhaustion.
- **Fail-Closed on Degraded Screening:** Partial Guard responses route to `REVIEW_UNAVAILABLE` rather than silently allowing unverified text.
- **Preserved Utility:** Benign queries are evaluated with educational context dampeners to prevent false-positive denial.
- **Data Minimization:** Audit logs retain SHA-256 content hashes rather than raw user prompts.

---

## 8. License

MIT License. Developed for the SecureAI Hackathon 2026.
