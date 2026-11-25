# Unified authentication and API documentation

BugSight has one account system. The Express service authenticates users; the FastAPI service validates the same JWT before allowing scanner or history operations.

| Service | Local address | Responsibility |
| --- | --- | --- |
| React frontend | `http://localhost:5173` (or `https://localhost:5173` with local HTTPS enabled) | User interface and account pages |
| Express | `http://localhost:5000` | Email/password, Google sign-in, and password reset |
| FastAPI | `http://localhost:8000` | Repository scanning, reports, feedback, and prediction history |
| MongoDB | `mongodb://127.0.0.1:27018/bugsight` | Shared user records |

In Docker, the frontend is available over HTTP at `http://localhost:3000` and HTTPS at `https://localhost:8443`; FastAPI is published on port `8001`. Open the **combined Swagger UI** at `http://localhost:8001/docs`. For services run directly on your computer, use `http://localhost:8000/docs`.

## What authentication protects

- Public account setup and recovery: register, email/password login, Google login, forgot password, and reset password.
- Protected operations: repository metadata, predictions, prediction jobs, reports, feedback, and prediction history.
- Prediction history and feedback remain shared among signed-in users; they are not separated by account.
- The frontend sends the Express-issued JWT as `Authorization: Bearer <token>` on every FastAPI request. Swagger asks for email/password when a protected operation is run and keeps the token in that Swagger page's memory.

## Local setup

1. Copy the environment templates:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item server\.env.example server\.env
   Copy-Item backend\.env.example backend\.env
   ```

2. Generate a long random secret:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   Put the **same** value in `JWT_SECRET` in the project `.env`, `server\.env`, and `backend\.env`. Do not use the example placeholder or commit the real `.env` files.

3. Keep both services pointed at the same MongoDB database. For services run directly on your computer, set `MONGODB_URI` in both `server\.env` and `backend\.env` to `mongodb://127.0.0.1:27018/bugsight`. The Docker Compose MongoDB service publishes this local port:

   ```powershell
   docker compose up -d mongo
   ```

   For Docker Compose, set `MONGODB_URI` once in the project-root `.env`; Compose passes it to both the auth server and backend. For Atlas, use its connection string with the `bugsight` database, for example:

   ```env
   MONGODB_URI=mongodb+srv://<database-user>:<url-encoded-password>@<cluster-host>/<database-name>?retryWrites=true&w=majority
   ```

   Use the database name where your existing app accounts are stored (changing it connects to a different database). Configure Atlas Network Access to allow the machine running the app and give the database user read/write access to that database. Keep the URI private and never commit `.env`. After changing it, recreate the app services:

   ```powershell
   docker compose up -d --force-recreate backend auth-server
   ```

   If `MONGODB_URI` is empty or unset, Docker Compose continues to use its local MongoDB service.

4. Configure optional providers:
   - Google: set the same OAuth web client ID in `GOOGLE_CLIENT_ID` in `server\.env` and `VITE_GOOGLE_CLIENT_ID` in `frontend\.env`. Add `http://localhost:5173` and, if using local HTTPS, `https://localhost:5173` to the Google client's authorized JavaScript origins. For Docker, set `GOOGLE_CLIENT_ID` in the project `.env` and add `https://localhost:8443` (or `http://localhost:3000` for HTTP) to the authorized origins.
   - Password-reset email: set `EMAIL_USER` and `EMAIL_PASS` in `server\.env`. For Gmail, use an App Password. Without email configuration, reset instructions are printed by the Express service for local testing.

5. Start the services in separate terminals:

   ```powershell
   # Terminal 1
   Set-Location backend
   uvicorn main:app --reload
   ```

   ```powershell
   # Terminal 2
   Set-Location server
   npm install
   npm run dev
   ```

   ```powershell
   # Terminal 3
   Set-Location frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:5173` (or `https://localhost:5173` after local HTTPS setup) to use the app and `http://localhost:8000/docs` for the unified API documentation.

## Optional local HTTPS

The Vite development server uses HTTPS when both local certificate files exist; otherwise it continues to use HTTP. Install `mkcert` once, then create a locally trusted certificate:

```powershell
winget install --id FiloSottile.mkcert --exact
Set-Location frontend
mkcert -install
New-Item -ItemType Directory -Force certs | Out-Null
mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem localhost 127.0.0.1 ::1
```

Restart `npm run dev` and open `https://localhost:5173`. Local API requests use the Vite proxy, so the browser communicates with the app over HTTPS while Vite forwards requests to the local HTTP Express and FastAPI services. The certificate files are local-only and ignored by Git; do not commit them. For Google sign-in, also add `https://localhost:5173` to the OAuth client's authorized JavaScript origins. The `CLIENT_URL` in `server\.env` should list `https://localhost:5173` first if password-reset emails should use HTTPS links.

## Try it in Swagger or Postman

The combined OpenAPI document lives at `http://localhost:8000/openapi.json` (or port `8001` with Docker). The account endpoints are documented there and routed to Express; the scanner endpoints are served by FastAPI.

1. In Swagger, run `POST /api/auth/login` with:

   ```json
   {
     "email": "your-account@example.com",
     "password": "your-password"
   }
   ```

   Or select a protected operation and enter the credentials in the sign-in prompt.
2. The response includes a JWT. In Postman, choose **Authorization → Bearer Token** and paste the token. Use the same token for the FastAPI endpoints.
3. Try `GET /prediction-history`, `GET /feedback`, or `POST /branches`. Without a valid token, protected FastAPI endpoints return `401` with `WWW-Authenticate: Bearer`.
4. To test password recovery, run `POST /api/auth/forgot-password`, use the emailed/local reset link, then run `POST /api/auth/reset-password/{token}` with a new password.

For Docker Swagger, use FastAPI base URL `http://localhost:8001` and Express base URL `http://localhost:5000`. The Dockerized frontend uses HTTPS through Nginx at `https://localhost:8443`.

## Docker

Create `.env` if needed, set a random `JWT_SECRET`, optionally configure Google and email, generate a local mkcert certificate, initialize its Docker volume, and run:

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# Set JWT_SECRET in .env before starting Compose.
Set-Location frontend
mkcert -install
New-Item -ItemType Directory -Force certs | Out-Null
mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem localhost 127.0.0.1 ::1
Set-Location ..
docker compose --profile local-tls run --rm tls-cert-init
docker compose up --build -d mongo backend auth-server frontend
```

Docker Compose gives both services the same JWT secret and MongoDB database. The database host inside Compose is `mongo:27017/bugsight`; the published local MongoDB port is `27018`. The frontend is served over HTTPS at `https://localhost:8443` through Nginx.

## Deployment

Set the same long random `JWT_SECRET` and MongoDB URI/database on Express and FastAPI. Allow the frontend and Swagger page origins in Express `CLIENT_URL`, and allow the frontend origin in FastAPI `ALLOWED_ORIGINS`. Configure `AUTH_API_URL` as the browser-accessible Express URL. Use HTTPS for deployed services and never put server secrets in frontend environment variables.

## Security notes

- Passwords are hashed with bcrypt. Reset tokens are single-use, expire after 15 minutes, and only their hash is stored.
- Login and password-reset endpoints are rate limited. Forgot-password responses do not disclose whether an account exists.
- Keep `.env` files and real credentials out of Git. Rotate any credentials that were previously committed.
