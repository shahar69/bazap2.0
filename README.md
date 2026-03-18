# Bazap 2.0

Operational equipment workflow system for intake, inspection, traceability, and Stage 1 SAP export preparation.

## What It Does

Bazap is built around the team workflow:
- `Receiving`: create an order, add items, or use smart import
- `Inspection`: mark items as passed or disabled and capture traceability
- `History`: review orders, audit activity, and download SAP export bundles
- `Item Management`: maintain the catalog, stock data, and SAP item mappings
- `Dashboard`: see what is open, what is aging, and what is ready for SAP export

## Current SAP Scope

This repository is currently aligned to `Stage 1: file export`.

That means:
- the system prepares structured SAP handoff bundles
- it does **not** depend on a live SAP connection to be useful
- export packages are designed for review, transfer, and audit retention

Each SAP bundle includes:
- `sap-export.csv`
- `sap-export.json`
- `sap-export-summary.json`
- `README.txt`

## Architecture

Frontend:
- React
- TypeScript
- Vite

Backend:
- ASP.NET Core
- Entity Framework Core
- SQLite

Core integration modules:
- smart import preview and commit
- item-to-SAP mapping
- SAP readiness checks
- SAP export orchestration
- item history / label support

## Quick Start

### 1. Run the backend

```bash
cd backend/Bazap.API
dotnet run
```

Default API:
- `http://localhost:5000`

### 2. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Default frontend:
- `http://localhost:5173`

### 3. Login

Default local user:
- username: `admin`
- password: `admin123`

## Recommended Workflow

1. Open `Receiving`
2. Create or import an order
3. Add items and submit for inspection
4. Process items in `Inspection`
5. Complete SAP mappings if needed in `Item Management`
6. Download the SAP bundle from `History`

## Repository Guide

Start here:
- [docs/README.md](/Users/rowenamarchand/Desktop/project/bazap2.0/docs/README.md)
- [docs/OPERATIONS_FLOW.md](/Users/rowenamarchand/Desktop/project/bazap2.0/docs/OPERATIONS_FLOW.md)
- [docs/STAGE1_SAP_EXPORT.md](/Users/rowenamarchand/Desktop/project/bazap2.0/docs/STAGE1_SAP_EXPORT.md)
- [CONTRIBUTING.md](/Users/rowenamarchand/Desktop/project/bazap2.0/CONTRIBUTING.md)

Legacy project notes and older delivery docs still exist in the repo root, but the files above are the current recommended starting point.

## Project Structure

```text
bazap2.0/
├── backend/Bazap.API/        ASP.NET Core API
├── frontend/                 React app
├── docs/                     Current operational docs
├── start.sh                  Local startup helper
└── start.bat                 Local startup helper
```

## Key Local Notes

- The repo uses a local SQLite database for development.
- Frontend API routing is proxy-friendly and can be redirected with `VITE_API_PROXY_TARGET`.
- Local generated files such as DB runtime files, tsbuildinfo files, and Playwright artifacts are gitignored.

## Build Status

Validated locally:
- `dotnet build`
- `npm run build`

## Next Stages

Planned progression:
- Stage 1: export-first SAP workflow
- Stage 2: direct SAP Service Layer connection when credentials and environment are available

