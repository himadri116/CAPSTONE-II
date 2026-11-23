# BugSight: AI-powered bug prediction and code analysis

Upload source files or paste code. BugSight scores every function for bug risk, flags code smells, and uses an LLM to explain each problem and propose a refactor with a diff view.

```
React (Vite, nginx) ──► Express API ──► MongoDB
                            ├──► FastAPI ML service (feature extraction, RandomForest, smell rules)
                            └──► Anthropic API (explanations and fixes, cached in MongoDB)
```

| Part | Stack |
|---|---|
| `client/` | React 18, React Router, hand-written CSS (light and dark) |
| `server/` | Express, Mongoose, Passport Google OAuth 2.0, JWT in an httpOnly cookie, Helmet, rate limiting |
| `ml-service/` | FastAPI, scikit-learn RandomForest, static analysis (metrics for Python via `ast`, brace languages via parser heuristics) |
| DevOps | Dockerfile per service, `docker-compose.yml`, `Jenkinsfile` |

## Run with Docker

```bash
cp .env.example .env        # fill in Google credentials, JWT_SECRET, optional ANTHROPIC_API_KEY
docker compose up --build   # open http://localhost:3000
```

**Google credentials:** Google Cloud Console → APIs & Services → Credentials → OAuth client ID (Web application). Add the authorised redirect URI `http://localhost:3000/api/auth/google/callback` (use your real domain when deployed, and update `CLIENT_URL` and `GOOGLE_CALLBACK_URL`).

**Try it without Google:** set `DEV_AUTH=true` and `NODE_ENV=development` in `.env` to show a "Continue as demo user" button. It is disabled when `NODE_ENV=production`.

## Run locally without Docker

```bash
# 1. MongoDB running on localhost:27017
# 2. ML service
cd ml-service && pip install -r requirements.txt && python train.py && uvicorn app.main:app --port 8000
# 3. API (uses .env in server/; set CLIENT_URL=http://localhost:5173 and GOOGLE_CALLBACK_URL=http://localhost:5173/api/auth/google/callback)
cd server && npm install && npm run dev
# 4. Client
cd client && npm install && npm run dev      # http://localhost:5173
```

## How it works

**Bug-prone prediction.** For each function the ML service extracts lines of code, cyclomatic complexity, max nesting, parameter count, comment ratio, Halstead volume and difficulty, and branch count. A RandomForest (class-weighted for imbalance) returns a defect probability, shown as low (<35%), medium or high (≥65%). File risk blends the worst and average function.

**Code smells.** Rule-based detectors: long method, high complexity, deep nesting, long parameter list, magic numbers, empty catch/except, leftover debug output, god class, and duplicate blocks across files.

**AI suggestions.** The flagged function, its metrics and smells go to the LLM, which must return JSON `{summary, issues:[{issue, why, severity, fixed_code}]}`. Results are cached in MongoDB by hash. Without an API key, or if the call fails, the app falls back to rule-based advice.

**Dashboard.** Per-user report history, average-risk trend, a per-file risk heatmap, and per-function drill-down with diff view.

## About the model, read this before your demo or report

The Docker build trains on **synthetic data** so the app works immediately. Its metrics (printed by `train.py`, saved to `metrics.json`) only show that the pipeline works; they do not prove real-world accuracy. To train on real defect data:

```bash
python train.py --csv cm1.csv    # NASA MDP / PROMISE CSV with a `defects` column
```

The PROMISE datasets do not contain nesting depth or parameter counts, so those are estimated or defaulted. For a stronger project, build a dataset from Defects4J or BugsInPy with this service's own feature extractor, and report precision, recall, F1 and ROC-AUC on a held-out split. Possible extensions: git-history features (churn, authors), GitHub repo import, a CodeBERT model.

## Tests

```bash
cd ml-service && pytest -q
cd server && npm test
```

## Jenkins

`Jenkinsfile` stages: checkout → parallel lint/test (server, client, ML) → build images → push to Docker Hub (main only) → deploy over SSH with `docker compose pull && up -d`. Create these credentials in Jenkins: `dockerhub-creds`, `deploy-ssh-key`, `deploy-host`, `bugsight-env` (the production `.env` as a secret file). The target host needs Docker with the compose plugin.

## Security notes

Secrets live in `.env`, never in images. The JWT is an httpOnly, SameSite=Lax cookie. Uploads are limited to 1 MB per file and whitelisted extensions, held in memory and never executed. Rotate `JWT_SECRET` and set `NODE_ENV=production` when deployed; serve over HTTPS so the cookie is marked `secure`.
