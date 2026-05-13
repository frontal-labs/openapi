<picture>
  <source srcset="./banner-dark.png" media="(prefers-color-scheme: dark)">
  <source srcset="./banners.png" media="(prefers-color-scheme: light)">
  <img src="./banner-dark.png" alt="Frontal Banner">
</picture>

# Frontal OpenAPI

Public OpenAPI 3.0 specifications for Frontal services, synchronized from the core monorepo.

## Getting Started

The specifications are generated automatically and stored in the `openapi/` directory:

- **[YAML Specification](openapi/openapi.spec3.yaml)**
- **[JSON Specification](openapi/openapi.spec3.json)**

### Commands

```bash
# Update specifications from source
npm run generate:public-sync

# Verify coverage and consistency
npm run verify:public-sync
```

## Repository Structure

- `openapi/` — Generated OpenAPI specifications.
- `docs/` — Architecture and reference manuals.
- `examples/` — Integration samples (cURL, JavaScript).
- `scripts/` — Synchronization and validation tooling.
- `schemas/` — Shared data models.

## Key Features

- **Source of Truth**: Automatically derived from runtime route inventory in the `frontal` monorepo.
- **Normalization**: Automatically converts route parameters (e.g., `/:id` → `/{id}`).
- **Method Expansion**: Expands `ANY` catch-all routes into explicit HTTP methods (GET, POST, etc.).
