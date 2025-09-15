# Changelog

All notable changes to this project will be documented in this file.

## [0.0.2] - Current Version

### Added
- **Security Enhancements**
  - Input validation and sanitization to prevent command injection attacks
  - Port validation (1-65535 range)
  - SQL file path validation
  - Temporary file cleanup functionality
  - Secure handling of sensitive data (passwords, hosts)

- **New Features**
  - Support for `ignore_errors` parameter to skip specific linting errors
  - Enhanced error handling with descriptive error messages
  - Support for both GitHub Actions and CLI usage
  - Database connection configuration via JSON config file
  - Support for MySQL and PostgreSQL drivers

- **Code Quality**
  - Comprehensive input validation functions
  - Proper error handling and logging
  - Cleanup of temporary configuration files
  - Support for Node.js 20+ (updated from previous versions)

### Changed
- **Dependencies**
  - Updated to use `@actions/core` v1.10.1
  - Updated to use `@actions/github` v6.0.0
  - Added `minimist` for CLI argument parsing
  - Updated `sql-lint` to v0.0.19

- **Configuration**
  - Enhanced action.yml with better descriptions
  - Added security warnings for sensitive data
  - Improved input parameter documentation

### Security
- **Input Sanitization**: All user inputs are now validated and sanitized to prevent command injection
- **Temporary File Management**: Secure creation and cleanup of configuration files
- **Error Handling**: Comprehensive error handling prevents information leakage
- **Port Validation**: Strict validation of port numbers to prevent invalid configurations

## [0.0.1] - Previous Version

### Initial Features
- Basic SQL linting functionality
- Support for MySQL database connections
- Simple path-based SQL file processing
- Basic GitHub Action integration

### Known Issues (Fixed in 0.0.2)
- No input validation (security risk)
- No temporary file cleanup
- Limited error handling
- No support for error ignoring
- No CLI usage support
