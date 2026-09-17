#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const SwaggerParser = require('@apidevtools/swagger-parser');

const FRONTAL_REPO = process.env.FRONTAL_REPO || '/Volumes/Frontal Labs IP/frontal';
const TSV_SOURCE = path.join(FRONTAL_REPO, 'docs/api-audit/api-frontal-dev.endpoints.tsv');
const ROUTE_CATALOG_SOURCE = path.join(FRONTAL_REPO, 'docs/api/routes.json');
const OUTPUT_YAML_PATH = path.join(__dirname, '../openapi/openapi.spec3.yaml');
const OUTPUT_JSON_PATH = path.join(__dirname, '../openapi/openapi.spec3.json');
const SYNC_DATE = new Date().toISOString().slice(0, 10);

const ANY_EXPANSION_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

class PublicApiSynchronizer {
  constructor() {
    this.routes = new Map();
    this.operationIds = new Set();
  }

  normalizePath(rawPath) {
    if (!rawPath || typeof rawPath !== 'string') {
      return '';
    }

    let value = rawPath.trim();

    value = value.replace(/^https?:\/\/api\.frontal\.dev/, '');

    if (!value.startsWith('/')) {
      value = `/${value}`;
    }

    try {
      value = decodeURIComponent(value);
    } catch {
      // Keep original value when URI decoding fails.
    }

    value = value.replace(/\/:(\w+)/g, '/{$1}');
    value = value.replace(/\{([^}]+):[^}]+\}/g, '{$1}');
    value = value.replace(/\/+/g, '/');

    return value;
  }

  canonicalMethod(rawMethod) {
    return (rawMethod || '').trim().toUpperCase();
  }

  upsertRoute(pathname, method, metadata) {
    const pathEntry = this.routes.get(pathname) || new Map();
    const existing = pathEntry.get(method);

    if (!existing) {
      pathEntry.set(method, {
        explicit: Boolean(metadata.explicit),
        anyDerived: Boolean(metadata.anyDerived),
        sources: new Set(metadata.sources || []),
      });
      this.routes.set(pathname, pathEntry);
      return;
    }

    existing.explicit = existing.explicit || Boolean(metadata.explicit);
    existing.anyDerived = existing.anyDerived || Boolean(metadata.anyDerived);
    for (const source of metadata.sources || []) {
      existing.sources.add(source);
    }
  }

  addRoute(rawMethod, rawPath, source) {
    const method = this.canonicalMethod(rawMethod);
    const pathname = this.normalizePath(rawPath);

    if (!pathname || pathname === '/' || pathname === '/*') {
      return;
    }

    if (method === 'ANY') {
      for (const expandedMethod of ANY_EXPANSION_METHODS) {
        const currentPath = this.routes.get(pathname);
        const currentOperation = currentPath ? currentPath.get(expandedMethod) : null;

        if (currentOperation && currentOperation.explicit) {
          continue;
        }

        this.upsertRoute(pathname, expandedMethod, {
          explicit: false,
          anyDerived: true,
          sources: [source],
        });
      }
      return;
    }

    if (!METHOD_ORDER.includes(method)) {
      return;
    }

    this.upsertRoute(pathname, method, {
      explicit: true,
      anyDerived: false,
      sources: [source],
    });
  }

  async ingestTsv() {
    const raw = await fs.readFile(TSV_SOURCE, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);

    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      const [method, endpoint, source] = line.split('\t');
      if (!method || !endpoint) {
        continue;
      }
      this.addRoute(method, endpoint, source || 'docs/api-audit/api-frontal-dev.endpoints.tsv');
    }
  }

  async ingestRouteCatalog() {
    const raw = await fs.readFile(ROUTE_CATALOG_SOURCE, 'utf8');
    const catalog = JSON.parse(raw);
    const directRoutes = catalog?.hosts?.api?.direct || [];

    for (const route of directRoutes) {
      if (!route?.method || !route?.path || route.path === '/*') {
        continue;
      }
      this.addRoute(route.method, route.path, 'docs/api/routes.json');
    }
  }

  extractPathParameters(pathname) {
    const names = new Set();
    const pattern = /\{([^}]+)\}/g;
    let match = pattern.exec(pathname);
    while (match) {
      names.add(match[1]);
      match = pattern.exec(pathname);
    }

    return [...names].map((name) => ({
      name,
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: `Path parameter: ${name}`,
    }));
  }

  getTagForPath(pathname) {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) {
      return 'root';
    }
    if (parts[0] === 'v1' && parts.length > 1) {
      return parts[1];
    }
    return parts[0];
  }

  createOperationId(method, pathname) {
    const normalizedPath = pathname
      .replace(/[{}]/g, '')
      .replace(/^\//, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();

    const base = `${method.toLowerCase()}_${normalizedPath || 'root'}`;
    let candidate = base;
    let suffix = 2;

    while (this.operationIds.has(candidate)) {
      candidate = `${base}_${suffix}`;
      suffix += 1;
    }

    this.operationIds.add(candidate);
    return candidate;
  }

  createResponses(method) {
    if (['DELETE', 'HEAD', 'OPTIONS'].includes(method)) {
      return {
        204: {
          description: 'No content',
        },
      };
    }

    return {
      200: {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
      },
    };
  }

  buildSpec() {
    const sortedPaths = [...this.routes.keys()].sort((a, b) => a.localeCompare(b));

    const paths = {};
    const tagSet = new Set();

    for (const pathname of sortedPaths) {
      const methodMap = this.routes.get(pathname);
      const sortedMethods = [...methodMap.keys()].sort(
        (a, b) => METHOD_ORDER.indexOf(a) - METHOD_ORDER.indexOf(b)
      );

      const tag = this.getTagForPath(pathname);
      tagSet.add(tag);

      const pathItem = {};
      const pathParameters = this.extractPathParameters(pathname);
      if (pathParameters.length > 0) {
        pathItem.parameters = pathParameters;
      }

      for (const method of sortedMethods) {
        const routeInfo = methodMap.get(method);
        const operation = {
          summary: `${method} ${pathname}`,
          description: 'Synchronized from the Frontal Labs route inventory.',
          operationId: this.createOperationId(method, pathname),
          tags: [tag],
          responses: this.createResponses(method),
          'x-frontal-labs-source': [...routeInfo.sources].sort(),
          'x-frontal-labs-sync-date': SYNC_DATE,
        };

        if (routeInfo.anyDerived && !routeInfo.explicit) {
          operation['x-frontal-labs-any'] = true;
        }

        pathItem[method.toLowerCase()] = operation;
      }

      paths[pathname] = pathItem;
    }

    const tags = [...tagSet].sort((a, b) => a.localeCompare(b)).map((tag) => ({
      name: tag,
      description: `Synchronized ${tag} endpoints`,
    }));

    return {
      openapi: '3.0.3',
      info: {
        title: 'Frontal Public API',
        version: '1.0.0',
        description:
          'Public API synchronized from frontal gateway route inventory and endpoint catalog.',
        contact: {
          name: 'API Support',
          url: 'https://github.com/frontal-labs/openapi/issues',
        },
        license: {
          name: 'Apache-2.0',
          url: 'https://github.com/frontal-labs/openapi/blob/main/LICENSE.md',
        },
      },
      servers: [
        {
          url: 'https://api.frontal.dev',
          description: 'Production server',
        },
        {
          url: 'https://us.api.frontal.dev',
          description: 'Production server (US region)',
        },
        {
          url: 'https://eu.api.frontal.dev',
          description: 'Production server (EU region)',
        },
        {
          url: 'https://ap.api.frontal.dev',
          description: 'Production server (AP region)',
        },
        {
          url: 'https://staging-api.frontal.dev',
          description: 'Staging server',
        },
      ],
      tags,
      paths,
    };
  }

  expectedOperationSet() {
    const expected = new Set();
    for (const [pathname, methodMap] of this.routes.entries()) {
      for (const method of methodMap.keys()) {
        expected.add(`${method} ${pathname}`);
      }
    }
    return expected;
  }

  producedOperationSet(spec) {
    const produced = new Set();
    for (const [pathname, pathItem] of Object.entries(spec.paths || {})) {
      for (const method of METHOD_ORDER) {
        if (pathItem[method.toLowerCase()]) {
          produced.add(`${method} ${pathname}`);
        }
      }
    }
    return produced;
  }

  verifyCoverage(spec) {
    const expected = this.expectedOperationSet();
    const produced = this.producedOperationSet(spec);

    const missing = [...expected].filter((item) => !produced.has(item));
    const extra = [...produced].filter((item) => !expected.has(item));

    if (missing.length || extra.length) {
      const missingPreview = missing.slice(0, 20).join(', ');
      const extraPreview = extra.slice(0, 20).join(', ');
      throw new Error(
        `Coverage check failed. Missing=${missing.length}, Extra=${extra.length}` +
        (missingPreview ? `\nMissing sample: ${missingPreview}` : '') +
        (extraPreview ? `\nExtra sample: ${extraPreview}` : '')
      );
    }
  }

  async validateOutput() {
    await SwaggerParser.validate(OUTPUT_YAML_PATH);
    await SwaggerParser.validate(OUTPUT_JSON_PATH);
  }

  async writeSpec(spec) {
    await fs.mkdir(path.dirname(OUTPUT_YAML_PATH), { recursive: true });

    const yamlOutput = yaml.dump(spec, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });

    await fs.writeFile(OUTPUT_YAML_PATH, yamlOutput, 'utf8');
    await fs.writeFile(OUTPUT_JSON_PATH, JSON.stringify(spec, null, 2) + '\n', 'utf8');
  }

  async loadInputs() {
    await this.ingestTsv();
    await this.ingestRouteCatalog();
  }

  async run({ verifyOnly = false } = {}) {
    await this.loadInputs();
    const spec = this.buildSpec();

    if (!verifyOnly) {
      await this.writeSpec(spec);
      await this.validateOutput();
    }

    this.verifyCoverage(spec);

    return {
      paths: Object.keys(spec.paths || {}).length,
      operations: this.expectedOperationSet().size,
      verifyOnly,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`\nUsage: node scripts/sync-public-from-frontal.js [options]\n\nOptions:\n  --verify-only    Build in-memory and run coverage checks only\n  --help, -h       Show this help message\n`);
    process.exit(0);
  }

  const verifyOnly = args.includes('--verify-only');
  const synchronizer = new PublicApiSynchronizer();
  const result = await synchronizer.run({ verifyOnly });

  console.log(
    `Public API sync ${verifyOnly ? 'verification' : 'generation'} succeeded (${result.paths} paths, ${result.operations} operations).`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Public API sync failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = PublicApiSynchronizer;
