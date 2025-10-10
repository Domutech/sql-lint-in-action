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

## Outputs

The action provides the following outputs that can be used in subsequent workflow steps:

- **`result`**: The result of the sql-lint check (`success` or `failure`)
- **`errors-found`**: Number of SQL errors found
- **`warnings-found`**: Number of SQL warnings found  
- **`linted-file`**: The path of the file that was linted
- **`execution-time`**: Time taken to execute sql-lint in milliseconds

## Example Usage

### Basic Usage

```yaml
- name: SQL Lint
  uses: Domutech/sql-lint-in-action@v1.0.0
  with:
    path: './sql/test.sql'
```

### With Verbose Output

```yaml
- name: SQL Lint
  uses: Domutech/sql-lint-in-action@v1.0.0
  with:
    path: './sql/test.sql'
    verbose: 'true'
```

### With Database Connection

```yaml
- name: SQL Lint with Database
  uses: Domutech/sql-lint-in-action@v1.0.0
  with:
    path: './sql/test.sql'
    host: ${{ secrets.DB_HOST }}
    user: ${{ secrets.DB_USER }}
    password: ${{ secrets.DB_PASSWORD }}
    driver: 'mysql'
    port: 3306
    ignore_errors: 'missing-where,trailing-whitespace'
```

### Using Outputs in Workflows

```yaml
name: SQL Quality Check

on: [push, pull_request]

jobs:
  sql-lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run SQL Lint
        id: sql-lint
        uses: Domutech/sql-lint-in-action@v1.0.0
        with:
          path: './database/migrations/001_create_users.sql'
          verbose: 'true'
          ignore_errors: 'trailing-whitespace'

      - name: Display Results
        run: |
          echo "Lint Result: ${{ steps.sql-lint.outputs.result }}"
          echo "Errors Found: ${{ steps.sql-lint.outputs.errors-found }}"
          echo "Warnings Found: ${{ steps.sql-lint.outputs.warnings-found }}"
          echo "File Linted: ${{ steps.sql-lint.outputs.linted-file }}"
          echo "Execution Time: ${{ steps.sql-lint.outputs.execution-time }}ms"

      - name: Comment PR with Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## SQL Lint Results 📊
              
              - **Result**: ${{ steps.sql-lint.outputs.result }}
              - **Errors**: ${{ steps.sql-lint.outputs.errors-found }}
              - **Warnings**: ${{ steps.sql-lint.outputs.warnings-found }}
              - **File**: ${{ steps.sql-lint.outputs.linted-file }}
              - **Execution Time**: ${{ steps.sql-lint.outputs.execution-time }}ms`
            })

      - name: Fail workflow if errors found
        if: steps.sql-lint.outputs.errors-found != '0'
        run: |
          echo "❌ SQL errors found: ${{ steps.sql-lint.outputs.errors-found }}"
          exit 1

      - name: Performance Check
        if: steps.sql-lint.outputs.execution-time > '5000'
        run: |
          echo "⚠️ SQL linting took longer than expected: ${{ steps.sql-lint.outputs.execution-time }}ms"
```

### Multiple SQL Files

```yaml
- name: Lint Multiple SQL Files  
  strategy:
    matrix:
      sql-file: 
        - './sql/schema.sql'
        - './sql/migrations/001_users.sql'
        - './sql/migrations/002_posts.sql'
  steps:
    - name: Lint ${{ matrix.sql-file }}
      id: lint-${{ strategy.job-index }}
      uses: Domutech/sql-lint-in-action@v1.0.0
      with:
        path: ${{ matrix.sql-file }}
        verbose: 'true'
```

### With Database Testing

```yaml
- name: SQL Lint with Database Validation
  uses: Domutech/sql-lint-in-action@v1.0.0
  with:
    path: './sql/test.sql'
    host: 'localhost'
    user: 'test_user'
    password: ${{ secrets.DB_PASSWORD }}
    driver: 'postgres'
    port: 5432
    verbose: 'true'
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
