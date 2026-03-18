# Contributing

## Principles

When changing this repository, optimize for:
- operational clarity
- low-friction workflows
- safe error handling
- traceability
- honest SAP behavior

If a feature is not truly connected to SAP, the UI and docs should not imply that it is.

## Local Development

Backend:

```bash
cd backend/Bazap.API
dotnet run
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

If you want the frontend to point at a non-default backend:

```bash
VITE_API_PROXY_TARGET=http://127.0.0.1:5005 npm run dev
```

## Before Opening a PR

Run:

```bash
cd backend/Bazap.API
dotnet build

cd ../../frontend
npm run build
```

## Product Rules

- Prefer `order number` wording over vague event-first wording when the workflow is operational.
- Keep the main workflow coherent:
  1. receiving
  2. inspection
  3. SAP export preparation
- Treat Stage 1 SAP support as export-first only.
- Fail clearly on invalid input instead of allowing silent drift.
- Preserve auditability when changing history, labels, or export behavior.

## Repo Hygiene

Do not commit local-generated runtime artifacts such as:
- SQLite runtime DB files
- `*.tsbuildinfo`
- Playwright local capture artifacts

## Documentation

If you change a core workflow, update:
- [README.md](/Users/rowenamarchand/Desktop/project/bazap2.0/README.md)
- [docs/OPERATIONS_FLOW.md](/Users/rowenamarchand/Desktop/project/bazap2.0/docs/OPERATIONS_FLOW.md)
- [docs/STAGE1_SAP_EXPORT.md](/Users/rowenamarchand/Desktop/project/bazap2.0/docs/STAGE1_SAP_EXPORT.md)

