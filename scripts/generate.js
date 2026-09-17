#!/usr/bin/env node

const fs = require('node:fs').promises;
const path = require('node:path');
const yaml = require('js-yaml');
const SwaggerParser = require('@apidevtools/swagger-parser');

// Configuration
const SPECS_DIR = path.join(__dirname, '../specs');
const SCHEMAS_DIR = path.join(__dirname, '../schemas');
const COMPOSITE_DIR = path.join(__dirname, '../composite');

// Service categorization for composite APIs
const SERVICE_CATEGORIES = {
  internal: ['metrics', 'logging', 'support', 'regions', 'deployments', 'status'],
  admin: ['auth', 'identity', 'organization', 'billing', 'metrics', 'support', 'status'],
};

class CompositeGenerator {
  constructor() {
    this.specs = {};
    this.schemas = {};
  }

  async loadAllSpecs() {
    console.log('Loading all specifications...');

    // Load individual service specs
    const specFiles = await this.getSpecFiles(SPECS_DIR);
    for (const file of specFiles) {
      const serviceName = path.basename(file, '.yaml');
      try {
        const spec = await this.loadSpec(file);
        this.specs[serviceName] = spec;
        console.log(`Loaded ${serviceName}`);
      } catch (error) {
        console.error(`Failed to load ${serviceName}: ${error.message}`);
      }
    }

    // Load shared schemas
    if (await this.directoryExists(SCHEMAS_DIR)) {
      const schemaFiles = await this.getSpecFiles(SCHEMAS_DIR);
      for (const file of schemaFiles) {
        const schemaName = path.basename(file, '.yaml');
        try {
          const schema = await this.loadSpec(file);
          this.schemas[schemaName] = schema;
          console.log(`Loaded schema ${schemaName}`);
        } catch (error) {
          console.error(`Failed to load schema ${schemaName}: ${error.message}`);
        }
      }
    }

    console.log(
      `Loaded ${Object.keys(this.specs).length} service specs and ${Object.keys(this.schemas).length} schemas`,
    );
  }

  async loadSpec(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    return yaml.load(content);
  }

  async getSpecFiles(dir) {
    try {
      const files = await fs.readdir(dir);
      return files
        .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
        .map((file) => path.join(dir, file));
    } catch {
      return [];
    }
  }

