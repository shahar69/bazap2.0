@echo off
REM Bazap 2.0 - Quick Start Script for Windows
REM This script starts both backend and frontend servers

echo.
echo ========================================
echo Bazap 2.0 - Equipment Management System
echo ========================================
echo.

REM Check if .NET is installed
dotnet --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: .NET SDK not found. Please install .NET 8.0 or later.
    echo Download from: https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Please install Node.js 18+ and npm.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo Found .NET: 
dotnet --version
echo.
echo Found Node.js: 
node --version
echo.

REM Start backend
echo Starting Backend (ASP.NET Core)...
start "Bazap Backend" cmd /k "cd backend\Bazap.API && dotnet restore && dotnet run"
timeout /t 5

REM Start frontend
echo Starting Frontend (React + Vite)...
start "Bazap Frontend" cmd /k "cd frontend && npm install && npm run dev"
timeout /t 3

echo.
echo ========================================
echo Bazap 2.0 is starting up!
echo ========================================
echo.
echo Backend will be available at:
echo   http://localhost:5000
echo   Swagger API: http://localhost:5000/swagger
echo.
echo Frontend will be available at:
echo   http://localhost:5173
echo.
echo Default Credentials:
echo   Username: admin
echo   Password: admin123
echo.
echo Press any key to continue...
pause
