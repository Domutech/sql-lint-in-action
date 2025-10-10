/**
 * @class       : index
 * @author      : bidaya0 (bidaya0@00-1E-10-1F-00-00)
 * @created     : 星期二 1月 04, 2022 01:35:11 CST
 * @description : index
 */


import * as core from '@actions/core';
import * as github from '@actions/github';
import { execSync } from 'child_process';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import os from 'os';
import minimist from 'minimist';

// Parse CLI args like: node index.js --path ./test.sql --host localhost
const argv = minimist(process.argv.slice(2));

// Global verbose flag
let isVerbose = false;

// Verbose logging helper
function verboseLog(message) {
  if (isVerbose) {
    core.info(`[VERBOSE] ${message}`);
  }
}

// Safe output setter - handles local testing
function safeSetOutput(name, value) {
  try {
    core.setOutput(name, value);
    verboseLog(`Output set: ${name} = ${value}`);
  } catch (error) {
    // When running locally, core.setOutput might fail
    console.log(`OUTPUT: ${name}=${value}`);
    verboseLog(`Local output: ${name} = ${value}`);
  }
}
// Input validation and sanitization
function validateInput(input, name, type = 'string') {
  if (typeof input !== type) {
    throw new Error(`Invalid ${name}: expected ${type}`);
  }
  if (type === 'string' && typeof input === 'string') {
    // Sanitize input to prevent command injection
    if (input.includes(';') || input.includes('|') || input.includes('&') || input.includes('`') || input.includes('$')) {
      throw new Error(`Invalid characters in ${name}: potential command injection detected`);
    }
  }
  return input;
}

function validatePort(port) {
  const portNum = parseInt(port);
  if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
    throw new Error('Invalid port: must be a number between 1 and 65535');
  }
  return portNum;
}

function initconfig(host, user, password, driver = 'mysql', port = 3306, ignore_errors = []) {
  verboseLog('Initializing configuration...');
  
  // Validate inputs
  host = validateInput(host, 'host');
  user = validateInput(user, 'user');
  password = validateInput(password, 'password');
  driver = validateInput(driver, 'driver');
  port = validatePort(port);
  
  verboseLog(`Database driver: ${driver}, port: ${port}`);
  
  // Validate ignore_errors array
  if (!Array.isArray(ignore_errors)) {
    ignore_errors = [];
  }
  ignore_errors = ignore_errors.map(err => validateInput(err, 'ignore error'));
  
  verboseLog(`Ignore errors: ${ignore_errors.length > 0 ? ignore_errors.join(', ') : 'none'}`);
  
  const config_data = host ? 
    { host, user, password, driver, port, 'ignore-errors': ignore_errors } :
    { driver, port, 'ignore-errors': ignore_errors };
    
  const configPath = path.join(os.tmpdir(), 'sql-lint-config.json');
  writeFileSync(configPath, JSON.stringify(config_data), { flag: 'w', overwrite: true });
  
  verboseLog(`Configuration file created at: ${configPath}`);
  if (isVerbose && !host) {
    verboseLog('Running in local mode (no database connection)');
  } else if (isVerbose && host) {
    verboseLog(`Running with database connection to ${host}:${port}`);
  }
  
  return configPath;
}
function get_runbash(sqlPath, use_database, configPath) {
  // Validate SQL file path
  sqlPath = validateInput(sqlPath, 'SQL file path');
  let cmd;
  if (use_database) {
    cmd= `npx sql-lint "${sqlPath}" --format=json --config="${configPath}"`;
    verboseLog(`Command with database config: ${cmd}`);
  } else {
    cmd =  `npx sql-lint "${sqlPath}" --format=json`;
    verboseLog(`Command without database: ${cmd}`);
  }
  return cmd.trim();
}
function is_use_database(host) {
  return host && host.trim() !== '';
}

