# Login setup (Express + MongoDB)

The project now has three parts:

| Part | Folder | Port | Job |
| --- | --- | --- | --- |
| React app | `frontend/` | 5173 | Pages, including the new login pages |
| Auth server (new) | `server/` | 5000 | Sign up, log in, Google login, forgot password. Stores users in MongoDB |
| Prediction API | `backend/` | 8000 | Existing FastAPI defect prediction (unchanged) |

Pages that need login: **Scan a Repository**, **Prediction Result**, **Prediction History**.
Public pages: Home, How It Works, Feedback.

## 1. Create the accounts you need (one time)

**MongoDB Atlas** (free)
1. Create a free cluster at https://www.mongodb.com/atlas
2. Database Access: add a user with a password.
3. Network Access: add your IP (or `0.0.0.0/0` for a student demo).
4. Connect, Drivers: copy the connection string and put your database name in it, for example
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/sdp_auth`

   If you have MongoDB installed locally you can instead use `mongodb://127.0.0.1:27017/sdp_auth`.

**Google login** (optional, the app works without it)
1. https://console.cloud.google.com, create a project.
2. APIs and Services, OAuth consent screen: choose External, fill the app name and your email, add yourself as a test user.
3. Credentials, Create credentials, OAuth client ID, type **Web application**.
4. Authorized JavaScript origins: `http://localhost:5173` (add your deployed frontend URL later).
5. Copy the **Client ID**. No client secret is needed.

**Reset emails** (optional locally)
Without email settings, the reset link is printed in the auth server terminal, which is enough for testing.
For real emails with Gmail: turn on 2-Step Verification, then create an App Password at
https://myaccount.google.com/apppasswords and use it as `EMAIL_PASS`.

## 2. Configure

```powershell
cd server
copy .env.example .env
```

Edit `server/.env` and set at least `MONGODB_URI` and `JWT_SECRET`.
Generate a secret with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Then in `frontend/` create a `.env` file (copy `.env.example`) and set:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_AUTH_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=<same client ID as GOOGLE_CLIENT_ID in server/.env>
```

## 3. Run (three terminals)

```powershell
# 1. Prediction API (existing)
cd backend
uvicorn main:app --reload

# 2. Auth server (new)
cd server
npm install
npm run dev

# 3. Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, click **Sign up**, then try **Log out**, **Log in**, **Forgot password?** and **Continue with Google**.

## Docker

`docker compose up --build` also starts MongoDB and the auth server (http://localhost:5000).
Put secrets in a `.env` file next to `docker-compose.yml`:

```env
JWT_SECRET=your-long-random-string
GOOGLE_CLIENT_ID=
EMAIL_USER=
EMAIL_PASS=
```

For Docker, the frontend runs on port 3000, so add `http://localhost:3000` as an authorized JavaScript origin in Google Cloud.

## Deploying

Deploy `server/` as its own Node web service (for example on Render) with the same variables as `server/.env.example`.
Set `CLIENT_URL` to your Vercel URL, set `MONGODB_URI` to your Atlas string, and in Vercel set
`VITE_AUTH_API_URL` to the auth server URL and `VITE_GOOGLE_CLIENT_ID`. Add the Vercel URL to the Google authorized origins.

## Notes

- Passwords are hashed with bcrypt. Reset links are single use and expire after 15 minutes. Only a hash of the reset token is stored.
- Login and reset endpoints are rate limited.
- The login token is kept in the browser's localStorage and sent only to the auth server.
- Route protection is in the React app. The FastAPI prediction API is not yet checking login, so anyone who knows its URL can still call it directly. Verifying the token there is a good next step.
- Never commit `server/.env`. The root `.gitignore` already blocks it.
