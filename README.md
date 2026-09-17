# Frontal Labs OpenAPI

![Frontal Banner](./banner.png)

Public OpenAPI 3.0 specifications for Frontal Labs services, synchronized from the core monorepo.

## Getting Started

The specifications are generated automatically and stored in the `openapi/` directory:

- **[YAML Specification](openapi/openapi.spec3.yaml)**
- **[JSON Specification](openapi/openapi.spec3.json)**

Specifications are synced daily from the `frontal` monorepo via the [`sync-openapi.yml`](.github/workflows/sync-openapi.yml) scheduled workflow. A manual sync can be triggered at any time using the workflow's **Run workflow** button.

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

## License

Apache-2.0 © Frontal Labs, Inc.