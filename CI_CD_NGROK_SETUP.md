# BugSight CI/CD & Public Access Guide: Jenkins & ngrok

This guide explains how to set up **Jenkins** (Continuous Integration & Automated Deployment) and **ngrok** (Secure Public Tunneling) for the **BugSight** defect prediction project.

---

## 1. Overview of Architecture

```
                                              +----------------------------------+
                                              |        GitHub Repository         |
                                              | (git push triggers Webhook)      |
                                              +-----------------+----------------+
                                                                |
                                                                v
                                              +----------------------------------+
                                              |       ngrok Public Tunnel        |
                                              |  https://xxxx.ngrok-free.app     |
                                              +-----------------+----------------+
                                                                |
                                                                v
+-----------------------------+               +----------------------------------+
|    Jenkins CI/CD Server     | <-------------+  Localhost Jenkins (Port 8085)   |
|  - Runs Jenkinsfile         |               |  - Pulls code                    |
|  - Builds Docker images     |               |  - Deploys application           |
|  - Checks Nginx TLS config  |               |  - Starts MongoDB and services   |
+-----------------------------+               +----------------------------------+
```

---

## 2. Launching Jenkins with Docker

Jenkins is pre-configured in your `docker-compose.yml`.

### Step 1: Start the Jenkins container
The Compose file requires a non-empty `JWT_SECRET` even when starting only Jenkins. Ensure the project `.env` exists and has a long random `JWT_SECRET` before running:
```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d --build jenkins
```
If you created `.env` from the template, edit it and set `JWT_SECRET` before running Compose. Do not overwrite an existing `.env`.

### Step 2: Retrieve the Initial Admin Password
When Jenkins starts for the first time, it generates a security token. Run:
```powershell
docker logs bugsight-jenkins
```
Look for the 32-character alphanumeric code between the asterisks, or run:
```powershell
docker exec bugsight-jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### Step 3: Complete Jenkins Setup Wizard
1. Open your browser to: **[http://localhost:8085](http://localhost:8085)**.
2. Paste the administrator password and click **Continue**.
3. Select **Install suggested plugins** (installs Git, Pipeline, Workspace Cleanup, etc.).
4. Create an Admin user with a strong, unique password and click **Save and Finish**. Do not use default or example credentials, especially before exposing Jenkins through ngrok.
5. Confirm the **Credentials Binding** and **GitHub** plugins are installed; the pipeline uses secret-text and secret-file credentials, and GitHub provides the webhook trigger.

---

## 3. Creating the BugSight Pipeline Job

1. On the Jenkins dashboard, click **New Item**.
2. Enter item name: `BugSight-Pipeline`.
3. Select **Pipeline** and click **OK**.
4. In the configuration page:
   - Scroll down to the **Pipeline** section.
   - Change **Definition** from *Pipeline script* to **Pipeline script from SCM**.
   - **SCM**: Select **Git**.
   - **Repository URL**: `https://github.com/himadri116/CAPSTONE-II.git`
   - **Branch Specifier**: `*/himadri` (or the branch you intend to build).
   - **Script Path**: `Jenkinsfile` (already included in your repo root).
5. Under **Build Triggers**, select **GitHub hook trigger for GITScm polling**.
6. Click **Save**.
7. Click **Build Now** to run your first automated build!

## 4. Local HTTPS for the Dockerized app

The frontend Nginx container serves the app over HTTPS on `https://localhost:8443` and proxies authentication and scanner API calls to the internal Docker services. HTTP on `http://localhost:3000` remains available for local compatibility and ngrok. Jenkins itself remains on HTTP at port `8085`.

Create a trusted localhost certificate if you have not already created one:

```powershell
Set-Location frontend
mkcert -install
New-Item -ItemType Directory -Force certs | Out-Null
mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem localhost 127.0.0.1 ::1
Set-Location ..
```

For a direct Docker Compose run, set a non-empty `JWT_SECRET` in the project `.env`, copy the local certificate into the Docker volume, then start the app:

```powershell
docker compose --profile local-tls run --rm tls-cert-init
docker compose up -d --build mongo backend auth-server frontend
```

Open `https://localhost:8443`.

For Jenkins deployments, add these credentials in **Manage Jenkins → Credentials → System → Global credentials**. The IDs must match exactly:

