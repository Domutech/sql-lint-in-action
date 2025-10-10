/**
 * @class       : index
 * @author      : bidaya0 (bidaya0@00-1E-10-1F-00-00)
 * @created     : 星期二 1月 04, 2022 01:35:11 CST
 * @description : index
 */


import * as core from '@actions/core';
import * as github from '@actions/github';
import { exec, execSync } from 'child_process';
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
    cmd= `npx sql-lint "${sqlPath}" --config="${configPath}"`;
    verboseLog(`Command with database config: ${cmd}`);
  } else {
    cmd =  `npx sql-lint "${sqlPath}"`;
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
    
    exec(runCommand, (err, stdout, stderr) => {
      // Always cleanup temporary files
      cleanup(configPath);
      
      if (err) {
        verboseLog(`Command execution failed: ${err.message}`);
        core.setFailed(`sql-lint execution failed: ${err.message}`);
        return;
      }
      
      verboseLog('Command executed successfully');
      
      // Log output without sensitive data
      if (stdout) {
        verboseLog(`stdout length: ${stdout.length} characters`);
        core.info('sql-lint output:');
        console.log(stdout);
      }
      
      if (stderr) {
        verboseLog(`stderr length: ${stderr.length} characters`);
        core.warning('sql-lint warnings:');
        console.log(stderr);
      }
      
      verboseLog('sql-lint-in-action completed successfully');
    });
    
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

// Run the function when script is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}

export { run };