  async directoryExists(dir) {
    try {
      const stat = await fs.stat(dir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  generateCompositeSpec(category) {
    const services = SERVICE_CATEGORIES[category] || [];
    const categorySpecs = services.filter((service) => this.specs[service]);

    if (categorySpecs.length === 0) {
      console.warn(`No services found for category: ${category}`);
      return null;
    }

    console.log(`Generating ${category} composite API from ${categorySpecs.length} services...`);

    // Start with base OpenAPI structure
    const composite = {
      openapi: '3.0.3',
      info: {
        title: this.getCompositeTitle(category),
        version: '1.0.0',
        description: this.getCompositeDescription(category, categorySpecs),
        termsOfService: 'https://frontal.com/terms',
        contact: {
          name: 'API Support',
          url: 'https://github.com/frontal-labs/openapi/issues',
        },
        license: {
          name: 'Apache-2.0',
          url: 'https://github.com/frontal-labs/openapi/blob/main/LICENSE.md',
        },
      },
      servers: this.generateServers(category),
      tags: this.generateTags(categorySpecs),
      paths: this.generatePaths(categorySpecs),
      components: this.generateComponents(categorySpecs),
    };

    return composite;
  }

  getCompositeTitle(category) {
    const titles = {
      public: 'Frontal Public API',
      internal: 'Frontal Internal API',
      admin: 'Frontal Admin API',
    };
    return titles[category] || `Frontal ${category.charAt(0).toUpperCase() + category.slice(1)} API`;
  }

  getCompositeDescription(category, services) {
    const descriptions = {
      public: 'Public-facing APIs for external developers and applications',
      internal: 'Internal service-to-service communication APIs',
      admin: 'Administrative and management APIs for operators',
    };

    let description = descriptions[category] || `Composite API for ${category} services`;
    description += '\n\n**Included Services:**\n';

    services.forEach((service) => {
      const spec = this.specs[service];
      description += `- **${spec.info?.title || service}**: ${spec.info?.description || 'No description'}\n`;
    });

    description += '\n**Authentication:**\n';
    if (category === 'public') {
      description += '- OAuth 2.0 for user authorization\n';
      description += '- API keys for service authentication\n';
    } else if (category === 'internal') {
      description += '- JWT tokens for service authentication\n';
      description += '- mTLS for secure service communication\n';
    } else if (category === 'admin') {
      description += '- JWT tokens with admin claims\n';
      description += '- API keys with elevated permissions\n';
    }

    return description;
  }

  generateServers(category) {
    const servers = [
      {
        url: category === 'public' ? 'https://api.frontal.dev' : 'https://internal-api.frontal.dev',
        description: 'Production server',
      },
      {
        url: category === 'public' ? 'https://staging-api.frontal.dev' : 'https://staging-internal-api.frontal.dev',
        description: 'Staging server',
      },
    ];

    if (category !== 'public') {
      servers.push({
        url: 'http://localhost:8080',
        description: 'Development server',
      });
    }

    return servers;
  }

  generateTags(services) {
    const tags = [];
    const tagSet = new Set();

    services.forEach((service) => {
      const spec = this.specs[service];
      if (spec.tags) {
        spec.tags.forEach((tag) => {
          const tagKey = tag.name.toLowerCase();
          if (!tagSet.has(tagKey)) {
            tagSet.add(tagKey);
            tags.push({
              ...tag,
              'x-service': service,
            });
          }
        });
      }
    });

    return tags.sort((a, b) => a.name.localeCompare(b.name));
  }

  generatePaths(services) {
    const paths = {};
    const pathSet = new Set();

    services.forEach((service) => {
      const spec = this.specs[service];
      if (spec.paths) {
        Object.entries(spec.paths).forEach(([path, pathItem]) => {
          // Prefix paths with service name to avoid conflicts
          const prefixedPath = `/v1/${service}${path}`;

          if (!pathSet.has(prefixedPath)) {
            pathSet.add(prefixedPath);
            paths[prefixedPath] = { ...pathItem };

            // Add service information to operations
            Object.keys(pathItem).forEach((method) => {
              if (pathItem[method].tags) {
                pathItem[method].tags = pathItem[method].tags.map((tag) => `${service}:${tag}`);
              }
              pathItem[method]['x-service'] = service;
            });
          } else {
            console.warn(`Path conflict: ${prefixedPath} already exists`);
          }
        });
      }
    });

    return paths;
  }

  generateComponents(services) {
    const components = {
      schemas: {},
      securitySchemes: {},
      responses: {},
      parameters: {},
      headers: {},
    };

    // Merge shared schemas first
    Object.entries(this.schemas).forEach(([name, schema]) => {
      if (schema.components) {
        Object.entries(schema.components).forEach(([componentType, componentItems]) => {
          if (components[componentType]) {
            Object.assign(components[componentType], componentItems);
          }
        });
      }
    });

    // Merge service components
    services.forEach((service) => {
      const spec = this.specs[service];
      if (spec.components) {
        Object.entries(spec.components).forEach(([componentType, componentItems]) => {
          if (components[componentType]) {
            // Prefix component names with service to avoid conflicts
            Object.entries(componentItems).forEach(([name, item]) => {
              const prefixedName = `${service}-${name}`;
              if (!components[componentType][prefixedName]) {
                components[componentType][prefixedName] = {
                  ...item,
                  'x-service': service,
                };
              }
            });
          }
        });
      }
    });

    return components;
  }

  async saveCompositeSpec(category, spec) {
    if (!spec) return;

    await this.ensureDirectoryExists(COMPOSITE_DIR);

    const filename = `${category}-api.yaml`;
    const filepath = path.join(COMPOSITE_DIR, filename);

    const yamlContent = yaml.dump(spec, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });

    await fs.writeFile(filepath, yamlContent, 'utf8');
    console.log(`Generated ${filename}`);
  }

  async ensureDirectoryExists(dir) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async generateAll() {
    console.log('Generating composite specifications...\n');

    await this.loadAllSpecs();

    const categories = Object.keys(SERVICE_CATEGORIES);
    let generatedCount = 0;

    for (const category of categories) {
      const spec = this.generateCompositeSpec(category);
      if (spec) {
        await this.saveCompositeSpec(category, spec);
        generatedCount++;
      }
    }

    console.log(`\nGenerated ${generatedCount} composite specifications:`);
    categories.forEach((category) => {
      const filepath = path.join(COMPOSITE_DIR, `${category}-api.yaml`);
      console.log(`  - ${filepath}`);
    });
  }

  async generateSingle(category) {
    console.log(`Generating ${category} composite specification...\n`);

    await this.loadAllSpecs();

    const spec = this.generateCompositeSpec(category);
    if (spec) {
      await this.saveCompositeSpec(category, spec);
      console.log(`Generated ${category}-api.yaml`);
      return true;
    }
    console.error(`Failed to generate ${category} composite specification`);
    return false;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const generator = new CompositeGenerator();

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node generate-composite.js [options]

Options:
  --all, -a        Generate all composite specifications (default)
  --category, -c   Generate specific category (internal, admin)
  --help, -h       Show this help message

Categories:
  internal        Internal service APIs
  admin           Administrative APIs

Note:
  Public API is generated by scripts/sync-public-from-frontal.js

Examples:
  node generate-composite.js                    # Generate all composites
  node generate-composite.js -c internal        # Generate internal API only
  node generate-composite.js --category admin   # Generate admin API only
`);
    process.exit(0);
  }

  if (args.includes('--category') || args.includes('-c')) {
    const categoryIndex = args.findIndex((arg) => arg === '--category' || arg === '-c');
    const category = args[categoryIndex + 1];

    if (!category) {
      console.error('Category required when using --category flag');
      process.exit(1);
    }

    if (!SERVICE_CATEGORIES[category]) {
      console.error(`Invalid category: ${category}. Valid categories: ${Object.keys(SERVICE_CATEGORIES).join(', ')}`);
      process.exit(1);
    }

    const success = await generator.generateSingle(category);
    process.exit(success ? 0 : 1);
  } else {
    await generator.generateAll();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Generation failed:', error);
    process.exit(1);
  });
}

module.exports = CompositeGenerator;
