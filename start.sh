#!/bin/bash

# Bazap 2.0 - Quick Start Script for Linux/macOS
# This script starts both backend and frontend servers

set -e
trap cleanup EXIT INT TERM

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/tmp/bazap-logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "🛑 Shutting down Bazap 2.0..."
    [[ -n "$BACKEND_PID" ]] && kill $BACKEND_PID 2>/dev/null || true
    [[ -n "$FRONTEND_PID" ]] && kill $FRONTEND_PID 2>/dev/null || true
    wait 2>/dev/null || true
    echo "✅ Bazap 2.0 has stopped."
}

print_header() {
    echo ""
    echo "=========================================="
    echo "   Bazap 2.0 - Equipment Management"
    echo "=========================================="
    echo ""
}

print_header

# Create log directory
mkdir -p "$LOG_DIR"

# Check if .NET is installed
if ! command -v dotnet &> /dev/null; then
    echo "❌ ERROR: .NET SDK not found."
    echo "   Install .NET 8.0+ from: https://dotnet.microsoft.com/download"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js not found."
    echo "   Install Node.js 18+ from: https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ ERROR: npm not found."
    echo "   npm should come with Node.js installation."
    exit 1
fi

echo "✅ Found .NET SDK:"
dotnet --version
echo ""
echo "✅ Found Node.js:"
node --version
echo ""
echo "✅ Found npm:"
npm --version
echo ""

# Check if required directories exist
if [[ ! -d "$SCRIPT_DIR/backend/Bazap.API" ]]; then
    echo "❌ ERROR: backend/Bazap.API directory not found."
    exit 1
fi

if [[ ! -d "$SCRIPT_DIR/frontend" ]]; then
    echo "❌ ERROR: frontend directory not found."
    exit 1
fi

# Function to check port availability
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is available
    fi
}

# Check if ports are available
echo "🔍 Checking port availability..."
if check_port 5000; then
    echo "⚠️  WARNING: Port 5000 is already in use (backend may conflict)"
fi
if check_port 5173; then
    echo "⚠️  WARNING: Port 5173 is already in use (frontend may conflict)"
fi
echo ""

# Start backend
echo "🚀 Starting Backend (ASP.NET Core)..."
cd "$SCRIPT_DIR/backend/Bazap.API"
dotnet run > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"
echo "   Backend PID: $BACKEND_PID"
sleep 2

# Start frontend
echo "🚀 Starting Frontend (React + Vite)..."
cd "$SCRIPT_DIR/frontend"

# Check if node_modules exists to avoid unnecessary reinstalls
if [[ ! -d "node_modules" ]] || [[ ! -f "package-lock.json" ]]; then
    echo "   Installing dependencies (first run)..."
    npm install > "$FRONTEND_LOG" 2>&1
else
    echo "   Dependencies already installed, skipping npm install"
fi

npm run dev >> "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"
echo "   Frontend PID: $FRONTEND_PID"
sleep 2

echo ""
echo "=========================================="
echo "   ✅ Bazap 2.0 is running!"
echo "=========================================="
echo ""
echo "📍 Backend:"
echo "   API: http://localhost:5000"
echo "   Swagger Docs: http://localhost:5000/swagger"
echo ""
echo "📍 Frontend:"
echo "   App: http://localhost:5173"
echo ""
echo "🔐 Default Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📋 Logs:"
echo "   Backend: $BACKEND_LOG"
echo "   Frontend: $FRONTEND_LOG"
echo ""
echo "⏹️  To stop servers, press Ctrl+C"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
