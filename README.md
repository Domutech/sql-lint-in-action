# sql-lint-in-action

![GitHub release (latest by date)](https://img.shields.io/github/v/release/bidaya0/sql-lint-in-action?style=flat-square)
![GitHub commit activity (branch)](https://img.shields.io/github/commit-activity/w/bidaya0/sql-lint-in-action/main?style=flat-square)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/joereynolds/sql-lint?style=flat-square)
![Security](https://img.shields.io/badge/security-enhanced-green?style=flat-square)

A GitHub Action for SQL linting with comprehensive input validation and security features. This action uses [sql-lint](https://github.com/joereynolds/sql-lint) to check your SQL scripts.

## 🔒 Security Features

- **Input Validation**: All inputs are sanitized to prevent command injection attacks
- **Secure Data Handling**: Sensitive data should be passed via GitHub Secrets
- **Temporary File Cleanup**: Automatic cleanup of configuration files
- **Port Validation**: Strict validation of port numbers (1-65535)

## 📚 Documentation

- [**CHANGELOG.md**](CHANGELOG.md) - Version history and changes
- [**SECURITY.md**](SECURITY.md) - Security policy and best practices
- [**DEVELOPMENT.md**](DEVELOPMENT.md) - Development guide and architecture

## Inputs

## `path`

**Required** The path of sqlfile. Default `"."`.

## `host`

**optional** The host of your database. Default `""`.

Setting of this parameter enables database connection for more advanced linting.

This enables requirements for the below parameters:

- `user` has a default value of `"root"`
- `password` has a default value of `""`
- `driver` has a default value of `"mysql"`
- `port` has a default value of `3306`

## `user`

**optional** The user of your database. Default `"root"`.

## `password`

**optional** The password of your database. Default `""`.

## `port`

**optional** The port of your database. Default `3306`.

## `driver`

**optional** The driver of your database. Accepted ones are `"mysql"` and `"postgres"`. Default `"mysql"`.

## `ignore_errors`

Comma-separated list of errors to ignore. Default `""`.

**Example:** `"missing-where,trailing-whitespace"`

## `verbose`

**optional** Enable verbose logging. Default `"false"`.

Set to `"true"` to enable detailed logging for debugging purposes.

## Example Usage

### Basic Usage

```yaml
- name: SQL Lint
  uses: Bidaya0/sql-lint-in-action@v0.0.2
  with:
    path: './sql/'
```

### With Verbose Output

```yaml
- name: SQL Lint
  uses: Bidaya0/sql-lint-in-action@v0.0.2
  with:
    path: './sql/'
    verbose: 'true'
```

### With Database Connection

```yaml
- name: SQL Lint with Database
  uses: Bidaya0/sql-lint-in-action@v0.0.2
  with:
    path: './sql/'
    host: ${{ secrets.DB_HOST }}
    user: ${{ secrets.DB_USER }}
    password: ${{ secrets.DB_PASSWORD }}
    driver: 'mysql'
    port: 3306
    ignore_errors: 'missing-where,trailing-whitespace'
```

### CLI Usage

```bash
node index.js --path ./test/test.sql --host localhost --user root --password secret --ignore_errors "missing-where"
```

## Development

### Testing

```bash
npm run test
```

### Building

```bash
npm run build
```

Testing the built version:

```bash
npm run testbuild
```

## 🔐 Security Best Practices

- **Use GitHub Secrets** for sensitive data like passwords and database hosts
- **Validate SQL file paths** before using this action
- **Keep the action updated** to receive security patches
- **Review permissions** to ensure minimum required access

See [SECURITY.md](SECURITY.md) for detailed security guidelines.
