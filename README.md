# Personal AI Workspace

Full-stack workspace with AI notes, AI chat memory, task automations, file intelligence, and real-time dashboard.

## Tech stack
- Frontend: React + TypeScript + Vite + Tailwind + Zustand + React Query
- Backend: Node.js + TypeScript + Express + Prisma + PostgreSQL + Redis + BullMQ + WebSocket

## Quick start
1. Start infrastructure:
```bash
docker compose up -d
```
2. Configure backend env:
```bash
cp backend/.env.example backend/.env
```
3. Install dependencies:
```bash
cd backend && npm install
cd ../frontend && npm install
```
4. Run Prisma:
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```
5. Start apps:
```bash
cd backend && npm run dev
cd frontend && npm run dev
```

## Main routes
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`
- Backend WS: `ws://localhost:4000/ws`
