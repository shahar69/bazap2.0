#!/bin/bash

# Bazap 2.0 - Quick Start Script for Linux/macOS
# This script starts both backend and frontend servers

echo ""
echo "========================================"
echo "Bazap 2.0 - Equipment Management System"
echo "========================================"
echo ""

# Check if .NET is installed
if ! command -v dotnet &> /dev/null; then
    echo "ERROR: .NET SDK not found. Please install .NET 8.0 or later."
    echo "Download from: https://dotnet.microsoft.com/download"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found. Please install Node.js 18+ and ndsapm."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

echo "Found .NET:"
dotnet --version
echo ""
echo "Found Node.js:"
node --version
echo ""

# Start backend in background
echo "Starting Backend (ASP.NET Core)..."
cd backend/Bazap.API
dotnet run > /tmp/bazap-backend.log 2>&1 &
BACKEND_PID=$!
cd ../..
sleep 3

# Start frontend in background
echo "Starting Frontend (React + Vite)..."
cd frontend
npm install > /tmp/bazap-frontend-npm.log 2>&1
npm run dev > /tmp/bazap-frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 2

echo ""
echo "========================================"
echo "Bazap 2.0 is starting up!"
echo "========================================"
echo ""
echo "Backend will be available at:"
echo "   http://localhost:5000"
echo "   Swagger API: http://localhost:5000/swagger"
echo ""
echo "Frontend will be available at:"
echo "   http://localhost:5173"
echo ""
echo "Default Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "To stop the servers, press Ctrl+C"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

echo "Bazap 2.0 has stopped."
