# Autonomous Instagram Reels SaaS Platform 📈

A fully automated daily Reels generation, rendering, scheduling, posting, and self-optimization platform.

---

## Technical Architecture

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS, Framer Motion, shadcn/ui.
- **Backend & Worker**: Node.js, Express, PostgreSQL, Prisma, BullMQ, Redis, FFmpeg, and node-cron.
- **AI Integrations**: Gemini 2.5 Flash, ElevenLabs TTS, Pexels API.

---

## Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- Docker Desktop (for Redis & PostgreSQL)
- FFmpeg installed on system PATH

### Step 1: Start local services
```bash
docker-compose up -d
```
This spins up PostgreSQL on port `5432` and Redis on port `6379`.

### Step 2: Configure Environment (`backend/.env` & `frontend/.env`)
Create `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/saas_reels?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
GOOGLE_AI_API_KEY="your-gemini-key"
ELEVENLABS_API_KEY="your-elevenlabs-key"
PEXELS_API_KEY="your-pexels-key"
INSTAGRAM_HANDLE="@ai_signal_09"
INSTAGRAM_ACCESS_TOKEN="your-fb-graph-api-token"
INSTAGRAM_ACCOUNT_ID="your-instagram-business-account-id"
```

### Step 3: Initialize Database
```bash
cd backend
npm install
npx prisma db push
```

### Step 4: Run Dev Servers
Start the backend Express & Worker service:
```bash
cd backend
npm run dev
```

Start the Next.js Frontend server:
```bash
cd ../frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## Deployment Ready Instructions

### 1. Frontend on Vercel
1. Push this repository to GitHub.
2. Link your repository in Vercel.
3. Configure the public root folder as `frontend`.
4. Deploy!

### 2. Backend & Worker on Railway
1. Create a new service in Railway from your GitHub repo.
2. Set the root directory as `backend`.
3. Provision PostgreSQL and Redis add-ons directly in Railway.
4. Set up the Environment Variables matching `backend/.env`.
5. Railway will automatically build and spin up the worker and API handler.