function getInputFallback(name, required=false) {
  let value = '';
  // Try to get from core.getInput (standard GitHub Actions input)
  try {
    value = core.getInput(name);
  } catch (e) {
    // If core.getInput throws, it likely means we're not in a GitHub Actions environment
    // or the input is not set via GitHub Actions mechanism.
    // In this case, 'value' remains '' and we proceed to fallbacks.
  }

  // Fallback to command line arguments (e.g., node index.js --path value)
  if (!value && argv[name]) {
    value = argv[name];
  }

  // Fallback to environment variables set directly (e.g., INPUT_PATH=value node index.js)
  // Check for uppercase version first as per GitHub Actions convention
  if (!value && process.env[`INPUT_${name.toUpperCase()}`]) {
    value = process.env[`INPUT_${name.toUpperCase()}`];
  }

  // Fallback to environment variables with original casing (to handle cases like INPUT_path from npm test)
  if (!value && process.env[`INPUT_${name}`]) {
    value = process.env[`INPUT_${name}`];
  }

  if (required && !value) {
      throw new Error(`❌ Missing required input: ${name}`);
  }
  return value;
}

// Cleanup function to remove temporary files
function cleanup(configPath) {
  verboseLog('Cleaning up temporary files...');
  try {
    if (configPath && existsSync(configPath)) {
      unlinkSync(configPath);
      verboseLog(`Removed temporary config file: ${configPath}`);
    }
  } catch (error) {
    core.warning(`Failed to cleanup temporary file: ${error.message}`);
  }
}
async function run() {
  try {
    // Get and validate inputs
    const sqlPath = getInputFallback('path', true) || argv['path'];
    const host = getInputFallback('host') || argv['host'] || '';
    const user = getInputFallback('user') || argv['user'] || '';
    const password = getInputFallback('password') || argv['password'] || '';
    const driver = getInputFallback('driver', false) || argv['driver'] || 'mysql';
    const port = getInputFallback('port', false) || argv['port'] || 3306;
    const ignore_errors = getInputFallback('ignore_errors', false).split(',').filter(x => x !== '');
    const verbose = getInputFallback('verbose', false) || argv['verbose'] || 'false';
    
    // Set global verbose flag
    isVerbose = verbose === 'true' || verbose === true;
    
    verboseLog('Starting sql-lint-in-action...');
    
    // Initialize outputs with default values
    safeSetOutput('result', 'unknown');
    safeSetOutput('errors-found', '0');
    safeSetOutput('linting-target', sqlPath);
    // Don't initialize execution-time here - let it be set only after actual execution

    const useDatabase = is_use_database(host);
    verboseLog(`Database mode: ${useDatabase ? 'enabled' : 'disabled'}`);

    if (useDatabase) {
      if (!user) {
        throw new Error('User is required when host is provided');
      }
      verboseLog(`Input parameters - path: ${sqlPath}, host: ${host || 'none'}, driver: ${driver}, port: ${port}`);
    } else {
      verboseLog(`Input parameters - path: ${sqlPath}, no database use based on empty host`);
    }
    
    // Validate SQL file exists
    if (!existsSync(sqlPath)) {
      throw new Error(`SQL file not found: ${sqlPath}`);
    }
    
    verboseLog(`Running sql-lint on: ${sqlPath}`);
    
    // Initialize configuration
    const configPath = initconfig(host, user, password, driver, port, ignore_errors);
        
    // Run sql-lint using npm package (no sudo, no remote downloads)
    const runCommand = get_runbash(sqlPath, useDatabase, configPath);
    
    verboseLog(`Executing command: ${runCommand}`);
    let startTime = Date.now();
    verboseLog(`Start time: ${startTime}`);
    
    // Execute command synchronously
    let stdout = '';
    let stderr = '';
    let executionError = null;
    
    try {
      stdout = execSync(runCommand, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
      verboseLog('Command executed successfully (exit code 0)');
    } catch (error) {
      // execSync throws on non-zero exit codes, but we still want the output
      executionError = error;
      stdout = error.stdout || '';
      stderr = error.stderr || '';
      verboseLog(`Command failed with exit code ${error.status}, but captured output`);
      verboseLog(`Error stdout length: ${stdout.length}, stderr length: ${stderr.length}`);
    }
    
    // Calculate execution time
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    verboseLog(`End time: ${endTime}, Execution time: ${executionTime}ms`);
    
    // Always cleanup temporary files
    cleanup(configPath);
    
    // Parse sql-lint JSON output to count errors
    let errorCount = 0;
    let sqlLintResults = [];
    
    if (stdout && stdout.trim()) {
      verboseLog(`stdout length: ${stdout.length} characters`);
      verboseLog(`Raw stdout: ${JSON.stringify(stdout)}`);
      
      try {
        // Parse JSON output from sql-lint
        const jsonOutput = JSON.parse(stdout.trim());
        verboseLog(`Parsed JSON output: ${JSON.stringify(jsonOutput, null, 2)}`);
        
        if (Array.isArray(jsonOutput)) {
          // Filter out duplicate entries and entries with empty sources
          const validErrors = jsonOutput.filter(error => {
            return error.source && error.source.trim() !== '';
          });
          
          // Remove duplicates based on source, error, and line
          const uniqueErrors = validErrors.filter((error, index, self) => {
            return index === self.findIndex(e => 
              e.source === error.source && 
              e.error === error.error && 
              e.line === error.line
            );
          });
          
          sqlLintResults = uniqueErrors;
          errorCount = uniqueErrors.length;
          
          verboseLog(`Raw JSON entries: ${jsonOutput.length}`);
          verboseLog(`Valid entries (non-empty source): ${validErrors.length}`);
          verboseLog(`Unique errors after deduplication: ${errorCount}`);
          
          // Log details of each unique error for debugging
          uniqueErrors.forEach((error, index) => {
            verboseLog(`Error ${index + 1}: ${error.error} at line ${error.line} in ${error.source}`);
          });
        } else if (jsonOutput && typeof jsonOutput === 'object') {
          verboseLog('JSON output is a single object, treating as single error');
          sqlLintResults = [jsonOutput];
          errorCount = 1;
        } else {
          verboseLog('Unexpected JSON structure');
          errorCount = 0;
        }
      } catch (parseError) {
        verboseLog(`Failed to parse JSON output: ${parseError.message}`);
        verboseLog(`Attempted to parse: ${stdout.substring(0, 200)}...`);
        verboseLog('Falling back to pattern matching...');
        // Fallback to pattern matching if JSON parsing fails
        const sqlLintMatches = stdout.match(/\[sql-lint: [^\]]+\]/gi) || [];
        errorCount = sqlLintMatches.length;
        verboseLog(`Found ${sqlLintMatches.length} sql-lint errors via pattern matching: ${sqlLintMatches.join(', ')}`);
      }
      
      core.info('sql-lint output:');
      console.log(stdout);
    }
    
    // Log stderr but don't count errors from it (to avoid double counting)
    if (stderr && stderr.trim()) {
      verboseLog(`stderr length: ${stderr.length} characters`);
      verboseLog(`Raw stderr: ${JSON.stringify(stderr)}`);
      core.warning('sql-lint stderr:');
      console.log(stderr);
    }
    
    // Set all outputs
    safeSetOutput('linting-target', sqlPath);
    safeSetOutput('execution-time', executionTime.toString() + ' ms');
    safeSetOutput('errors-found', errorCount.toString());
    
    if (executionError) {
      verboseLog(`Command execution failed: ${executionError.message}`);
      verboseLog(`Parsed results - Errors: ${errorCount}, Time: ${executionTime}ms`);
      safeSetOutput('result', 'failure');
      core.setFailed(`sql-lint execution failed: ${executionError.message}`);
    } else {
      verboseLog('Command executed successfully');
      safeSetOutput('result', 'success');
      verboseLog(`Analysis complete - Errors: ${errorCount}, Time: ${executionTime}ms`);
      verboseLog('sql-lint-in-action completed successfully');
      core.info('sql-lint completed successfully');
    }
    
  } catch (error) {
    safeSetOutput('result', 'failure');
    safeSetOutput('execution-time', '0');
    core.setFailed(`Action failed: ${error.message}`);
  }
}

// Run the function when script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

export { run };
