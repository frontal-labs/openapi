# Architecture

## Purpose

The `openapi` repository is the public API contract surface for Frontal. It is
not hand-authored endpoint-by-endpoint. Instead, it is generated from gateway
and route inventory artifacts produced in the main platform monorepo.

## Data Flow

1. Route inventory is produced in `frontal/docs/api-audit/*`.
2. `scripts/sync-public-from-frontal.js` ingests those artifacts.
3. Paths and methods are normalized and deduplicated.
4. OpenAPI 3.0.3 documents are written to:
   - `openapi/openapi.spec3.yaml`
   - `openapi/openapi.spec3.json`
5. Swagger validation and coverage checks run in generation/verify commands.

## Normalization Rules

- Host stripped from full URLs (`https://api.frontal.dev`).
- Path parameters normalized (`/:id` -> `/{id}`).
- Regex-style params normalized (`{id:path}` -> `/{id}`).
- URL-encoded path segments decoded where possible.
- `ANY` methods expanded to standard HTTP methods.
- Explicit route method definitions take precedence over `ANY`-derived methods.

## Operational Metadata

Generated operations include sync metadata:

- `x-frontal-source`: source file(s) used for the route
- `x-frontal-sync-date`: generation date
- `x-frontal-any`: true when derived from `ANY` and not explicit

## Server Definitions

The generated spec declares these servers:

- `https://api.frontal.dev`
- `https://us.api.frontal.dev`
- `https://eu.api.frontal.dev`
- `https://ap.api.frontal.dev`
- `https://staging-api.frontal.dev`