| Credential ID | Kind | Value |
| --- | --- | --- |
| `bugsight-jwt-secret` | Secret text | A long random JWT signing secret |
| `bugsight-localhost-cert` | Secret file | `frontend/certs/localhost.pem` |
| `bugsight-localhost-key` | Secret file | `frontend/certs/localhost-key.pem` |

Set the JWT credential to the same value as the project `.env` `JWT_SECRET`. The pipeline copies the certificate and key from Jenkins credentials into a Docker named volume mounted read-only by Nginx; it does not commit them or bake the key into the image. Add `https://localhost:8443` to the Google OAuth web client's authorized JavaScript origins if Google sign-in is needed. The local mkcert certificate is trusted only on machines where its local CA is installed; do not use it as a public production certificate.

### Selenium browser-test stage

After deploying and smoke-testing the application, Jenkins runs the existing authentication Selenium suite in the **Selenium UI Tests** stage. It starts a separate Compose project with a Chrome WebDriver container and its own MongoDB volume/database, so test signups do not write to the deployed application's database. The test runner opens `https://frontend` inside the Docker network and accepts the local certificate only for this automated test session. Selenium output and individual test results appear in the Jenkins build console; no Chrome installation is needed in the Jenkins container.

The test stage builds the `tests/Dockerfile.selenium` runner image and uses `selenium/standalone-chrome`. It requires the same Docker socket access, JWT credential, and TLS credentials configured above. On success or failure, Jenkins stops the temporary Selenium application containers; the separate test database volume is retained between builds.

---

## 5. Setting Up ngrok for GitHub Webhooks (Automatic Build on Git Push)

GitHub cannot access `localhost:8080` on your computer directly. **ngrok** provides a public HTTPS URL that connects GitHub to your local Jenkins.

### Option A: Install ngrok CLI on Windows (Recommended for quick testing)
1. Install ngrok via Windows Package Manager:
   ```powershell
   winget install ngrok/ngrok
   ```
   *(Or download from [ngrok.com](https://ngrok.com)).*
2. Authenticate ngrok with your free token:
   ```powershell
   ngrok config add-authtoken <YOUR_NGROK_AUTHTOKEN>
   ```
3. Expose Jenkins:
   ```powershell
   ngrok http 8085
   ```
   You will get a public URL like:
   `https://a1b2-c3d4-e5f6.ngrok-free.app`

### Option B: Run ngrok inside Docker
Add your `NGROK_AUTHTOKEN` to `.env`:
```env
NGROK_AUTHTOKEN=your_actual_token_here
```
The Docker tunnel forwards to Jenkins on the internal Docker network. Start it with:
```powershell
docker compose --profile ngrok up -d ngrok
```
View the public Jenkins tunnel URL at: **[http://localhost:4040](http://localhost:4040)**. The application remains available locally at `http://localhost:3000` and `https://localhost:8443`.

### Connect ngrok to GitHub Webhooks
1. Open your GitHub Repository: `https://github.com/himadri116/CAPSTONE-II`
2. Go to **Settings** -> **Webhooks** -> **Add webhook**.
3. **Payload URL**: `https://<YOUR_NGROK_URL>/github-webhook/` *(Notice the trailing slash!)*
4. **Content type**: `application/json`
5. **Which events**: Select *Just the push event*.
6. Click **Add webhook**.

In **Recent Deliveries**, use **Redeliver** to verify GitHub receives a successful response. Then push a commit to the branch configured in the Jenkins job; the build should appear in Jenkins **Build History**.

*With the GitHub plugin installed, the job trigger enabled, and the webhook delivered successfully, pushes to the configured branch start a Jenkins build.*

---

## 6. Exposing BugSight for Live Demos (To Professors / Evaluators)

If you want to demo BugSight on mobile or send a live link to someone outside your Wi-Fi network:

```powershell
docker compose --profile ngrok stop ngrok
ngrok http 3000
```
- Send the generated HTTPS link (`https://xxxx.ngrok-free.app`) to your evaluator.
- They will be able to view and interact with the full BugSight UI directly from their browser!
- The Docker ngrok tunnel is reserved for Jenkins webhooks; stop it before using the ngrok CLI to avoid duplicate endpoint or agent-session conflicts.
