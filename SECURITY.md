# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.2   | :white_check_mark: |
| 0.0.1   | :x:                |

## Security Features

### Input Validation and Sanitization
This action implements comprehensive input validation to prevent security vulnerabilities:

- **Command Injection Prevention**: All inputs are sanitized to remove dangerous characters (`;`, `|`, `&`, `` ` ``, `$`)
- **Port Validation**: Port numbers are validated to be within the valid range (1-65535)
- **Path Validation**: SQL file paths are validated to prevent directory traversal attacks
- **Type Validation**: All inputs are type-checked to ensure they match expected formats

### Secure Data Handling
- **Sensitive Data Protection**: Database passwords and other sensitive information should be passed via GitHub Secrets, not direct inputs
- **Temporary File Management**: Configuration files are created in secure temporary directories and automatically cleaned up
- **No Hardcoded Credentials**: The action does not contain any hardcoded database credentials

### Error Handling
- **Information Disclosure Prevention**: Error messages are sanitized to prevent sensitive information leakage
- **Graceful Degradation**: The action fails safely when encountering security issues
- **Comprehensive Logging**: Security events are logged appropriately without exposing sensitive data

## Reporting a Vulnerability

If you discover a security vulnerability in this action, please report it responsibly:

1. **DO NOT** create a public GitHub issue
2. **DO NOT** disclose the vulnerability publicly until it has been addressed
3. Please contact the maintainer privately with details of the vulnerability
4. Include steps to reproduce the issue
5. Provide any relevant code or configuration examples

### What to Include in Your Report
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested mitigation strategies (if any)
- Your contact information for follow-up

## Security Best Practices

### For Users
1. **Use GitHub Secrets**: Store database passwords and other sensitive data in GitHub Secrets, not in workflow files
2. **Validate Inputs**: Always validate SQL file paths and other inputs before using this action
3. **Regular Updates**: Keep the action version updated to receive security patches
4. **Review Permissions**: Ensure the action has only the minimum required permissions

### Example Secure Usage
```yaml
- name: SQL Lint
  uses: Bidaya0/sql-lint-in-action@v0.0.2
  with:
    path: './sql/'
    host: ${{ secrets.DB_HOST }}
    user: ${{ secrets.DB_USER }}
    password: ${{ secrets.DB_PASSWORD }}
    driver: 'mysql'
    port: 3306
```

### Example Insecure Usage (DO NOT DO THIS)
```yaml
- name: SQL Lint
  uses: Bidaya0/sql-lint-in-action@v0.0.2
  with:
    path: './sql/'
    host: 'localhost'
    user: 'root'
    password: 'mypassword123'  # ❌ Never hardcode passwords
    driver: 'mysql'
    port: 3306
```

## Security Considerations

### Network Security
- The action connects to databases using standard SQL protocols
- Ensure your database server is properly secured and accessible only from trusted sources
- Consider using VPN or private networks for database connections in production

### File System Security
- The action creates temporary configuration files in the system's temporary directory
- These files are automatically cleaned up after execution
- Ensure the GitHub Actions runner has appropriate file system permissions

### Dependency Security
- All dependencies are regularly updated to address security vulnerabilities
- The action uses npm audit to check for known security issues
- Dependencies are pinned to specific versions to ensure reproducible builds

## Security Updates

Security updates will be released as patch versions (e.g., 0.0.2 → 0.0.3) and will include:
- Security vulnerability fixes
- Dependency updates for security patches
- Enhanced input validation
- Improved error handling

## Compliance

This action is designed to help with compliance requirements by:
- Providing secure SQL linting capabilities
- Implementing proper input validation
- Following security best practices
- Maintaining audit trails through GitHub Actions logs
