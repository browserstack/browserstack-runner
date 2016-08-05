#! /usr/bin/env node

var todo = process.argv[2],
  path = require('path'),
  config;

if (todo === '--verbose') {
  global.logLevel = process.env.LOG_LEVEL || 'debug';
} else {
  global.logLevel = 'info';
}

if (todo === 'init') {
  require('./init.js');
  return;
} else if (todo === '--version') {
  require('./version.js');
  return;
}

var config_path = process.env.BROWSERSTACK_JSON || 'browserstack.json';
config_path = path.resolve(path.relative(process.cwd(), config_path));

console.log('Using config:', config_path);
try {
  config = require(config_path);
} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND') {
    console.err('Configuration file `browserstack.json` is missing.');
    throw new Error('Configuration file `browserstack.json` is missing.');
  } else {
    console.err('Invalid configuration in `browserstack.json` file');
    console.err(e.message);
    console.err(e.stack);
    throw new Error('Invalid configuration in `browserstack.json` file');
  }
}

var runner = require('./cli.js');
runner.run(config, function(err) {
  if(err) {
    console.err(err);
    console.err(err.stack);
    console.err('Invalid Command');
    process.exit(1);
  }
  process.exit(0);
});
