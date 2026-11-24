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
|    Jenkins CI/CD Server     | <-------------+  Localhost Jenkins (Port 8080)   |
|  - Runs Jenkinsfile         |               |  - Pulls code                    |
|  - Tests Python ML backend  |               |  - Builds Docker images          |
|  - Builds Vite Frontend     |               |  - Auto-restarts containers      |
+-----------------------------+               +----------------------------------+
```

---

## 2. Launching Jenkins with Docker

Jenkins is pre-configured in your `docker-compose.yml`.

### Step 1: Start the Jenkins container
Run in your PowerShell terminal:
```powershell
docker compose up -d jenkins
```

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
1. Open your browser to: **[http://localhost:8080](http://localhost:8080)**.
2. Paste the administrator password and click **Continue**.
3. Select **Install suggested plugins** (installs Git, Pipeline, Workspace Cleanup, etc.).
4. Create an Admin user (e.g. `admin` / `password123`) and click **Save and Finish**.

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
   - **Branch Specifier**: `*/shivanshi` (or `*/main`).
   - **Script Path**: `Jenkinsfile` (already included in your repo root).
5. Click **Save**.
6. Click **Build Now** to run your first automated build!

---

## 4. Setting Up ngrok for GitHub Webhooks (Automatic Build on Git Push)

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
   ngrok http 8080
   ```
   You will get a public URL like:
   `https://a1b2-c3d4-e5f6.ngrok-free.app`

### Option B: Run ngrok inside Docker
Add your `NGROK_AUTHTOKEN` to `.env`:
```env
NGROK_AUTHTOKEN=your_actual_token_here
```
Run:
```powershell
docker compose up -d ngrok
```
View the public tunnel URL at: **[http://localhost:4040](http://localhost:4040)**.

### Connect ngrok to GitHub Webhooks
1. Open your GitHub Repository: `https://github.com/himadri116/CAPSTONE-II`
2. Go to **Settings** -> **Webhooks** -> **Add webhook**.
3. **Payload URL**: `https://<YOUR_NGROK_URL>/github-webhook/` *(Notice the trailing slash!)*
4. **Content type**: `application/json`
5. **Which events**: Select *Just the push event*.
6. Click **Add webhook**.

*Now, every time you push a commit, GitHub will automatically trigger Jenkins to build and test your project!*

---

## 5. Exposing BugSight for Live Demos (To Professors / Evaluators)

If you want to demo BugSight on mobile or send a live link to someone outside your Wi-Fi network:

```powershell
ngrok http 3000
```
- Send the generated HTTPS link (`https://xxxx.ngrok-free.app`) to your evaluator.
- They will be able to view and interact with the full BugSight UI directly from their browser!
