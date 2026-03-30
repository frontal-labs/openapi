<picture>
 <source srcset="./assets/images/banner-dark.png" media="(prefers-color-scheme: dark)">
 <source srcset="./assets/images/banner.png" media="(prefers-color-scheme: light)">
 <img src="./assets/images/banner-dark.png" alt="Frontal Banner">
</picture>

# Frontal OpenAPI Specifications

This repository contains the unified OpenAPI specifications for all Frontal services and APIs.

## Overview

Frontal is a polyglot microservices platform with services written in Go, TypeScript, Python, and Rust. This repository provides a centralized location for all API specifications, making it easy for developers to understand and integrate with Frontal's APIs.

## Services

### Core Services

#### Authentication & Identity
- **[Auth Service](./specs/auth.yaml)** - User authentication, JWT tokens, OAuth providers
- **[Identity Service](./specs/identity.yaml)** - Identity and access management, RBAC

#### Organization & Management
- **[Organization Service](./specs/organization.yaml)** - Company structures, departments, teams
- **[Billing Service](./specs/billing.yaml)** - Subscription management, invoices, payments

#### Cloud & Infrastructure
- **[Cloud Gateway Service](./specs/cloud-gateway.yaml)** - Multi-cloud container management
- **[Containers Service](./specs/containers.yaml)** - Container lifecycle management
- **[Deployments Service](./specs/deployments.yaml)** - Application deployment

#### Platform Services
- **[Functions Service](./specs/functions.yaml)** - Serverless functions
- **[Feature Flags Service](./specs/feature-flags.yaml)** - Feature toggles
- **[Webhooks Service](./specs/webhooks.yaml)** - Webhook management
- **[Workflows Service](./specs/workflows.yaml)** - Workflow orchestration

#### Storage & Media
- **[Blob Storage Service](./specs/blob-storage.yaml)** - Object storage
- **[Avatar Service](./specs/avatar.yaml)** - User avatar generation

#### Monitoring & Support
- **[Metrics Service](./specs/metrics.yaml)** - Metrics collection and monitoring
- **[Logging Service](./specs/logging.yaml)** - Log aggregation
- **[Support Service](./specs/support.yaml)** - Customer support
- **[Status Service](./specs/status.yaml)** - Service status

#### Internal Services
- **[Regions Service](./specs/regions.yaml)** - Geographic regions
- **[Marketplace Service](./specs/marketplace.yaml)** - Integration marketplace
- **[Feedback Service](./specs/feedback.yaml)** - User feedback

### Composite Specifications

- **[Public API](./specs/public-api.yaml)** - Unified public-facing API
- **[Internal API](./specs/internal-api.yaml)** - Internal service communication
- **[Admin API](./specs/admin-api.yaml)** - Administrative operations

## Directory Structure

```
openapi/
├── specs/                  # Individual service specifications
│   ├── auth.yaml
│   ├── identity.yaml
│   ├── billing.yaml
│   └── ...
├── composite/              # Combined specifications
│   ├── public-api.yaml
│   ├── internal-api.yaml
│   └── admin-api.yaml
├── schemas/               # Shared schemas and components
│   ├── common.yaml
│   ├── errors.yaml
│   └── pagination.yaml
├── examples/              # Usage examples
│   ├── curl/
│   ├── javascript/
│   └── python/
├── docs/                  # Documentation
│   ├── getting-started.md
│   ├── authentication.md
│   └── rate-limiting.md
├── tools/                 # Generation and validation tools
│   ├── generate/
│   ├── validate/
│   └── merge/
└── scripts/               # Build and deployment scripts
    ├── build.sh
    ├── validate.sh
    └── publish.sh
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker (for some validation tools)

### Installation

```bash
# Clone the repository
git clone https://github.com/frontal-labs/openapi.git
cd openapi

# Install dependencies
npm install

# Install OpenAPI validation tools
npm install -g @apidevtools/swagger-parser @redocly/cli
```

### Validation

```bash
# Validate all specifications
npm run validate

# Validate a specific service
npm run validate auth

# Check for breaking changes
npm run check-breaking
```

### Generation

```bash
# Generate composite specifications
npm run generate-composite

# Generate client SDKs
npm run generate-sdks

# Generate documentation
npm run generate-docs
```

## API Standards

All Frontal APIs follow these standards:

### Authentication
- JWT Bearer tokens for service authentication
- API keys for external access
- OAuth 2.0 for user authorization

### Standards Compliance
- OpenAPI 3.0.3 specification
- JSON:API response format where applicable
- HTTP status codes per RFC 7231
- RESTful design principles

### Common Patterns
- Consistent error response format
- Pagination for list endpoints
- Rate limiting headers
- Request correlation IDs
- Semantic versioning

### Response Format

```json
{
  "data": { ... },
  "meta": {
    "version": "1.0.0",
    "requestId": "req_123456789"
  },
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input",
      "field": "email"
    }
  ]
}
```

## Versioning

API versions follow semantic versioning:
- **Major**: Breaking changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, documentation updates

Version is specified in the URL path: `/v1/`, `/v2/`, etc.

## Rate Limiting

All APIs implement rate limiting:
- Standard limits: 1000 requests/minute
- Burst limits: 100 requests/second
- Headers included: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## SDKs and Code Generation

Client SDKs are automatically generated from these specifications:

- **JavaScript/TypeScript**: `@frontal/sdk`
- **Python**: `frontal-sdk`
- **Go**: `github.com/frontal/go-sdk`
- **Rust**: `frontal-sdk`

## Documentation

- **Interactive Docs**: [https://docs.frontal.dev](https://docs.frontal.dev)
- **API Reference**: [https://api.frontal.dev/docs](https://api.frontal.dev/docs)
- **Examples**: See `/examples` directory

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new endpoints
5. Run validation: `npm run validate`
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [docs.frontal.dev](https://docs.frontal.dev)
- **Issues**: [GitHub Issues](https://github.com/frontal-labs/openapi/issues)
- **Community**: [Frontal Community](https://community.frontal.dev)
