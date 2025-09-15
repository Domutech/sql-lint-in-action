/**
 * @class       : index
 * @author      : bidaya0 (bidaya0@00-1E-10-1F-00-00)
 * @created     : 星期二 1月 04, 2022 01:35:11 CST
 * @description : index
 */


const core = require('@actions/core');
const github = require('@actions/github');
const { exec, execSync } = require('child_process');
const { existsSync, writeFileSync, unlinkSync } = require('fs');
const path = require('path');
const os = require('os');
const minimist = require('minimist');

// Parse CLI args like: node index.js --path ./test.sql --host localhost
const argv = minimist(process.argv.slice(2));
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
  // Validate inputs
  host = validateInput(host, 'host');
  user = validateInput(user, 'user');
  password = validateInput(password, 'password');
  driver = validateInput(driver, 'driver');
  port = validatePort(port);
  
  // Validate ignore_errors array
  if (!Array.isArray(ignore_errors)) {
    ignore_errors = [];
  }
  ignore_errors = ignore_errors.map(err => validateInput(err, 'ignore error'));
  
  const config_data = host ? 
    { host, user, password, driver, port, 'ignore-errors': ignore_errors } :
    { driver, port, 'ignore-errors': ignore_errors };
    
  const configPath = path.join(os.tmpdir(), 'sql-lint-config.json');
  writeFileSync(configPath, JSON.stringify(config_data), { flag: 'w', overwrite: true });
  return configPath;
}
function get_runbash(sqlPath, use_database, configPath) {
  // Validate SQL file path
  sqlPath = validateInput(sqlPath, 'SQL file path');
  let cmd;
  if (use_database) {
    cmd= `npx sql-lint "${sqlPath}" --config="${configPath}"`;
  }
  cmd =  `npx sql-lint "${sqlPath}"`;
  return cmd.trim();
}
function is_use_database(host) {
  return host && host.trim() !== '';
}

function getInputFallback(name, required=false) {
  try {
    value = core.getInput(name) || argv[name] || '';
  } catch (e) {
    value = argv[name] || '';
  }
  if (required && !value) {
      throw new Error(`❌ Missing required input: ${name}`);
  }
  return value;
}

// Cleanup function to remove temporary files
function cleanup(configPath) {
  try {
    if (configPath && existsSync(configPath)) {
      unlinkSync(configPath);
      core.info('Temporary config file cleaned up');
    }
  } catch (error) {
    core.warning(`Failed to cleanup temporary file: ${error.message}`);
  }
}
try {
  // Get and validate inputs
  const sqlPath = getInputFallback('path', true);
  const host = getInputFallback('host');
  const user = getInputFallback('user');
  const password = getInputFallback('password');
  const driver = getInputFallback('driver', false) || 'mysql';
  const port = getInputFallback('port', false) || 3306;
  const ignore_errors = getInputFallback('ignore_errors', false).split(',').filter(x => x !== '');
    
  
  // Validate SQL file exists
  if (!existsSync(sqlPath)) {
    throw new Error(`SQL file not found: ${sqlPath}`);
  }
  
  core.info(`Running sql-lint on: ${sqlPath}`);
  
  // Initialize configuration
  const configPath = initconfig(host, user, password, driver, port, ignore_errors);
  
  const useDatabase = is_use_database(host);
  // Run sql-lint using npm package (no sudo, no remote downloads)
  const runCommand = get_runbash(sqlPath, useDatabase, configPath);
  
  exec(runCommand, (err, stdout, stderr) => {
    // Always cleanup temporary files
    
    cleanup(configPath);
    
    if (err) {
      core.setFailed(`sql-lint execution failed: ${err.message}`);
      return;
    }
    
    // Log output without sensitive data
    if (stdout) {
      core.info('sql-lint output:');
      console.log(stdout);
    }
    
    if (stderr) {
      core.warning('sql-lint warnings:');
      console.log(stderr);
    }
    
    core.info('sql-lint completed successfully');
  });
  
} catch (error) {
  core.setFailed(`Action failed: ${error.message}`);
}
