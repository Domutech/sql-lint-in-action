# Development Guide

## Overview

This GitHub Action provides secure SQL linting capabilities using the `sql-lint` package. It supports both GitHub Actions and CLI usage with comprehensive security features and input validation.

## Architecture

### Core Components

1. **Input Validation Module** (`validateInput`, `validatePort`)
   - Sanitizes all user inputs to prevent command injection
   - Validates data types and ranges
   - Ensures security compliance

2. **Configuration Management** (`initconfig`)
   - Creates temporary JSON configuration files
   - Handles database connection parameters
   - Manages error ignore lists

3. **Command Execution** (`get_runbash`)
   - Constructs secure command strings
   - Handles database connection logic
   - Manages sql-lint execution

4. **Cleanup Management** (`cleanup`)
   - Removes temporary files
   - Ensures no sensitive data remains on disk
   - Handles cleanup errors gracefully

## Development Setup

### Prerequisites
- Node.js 20.0.0 or higher
- npm or yarn package manager
- Git

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd sql-lint-in-action

# Install dependencies
npm install

# Verify installation
npm run lint
```

### Project Structure
```
sql-lint-in-action/
├── action.yml          # GitHub Action metadata
├── index.js            # Main action code
├── package.json        # Node.js dependencies and scripts
├── README.md           # User documentation
├── CHANGELOG.md        # Version history
├── SECURITY.md         # Security policy
├── DEVELOPMENT.md      # This file
├── test/               # Test SQL files
│   ├── test.sql
│   └── test1.sql
└── dist/               # Compiled output
    ├── index.js
    └── licenses.txt
```

## Development Workflow

### Local Testing

1. **Test with CLI arguments:**
```bash
node index.js --path ./test/test.sql --host localhost --user root --password secret
```

2. **Test without database connection:**
```bash
node index.js --path ./test/test.sql
```

3. **Test with ignore errors:**
```bash
node index.js --path ./test/test.sql --ignore_errors "missing-where,trailing-whitespace"
```

### GitHub Actions Testing

1. **Create a test workflow:**
```yaml
name: Test SQL Lint Action
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Test SQL Lint
        uses: ./  # Use local action
        with:
          path: './test/test.sql'
```

2. **Test with secrets:**
```yaml
- name: Test with Database
  uses: ./  # Use local action
  with:
    path: './test/test.sql'
    host: ${{ secrets.DB_HOST }}
    user: ${{ secrets.DB_USER }}
    password: ${{ secrets.DB_PASSWORD }}
```

## Code Standards

### Security Requirements
- All user inputs MUST be validated using `validateInput()`
- Port numbers MUST be validated using `validatePort()`
- Temporary files MUST be cleaned up using `cleanup()`
- Sensitive data MUST NOT be logged or exposed in error messages

### Code Style
- Use descriptive variable names
- Add comments for complex logic
- Follow JavaScript best practices
- Handle all error cases gracefully

### Testing Requirements
- Test all input validation scenarios
- Test error handling paths
- Test cleanup functionality
- Test both CLI and GitHub Actions usage

## Adding New Features

### 1. Input Parameters
To add a new input parameter:

1. **Update `action.yml`:**
```yaml
inputs:
  new_parameter:
    description: 'Description of the new parameter'
    required: false
    default: 'default_value'
```

2. **Add to `index.js`:**
```javascript
const newParameter = getInputFallback('new_parameter', false) || 'default_value';
```

3. **Add validation if needed:**
```javascript
newParameter = validateInput(newParameter, 'new parameter');
```

### 2. New Database Drivers
To add support for a new database driver:

1. **Update validation:**
```javascript
function validateDriver(driver) {
  const validDrivers = ['mysql', 'postgres', 'new_driver'];
  if (!validDrivers.includes(driver)) {
    throw new Error(`Invalid driver: must be one of ${validDrivers.join(', ')}`);
  }
  return driver;
}
```

2. **Update configuration:**
```javascript
const config_data = {
  host, user, password, 
  driver: validateDriver(driver), 
  port, 
  'ignore-errors': ignore_errors
};
```

### 3. New Linting Options
To add new sql-lint options:

1. **Add input parameter** (see above)
2. **Update command construction:**
```javascript
function get_runbash(sqlPath, use_database, configPath, newOption) {
  let cmd = `npx sql-lint "${sqlPath}"`;
  
  if (use_database) {
    cmd += ` --config="${configPath}"`;
  }
  
  if (newOption) {
    cmd += ` --new-option="${newOption}"`;
  }
  
  return cmd.trim();
}
```

## Debugging

### Enable Debug Logging
```javascript
// Add at the top of index.js
process.env.DEBUG = 'true';

// Add debug logging
if (process.env.DEBUG) {
  console.log('Debug: Command to execute:', runCommand);
  console.log('Debug: Config data:', config_data);
}
```

### Common Issues

1. **Permission Denied Errors**
   - Ensure the action has proper file system permissions
   - Check that temporary directories are writable

2. **Database Connection Issues**
   - Verify database credentials
   - Check network connectivity
   - Ensure database server is running

3. **SQL Lint Errors**
   - Check SQL file syntax
   - Verify file paths are correct
   - Review ignore_errors configuration

## Release Process

### 1. Update Version
```bash
# Update package.json version
npm version patch  # or minor, major

# Update action.yml if needed
```

### 2. Test Release
```bash
# Run all tests
npm run lint
npm run security-audit

# Test locally
node index.js --path ./test/test.sql
```

### 3. Create Release
```bash
# Create git tag
git tag v0.0.3
git push origin v0.0.3

# Create GitHub release with changelog
```

### 4. Update Documentation
- Update CHANGELOG.md
- Update README.md if needed
- Update SECURITY.md if security changes

## Contributing

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make changes following code standards
4. Add tests for new functionality
5. Update documentation
6. Submit pull request with detailed description

### Code Review Checklist
- [ ] Security: All inputs validated and sanitized
- [ ] Error Handling: All error cases handled gracefully
- [ ] Documentation: Code is well-documented
- [ ] Testing: New functionality is tested
- [ ] Cleanup: Temporary files are properly cleaned up
- [ ] Performance: No unnecessary operations or memory leaks

## Dependencies

### Core Dependencies
- `@actions/core`: GitHub Actions core functionality
- `@actions/github`: GitHub API integration
- `minimist`: CLI argument parsing
- `sql-lint`: SQL linting engine

### Development Dependencies
- Node.js 20.0.0+
- npm or yarn

### Security Considerations
- All dependencies are regularly audited
- Dependencies are pinned to specific versions
- Security updates are applied promptly
