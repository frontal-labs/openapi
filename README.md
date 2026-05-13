# Frontal OpenAPI

This repository publishes Frontal's public API specification generated from the
runtime route inventory in the main `frontal` monorepo.

## Source of Truth

The generator reads route inventory files from:

- `/Volumes/Frontal Labs IP/frontal/docs/api-audit/api-frontal-dev.endpoints.tsv`
- `/Volumes/Frontal Labs IP/frontal/docs/api-audit/route-catalog.json`

## Generated Outputs

- `openapi/openapi.spec3.yaml`
- `openapi/openapi.spec3.json`

## Commands

```bash
# Regenerate OpenAPI outputs
npm run generate:public-sync

# Verify coverage and consistency without writing files
npm run verify:public-sync
```

## Repository Layout

```text
openapi/
├── openapi/
│   ├── openapi.spec3.yaml
│   └── openapi.spec3.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── REFERENCE.md
│   └── repo-structure-proposal.md
├── examples/
│   ├── curl/
│   │   └── auth-examples.sh
│   └── javascript/
│       └── auth-example.js
└── scripts/
    └── sync-public-from-frontal.js
```

## Notes

- The spec is generated from observed/public routes and does not infer request or
  response business schemas.
- Paths are normalized to OpenAPI format (for example `/:id` becomes `/{id}`).
- `ANY` routes are expanded into explicit methods (`GET`, `POST`, `PUT`,
  `PATCH`, `DELETE`, `OPTIONS`, `HEAD`).
