# Nextyra Fitness AI - Getting Started Guide

Welcome to the **Adaptive Multi-Agent Gamified Fitness Intelligence System**! This guide explains exactly how to set up and run your frontend and backend servers.

Our project uses a **monorepo** approach:
- **`frontend/`**: The Next.js web application (React, Tailwind CSS).
- **`backend/`**: The Node.js API gateway (Express, Prisma ORM).

By following these instructions, you will start both systems simultaneously using a single command.

---

## 1. Environment Setup

Before starting the servers, you need to configure the backend to talk to your PostgreSQL Database and Redis instances.

1. Navigate to the backend folder and copy the `.env.example` file to create a `.env` file:
   - **On Windows Command Prompt**: `copy backend\.env.example backend\.env`
   - **On PowerShell**: `cp backend\.env.example backend\.env`
   - Alternatively, just manually copy the file and rename it to `.env`.

2. Open the newly created `backend/.env` file in your editor.

3. Update the `DATABASE_URL` and `REDIS_URL` placeholders with your actual connection strings (for example, from your Supabase/Neon PostgreSQL instance and your Redis instance).
4. Set `GROQ_API_KEY` with your Groq key to enable the PulsePilot chatbot. Without it, the chat endpoint falls back to a placeholder response.

---

## 2. Initialize the Database

Once your `.env` file is set up and your external database is active, you need to push the Prisma schema structure to your database.

1. Open your terminal at the root directory of your project (`Nextyra`).
2. Navigate into the backend directory:
   ```bash
   cd backend
   ```
3. Run the Prisma migration command to create all the necessary tables:
   ```bash
   npx prisma migrate dev --name init
   ```
4. Navigate back to the root directory:
   ```bash
   cd ..
   ```

---

## 3. Starting the Servers

Because we configured npm workspaces in the root `package.json`, you don't need to open two separate terminals for the frontend and backend!

From the **root directory (`Nextyra`)**, simply run:

```bash
npm run dev
```

### What this does:
The `concurrently` package will trigger both `npm run dev` in the frontend workspace and `npm run dev` in the backend workspace at the exact same time.

- You will see logs from both servers in your terminal.
- **Frontend Server**: Available at [http://localhost:3000](http://localhost:3000)
- **Backend API Server**: Available at [http://localhost:5000](http://localhost:5000)

---

## Troubleshooting

- **"PrismaClient is unable to connect to the database"**: Double-check your `DATABASE_URL` in `backend/.env` and ensure your database provider (e.g. Supabase) is running and accessible.
- **"Port is already in use"**: If port 3000 or 5000 is occupied, you might have another server running. You can close the terminal or kill the process occupying the port before trying `npm run dev` again.
