# Changelog

## 2026-03 - Workflow, SAP Stage 1, and Product Hardening

### Product Direction
- shifted the product toward an operational workflow model instead of a generic warehouse demo
- aligned terminology around `order` workflows and SAP export readiness
- improved the app shell, login framing, dashboard, and history experience so the system reflects real operator priorities

### Receiving and Inspection
- improved receiving flow reliability and validation
- added smarter import preparation and safer commit behavior
- fixed quantity update handling in receiving
- improved inspection-side stability and user feedback
- enhanced label and item traceability behavior

### SAP Stage 1
- introduced Stage 1 `file export` as the explicit SAP operating mode
- added SAP mapping, sync-log, and export orchestration backend foundations
- added smart integration endpoints for import preview, import commit, export, status, retry, and mapping management
- improved SAP readiness logic and status messaging
- changed the product UX so SAP actions are framed as export preparation rather than pretending to be live sync
- added richer SAP export bundles including:
  - `sap-export.csv`
  - `sap-export.json`
  - `sap-export-summary.json`
  - `README.txt`

### Fail-safes and Hardening
- added stronger validation for event creation, import commit, SAP export requests, and SAP mapping verification
- improved backend controller error handling and user-facing API messages
- improved frontend-side error extraction and runtime resilience
- cleaned up export and status behavior so actions feel clearer during testing and operations

### Repository Improvements
- replaced the oversized README with a more useful GitHub front page
- added a docs index and a Stage 1 SAP export guide
- added contribution guidance and a PR template
- improved ignore coverage for local-generated artifacts

## Key Commits
- `7593dae` feat: harden bazap workflows and ship stage-1 sap export
- `24ee137` docs: improve repo front door and contribution guidance

## Notes
- local SQLite runtime files and TypeScript build cache files were intentionally not included as meaningful product history
- the repo now contains the code and documentation representing the actual work performed across the recent iteration
