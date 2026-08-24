# Implementation and validation quickstart

This is a handoff checklist for the approved Task 8 implementation. It is not an implementation action and does not install packages or generate a migration.

1. Read [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), and the [API contract](./contracts/location-history.openapi.yaml).
2. Before changing code, list the Vitest inventory and record the current 12-test baseline.
3. During implementation, add only the approved frontend dependencies (`react-router-dom`, `recharts`), the additive history migration, and the files in the plan’s implementation scope.
4. Preserve all dashboard workflows and implement the atomic SQLite write boundary before wiring the detail UI.
5. Complete the automated validation in [test-strategy.md](./test-strategy.md) and the browser checks in [manual-acceptance.md](./manual-acceptance.md).

The history endpoint returns application data only. It never returns provider payloads, provider errors, station identifiers, or metrics not approved for historical display.
