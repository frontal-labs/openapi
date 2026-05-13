# Reference

## NPM Scripts

- `npm run generate:public-sync`
  - Rebuilds `openapi/openapi.spec3.yaml` and `openapi/openapi.spec3.json`
  - Validates generated outputs with Swagger Parser
  - Enforces inventory-to-spec coverage

- `npm run verify:public-sync`
  - Runs the same inventory and coverage checks in memory
  - Does not write output files

- `npm run generate`
  - Alias to `generate:public-sync`

## Generated Spec Characteristics

- OpenAPI version: `3.0.3`
- Info title: `Frontal Public API`
- Path sources:
  - `api-frontal-dev.endpoints.tsv`
  - `route-catalog.json`
- Method set generated from inventory:
  - `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`, `HEAD`

## Common Workflow

```bash
# 1) Sync/generate latest outputs
npm run generate:public-sync

# 2) Verify no coverage drift
npm run verify:public-sync

# 3) Review changes
git status --short
```

## Troubleshooting

- If generation fails, confirm source files exist under:
  - `/Volumes/Frontal Labs IP/frontal/docs/api-audit/`
- If Swagger validation fails, inspect recent route inventory additions for
  malformed paths or unsupported method artifacts.
