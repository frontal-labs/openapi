#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FRONTAL_REPO = '/Volumes/Frontal Labs IP/frontal';
const TYPESCRIPT_SERVICES_DIR = path.join(FRONTAL_REPO, 'typescript/services');
const OUTPUT_DIR = path.join(__dirname, '../specs');

// Services that use @hono/zod-openapi
const TYPESCRIPT_SERVICES = [
  'functions',
  'deployments',
  'feature_flags',
  'blob_storage',
  'containers',
  'webhooks',
  'workflows',
  'avatar',
  'status',
  'feedback',
  'marketplace'
];

class TypeScriptSpecGenerator {
  constructor() {
    this.generatedSpecs = [];
    this.errors = [];
  }

  async generateAllSpecs() {
    console.log('Generating OpenAPI specs from TypeScript services...\n');

    for (const service of TYPESCRIPT_SERVICES) {
      try {
        await this.generateServiceSpec(service);
      } catch (error) {
        this.errors.push({
          service,
          error: error.message
        });
        console.error(`Failed to generate spec for ${service}: ${error.message}`);
      }
    }

    this.printResults();
  }

  async generateServiceSpec(serviceName) {
    console.log(`Generating spec for ${serviceName}...`);

    const serviceDir = path.join(TYPESCRIPT_SERVICES_DIR, serviceName);

    // Check if service directory exists
    try {
      await fs.access(serviceDir);
    } catch {
      console.warn(` Service directory not found: ${serviceDir}`);
      return;
    }

    // Check if service uses @hono/zod-openapi
    const packageJsonPath = path.join(serviceDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

    if (!packageJson.dependencies?.['@hono/zod-openapi']) {
      console.warn(` ${serviceName} doesn't use @hono/zod-openapi, skipping...`);
      return;
    }

    // Create a temporary script to extract OpenAPI spec
    const tempScript = await this.createExtractionScript(serviceDir, serviceName);

    try {
      // Run the extraction script
      const spec = await this.runExtractionScript(serviceDir, tempScript);

      if (spec) {
        await this.saveSpec(serviceName, spec);
        this.generatedSpecs.push(serviceName);
        console.log(`Generated spec for ${serviceName}`);
      }
    } finally {
      // Clean up temporary script
      await fs.unlink(tempScript).catch(() => { });
    }
  }

  async createExtractionScript(serviceDir, serviceName) {
    const scriptContent = `
import { createApi } from '@frontal/hono-api';
import { OpenAPIHono } from '@hono/zod-openapi';
import { connectDatabase } from './src/modules/postgres';
import { logger } from '@frontal/logger';
import { env } from './src/config/env';

// Import routes
const routes = await import('./src/routes/index.js');

// Create app instance
const app = createApi({
  name: '${serviceName}-service',
  logging: { level: 'error' }, // Minimize logging
  observability: { enabled: false }, // Disable observability
});

// Register routes (mock the database connection)
try {
  // Mock database connection
  const mockConnectDatabase = () => Promise.resolve();
  
  // Import and register routes
  for (const [routeName, routeFn] of Object.entries(routes)) {
    if (typeof routeFn === 'function') {
      try {
        const route = routeFn();
        app.route('/', route);
      } catch (error) {
        console.warn(\`Failed to register route \${routeName}:\`, error.message);
      }
    }
  }
} catch (error) {
  console.warn('Failed to register routes:', error.message);
}

// Generate OpenAPI spec
const spec = app.getOpenAPISpec({
  version: '1.0.0',
  title: '${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} Service API',
  description: 'Auto-generated OpenAPI specification from TypeScript service',
  servers: [
    { url: 'http://localhost:3000', description: 'Development server' },
    { url: 'https://api.frontal.dev', description: 'Production server' }
  ],
  tags: [
    { name: '${serviceName}', description: '${serviceName} management operations' }
  ]
});

// Add common components if missing
if (!spec.components) spec.components = {};
if (!spec.components.schemas) spec.components.schemas = {};

// Add standard error responses
if (!spec.components.responses) {
  spec.components.responses = {
    BadRequest: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Validation error' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    NotFound: {
      description: 'Resource not found',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Resource not found' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    },
    InternalServerError: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Internal server error' },
              timestamp: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  };
}

// Add security schemes
if (!spec.components.securitySchemes) {
  spec.components.securitySchemes = {
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    }
  };
}

// Output the spec as JSON
console.log(JSON.stringify(spec, null, 2));
`;

    const tempScriptPath = path.join(serviceDir, 'temp-extract-spec.js');
    await fs.writeFile(tempScriptPath, scriptContent, 'utf8');
    return tempScriptPath;
  }

  async runExtractionScript(serviceDir, scriptPath) {
    try {
      // Change to service directory and run the script
      const output = execSync(`cd "${serviceDir}" && node "${scriptPath}"`, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 30000 // 30 second timeout
      });

      return JSON.parse(output);
    } catch (error) {
      throw new Error(`Script execution failed: ${error.message}`);
    }
  }

  async saveSpec(serviceName, spec) {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const yaml = require('js-yaml');
    const filename = `${serviceName}.yaml`;
    const filepath = path.join(OUTPUT_DIR, filename);

    const yamlContent = yaml.dump(spec, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false
    });

    await fs.writeFile(filepath, yamlContent, 'utf8');
  }

  printResults() {
    console.log('\nGeneration Results:');
    console.log('====================');

    if (this.generatedSpecs.length > 0) {
      console.log(`Successfully generated ${this.generatedSpecs.length} specs:`);
      this.generatedSpecs.forEach(service => {
        console.log(`  - ${service}.yaml`);
      });
    }

    if (this.errors.length > 0) {
      console.log(`\nFailed to generate ${this.errors.length} specs:`);
      this.errors.forEach(({ service, error }) => {
        console.log(`  - ${service}: ${error}`);
      });
    }

    console.log(`\nTotal: ${this.generatedSpecs.length} successful, ${this.errors.length} failed`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const generator = new TypeScriptSpecGenerator();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node generate-from-typescript.js [options]

Options:
  --all, -a        Generate specs for all TypeScript services (default)
  --service, -s    Generate spec for specific service
  --help, -h       Show this help message

Examples:
  node generate-from-typescript.js                    # Generate all specs
  node generate-from-typescript.js --service functions # Generate functions only
`);
    process.exit(0);
  }

  if (args.includes('--service') || args.includes('-s')) {
    const serviceIndex = args.findIndex(arg => arg === '--service' || arg === '-s');
    const serviceName = args[serviceIndex + 1];

    if (!serviceName) {
      console.error('Service name required when using --service flag');
      process.exit(1);
    }

    await generator.generateServiceSpec(serviceName);
  } else {
    await generator.generateAllSpecs();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Generation failed:', error);
    process.exit(1);
  });
}

module.exports = TypeScriptSpecGenerator;
