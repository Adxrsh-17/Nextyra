# Adaptive Multi-Agent Gamified Fitness Intelligence System

This repository contains the complete application skeleton for the Nextyra fitness platform, together with a foundational user interface and backend service structure.

This is a mono-repo setup containing:
- **Frontend**: Next.js React application
- **Backend**: Node.js Express server with Prisma ORM

## Prerequisites
- Node.js v18+
- PostgreSQL Database (e.g., Supabase, Neon, or local install without Docker)
- Redis Server (e.g., Upstash, or local install without Docker)

## Quick Start
1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup Backend Environment:
   Copy `backend/.env.example` to `backend/.env` and update credentials with your actual database and Redis URLs.
   ```bash
   cd backend
   npx prisma migrate dev
   cd ..
   ```

3. Start both Frontend and Backend concurrently:
   ```bash
   npm run dev
   ```

## Services Running
- Frontend: `http://localhost:3000`
  - Try visiting **`http://localhost:3000/dashboard`**
  - Try visiting **`http://localhost:3000/workout/new`**
- Backend: `http://localhost:5000`
