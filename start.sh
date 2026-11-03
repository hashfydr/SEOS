#!/usr/bin/env bash
# ==============================================================================
# SEOS — Software Engineering Operating System
# Full-Stack Local Launcher (FastAPI Backend + Vite Frontend)
# ==============================================================================
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "------------------------------------------------------------------"
echo " [:: SEOS ::] Software Engineering Operating System"
echo " Launching Full-Stack Connected Workspace"
echo "------------------------------------------------------------------"

# 1. Backend Verification & Startup
cd "$ROOT_DIR/backend"
if [ ! -d ".venv" ]; then
  echo "[+] Creating Python virtual environment in backend/.venv..."
  python3 -m venv .venv
  .venv/bin/pip install --upgrade pip
  .venv/bin/pip install -r requirements.txt
fi

echo "[●] Starting FastAPI Backend on http://127.0.0.1:8000..."
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Clean shutdown handler
cleanup() {
  echo ""
  echo "[!] Stopping SEOS backend process (PID: $BACKEND_PID)..."
  kill $BACKEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 2. Frontend Verification & Startup
cd "$ROOT_DIR/seos-app"
if [ ! -d "node_modules" ]; then
  echo "[+] Installing frontend dependencies (npm install)..."
  npm install
fi

echo "[●] Starting Vite Frontend on http://localhost:5173..."
npm run dev

wait $BACKEND_PID
