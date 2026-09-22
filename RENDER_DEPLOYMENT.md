# Deploying to Render

This walks through putting MAVIX Estate Command on the actual internet using
[Render](https://render.com), a hosting platform with a free tier and no
server management required. Total time: ~20-30 minutes.

You'll create 3 things on Render: a **database**, a **backend web service**,
and a **frontend static site**.

---

## Before you start

You need this project's code in a **GitHub repository** (Render deploys from
GitHub, not from a zip file). If you haven't done this yet:

1. Create a free account at https://github.com if you don't have one
2. Create a new repository (e.g. `mavix-estate-command`)
3. Upload this entire `mavix` folder's contents to it (GitHub's website has
   an "upload files" button if you don't want to use git commands)

Also create a free Render account at https://render.com (you can sign up
with your GitHub account directly, which makes step 3 easier).

---

## Step 1: Create the database

1. In the Render dashboard, click **New +** → **PostgreSQL**
2. Name it `mavix-db` (or anything you like)
3. Choose the **Free** plan
4. Click **Create Database**
5. Wait ~1 minute for it to provision
6. Once ready, find the **"Internal Database URL"** on its page and **copy it** — you'll need it in Step 2. It looks like:
   `postgresql://mavix_db_user:xxxxx@dpg-xxxxx/mavix_db`

---

## Step 2: Deploy the backend

1. Click **New +** → **Web Service**
2. Connect your GitHub repository (Render will ask for permission the first time)
3. Fill in these settings:
   - **Name**: `mavix-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
4. Scroll to **Environment Variables** and add each of these (click "Add Environment Variable" for each):

   | Key | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | *(paste the Internal Database URL from Step 1)* |
   | `JWT_ACCESS_SECRET` | *(generate one — see below)* |
   | `JWT_REFRESH_SECRET` | *(generate a different one — see below)* |
   | `CORS_ORIGINS` | `https://mavix-frontend.onrender.com` *(you'll fix this exact URL in Step 4)* |
   | `PLATFORM_ADMIN_KEY` | *(generate one — see below)* |

   **To generate the secret values**: open any terminal on your computer (even the same one you used for Docker) and run this three times:
   ```bash
   openssl rand -base64 48
   ```
   Use a different output for each of the three secret fields above.

5. Under **Advanced**, set the **Start Command** to:
   ```
   npx prisma migrate deploy && node dist/index.js
   ```
   (This applies your database tables automatically on first deploy — but does **not** re-seed demo data on every restart, unlike your local Docker setup.)

6. Click **Create Web Service**. This will take 3-5 minutes the first time (it's building your Docker image).

7. Once it's live, **copy its URL** from the top of the page — it looks like `https://mavix-backend.onrender.com`. You'll need this in Step 4.

### Load the demo data (one-time, optional)

Once the backend is running, go to its page → **Shell** tab, and run:
```bash
npx prisma db seed
```
This creates the demo `aarohan-realty` tenant, same as your local setup.

---

## Step 3: Deploy the frontend

1. Click **New +** → **Static Site**
2. Connect the same GitHub repository
3. Fill in:
   - **Name**: `mavix-frontend`
   - **Root Directory**: `frontend/public`
   - **Build Command**: *(leave empty — there's nothing to build)*
   - **Publish Directory**: `.`
4. Click **Create Static Site**

Once live, copy its URL (e.g. `https://mavix-frontend.onrender.com`).

---

## Step 4: Connect frontend and backend (the two edits)

Now that both services have real URLs, make these two quick edits **in your GitHub repository** (edit the file directly on github.com, or on your computer and push again):

**Edit 1** — `frontend/public/index.html` and `frontend/public/reset-password.html`:
Find this line near the top:
```js
window.MAVIX_API_BASE = 'https://REPLACE-WITH-YOUR-BACKEND-URL.onrender.com/api';
```
Replace it with your **actual backend URL** from Step 2, keeping the `/api` at the end:
```js
window.MAVIX_API_BASE = 'https://mavix-backend.onrender.com/api';
```

**Edit 2** — go back to your backend service on Render → **Environment** tab, and update `CORS_ORIGINS` to your **actual frontend URL** from Step 3:
```
https://mavix-frontend.onrender.com
```
Save — this triggers an automatic redeploy of the backend (~1-2 minutes).

Once you've pushed the frontend edit, Render's static site also auto-redeploys.

---

## Step 5: Test it

Open your frontend URL in a browser. Log in with:
- Workspace: `aarohan-realty`
- Email: `admin@aarohanrealty.com`
- Password: `Admin@123`

If login fails, the most common cause is `CORS_ORIGINS` not exactly matching
your frontend URL (no trailing slash, must be `https://`, must match exactly).

---

## Important notes about Render's free tier

- **Free web services "spin down" after 15 minutes of no traffic** and take
  ~30-60 seconds to wake back up on the next request. This is fine for a
  demo/portfolio project, not acceptable for real customers — upgrade to a
  paid instance ($7/month) to avoid this.
- **Free Postgres databases expire after 90 days** on Render's free tier.
  For anything beyond a demo, use a paid database plan.
- **Change the demo password** (`Admin@123`) or delete the demo tenant
  before sharing the live URL publicly — right now anyone who reads this
  guide knows those credentials.

## Optional: custom domain + this project's TLS setup

Render gives you free HTTPS automatically on its own `.onrender.com`
subdomains — you don't need the `Caddyfile`/`docker-compose.tls.yml` from
this project when hosting on Render specifically (those are for when you
run Docker yourself on a plain VPS/server instead). If you want your own
domain (e.g. `app.yourcompany.com`), Render's dashboard has a "Custom
Domain" section under each service with its own simple instructions.
