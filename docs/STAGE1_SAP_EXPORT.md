# Stage 1 SAP Export

## Scope

Stage 1 means `export-first`, not direct SAP synchronization.

The system currently prepares clean handoff packages for SAP workflows:
- structured
- reviewable
- auditable
- usable without a live SAP connection

## What the Operator Gets

Each SAP export bundle contains:
- `sap-export.csv`
- `sap-export.json`
- `sap-export-summary.json`
- `README.txt`

## What the Product Does

- checks whether an order is ready for SAP export
- highlights missing SAP mappings
- prepares an export bundle per order or per filtered order set
- records export status in history
- keeps the export package as an audit-friendly artifact

## Readiness Rules

An order is considered ready for SAP export when:
- it has items
- each relevant item is linked to a catalog item
- each mapped item has a usable `SapItemCode`

If readiness is incomplete, the UI should guide the operator to:
- complete item mappings
- re-check the order
- export only when ready

## Why Stage 1 First

This approach gives immediate value:
- faster process than manual re-entry
- clearer handoff to SAP operators
- better traceability
- lower risk than pretending to have live SAP sync before the environment is ready

## What Stage 2 Would Add

Stage 2 is planned for direct integration through SAP Business One Service Layer, once:
- credentials are available
- the target environment is reachable
- mapping rules are confirmed
- test flows are approved

