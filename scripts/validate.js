#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const SwaggerParser = require('@apidevtools/swagger-parser');

// Configuration
const SPECS_DIR = path.join(__dirname, '../specs');
const SCHEMAS_DIR = path.join(__dirname, '../schemas');
const COMPOSITE_DIR = path.join(__dirname, '../composite');

class ApiValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  async validateFile(filePath) {
    try {
      console.log(`Validating ${path.relative(process.cwd(), filePath)}...`);
      
      // Parse and validate OpenAPI spec
      const api = await SwaggerParser.validate(filePath);
      
      console.log(`✓ ${path.relative(process.cwd(), filePath)} is valid`);
      return true;
    } catch (error) {
      this.errors.push({
        file: filePath,
        message: error.message,
        severity: 'error'
      });
      console.error(`✗ ${path.relative(process.cwd(), filePath)}: ${error.message}`);
      return false;
    }
  }

  async validateDirectory(dirPath, pattern = '*.yaml') {
    const files = await fs.readdir(dirPath);
    const yamlFiles = files.filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
    
    let allValid = true;
    for (const file of yamlFiles) {
      const filePath = path.join(dirPath, file);
      const isValid = await this.validateFile(filePath);
      allValid = allValid && isValid;
    }
    
    return allValid;
  }

  async validateAll() {
    console.log('🔍 Validating all OpenAPI specifications...\n');
    
    let allValid = true;
    
    // Validate individual specs
    if (await this.directoryExists(SPECS_DIR)) {
      const specsValid = await this.validateDirectory(SPECS_DIR);
      allValid = allValid && specsValid;
    }
    
    // Validate schemas
    if (await this.directoryExists(SCHEMAS_DIR)) {
      const schemasValid = await this.validateDirectory(SCHEMAS_DIR);
      allValid = allValid && schemasValid;
    }
    
    // Validate composite specs
    if (await this.directoryExists(COMPOSITE_DIR)) {
      const compositeValid = await this.validateDirectory(COMPOSITE_DIR);
      allValid = allValid && compositeValid;
    }
    
    // Print results
    this.printResults();
    
    return allValid;
  }

  async validateService(serviceName) {
    const servicePath = path.join(SPECS_DIR, `${serviceName}.yaml`);
    
    try {
      await fs.access(servicePath);
      return await this.validateFile(servicePath);
    } catch (error) {
      console.error(`❌ Service spec not found: ${servicePath}`);
      return false;
    }
  }

  async checkReferences() {
    console.log('🔗 Checking for unresolved references...\n');
    
    const specFiles = await this.getAllSpecFiles();
    let hasUnresolvedRefs = false;
    
    for (const filePath of specFiles) {
      try {
        const api = await bundleAndDereference(filePath);
        console.log(`✓ References resolved in ${path.relative(process.cwd(), filePath)}`);
      } catch (error) {
        this.errors.push({
          file: filePath,
          message: `Unresolved reference: ${error.message}`,
          severity: 'error'
        });
        console.error(`✗ Unresolved reference in ${path.relative(process.cwd(), filePath)}: ${error.message}`);
        hasUnresolvedRefs = true;
      }
    }
    
    return !hasUnresolvedRefs;
  }

  async getAllSpecFiles() {
    const files = [];
    
    if (await this.directoryExists(SPECS_DIR)) {
      const specFiles = await fs.readdir(SPECS_DIR);
      files.push(...specFiles.filter(f => f.endsWith('.yaml') || f.endsWith('.yml')).map(f => path.join(SPECS_DIR, f)));
    }
    
    if (await this.directoryExists(SCHEMAS_DIR)) {
      const schemaFiles = await fs.readdir(SCHEMAS_DIR);
      files.push(...schemaFiles.filter(f => f.endsWith('.yaml') || f.endsWith('.yml')).map(f => path.join(SCHEMAS_DIR, f)));
    }
    
    if (await this.directoryExists(COMPOSITE_DIR)) {
      const compositeFiles = await fs.readdir(COMPOSITE_DIR);
      files.push(...compositeFiles.filter(f => f.endsWith('.yaml') || f.endsWith('.yml')).map(f => path.join(COMPOSITE_DIR, f)));
    }
    
    return files;
  }

  async directoryExists(dirPath) {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  printResults() {
    console.log('\n📊 Validation Results:');
    console.log('====================');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All specifications are valid!');
    } else {
      if (this.errors.length > 0) {
        console.log(`\n❌ Errors (${this.errors.length}):`);
        this.errors.forEach(error => {
          console.log(`  ${path.relative(process.cwd(), error.file)}: ${error.message}`);
          if (error.path) {
            console.log(`    Path: ${error.path}`);
          }
        });
      }
      
      if (this.warnings.length > 0) {
        console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
        this.warnings.forEach(warning => {
          console.log(`  ${path.relative(process.cwd(), warning.file)}: ${warning.message}`);
          if (warning.path) {
            console.log(`    Path: ${warning.path}`);
          }
        });
      }
    }
    
    console.log(`\nTotal: ${this.errors.length} errors, ${this.warnings.length} warnings`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const validator = new ApiValidator();
  
  let success = true;
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node validate.js [options]

Options:
  --all, -a        Validate all specifications (default)
  --service, -s    Validate specific service
  --refs, -r       Check for unresolved references
  --help, -h       Show this help message

Examples:
  node validate.js                    # Validate all specs
  node validate.js --service auth     # Validate auth service only
  node validate.js --refs            # Check references only
  node validate.js --all --refs      # Validate all and check references
`);
    process.exit(0);
  }
  
  if (args.includes('--service') || args.includes('-s')) {
    const serviceIndex = args.findIndex(arg => arg === '--service' || arg === '-s');
    const serviceName = args[serviceIndex + 1];
    
    if (!serviceName) {
      console.error('❌ Service name required when using --service flag');
      process.exit(1);
    }
    
    success = await validator.validateService(serviceName);
  } else {
    success = await validator.validateAll();
  }
  
  if (args.includes('--refs') || args.includes('-r')) {
    const refsValid = await validator.checkReferences();
    success = success && refsValid;
  }
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = ApiValidator;
