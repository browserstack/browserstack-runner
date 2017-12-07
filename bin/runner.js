#! /usr/bin/env node

var todo = process.argv[2],
  path = require('path'),
  config;

if (process.argv.indexOf('--verbose') !== -1) {
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
    console.error('Configuration file `browserstack.json` is missing.');
    throw new Error('Configuration file `browserstack.json` is missing.');
  } else {
    console.error('Invalid configuration in `browserstack.json` file');
    console.error(e.message);
    console.error(e.stack);
    throw new Error('Invalid configuration in `browserstack.json` file');
  }
}

// extract a path to file to store tunnel pid
var pid = process.argv.find(function (param) { return param.indexOf('--pid') !== -1; });

if (pid) {
  var extracted_path = /--pid=([\w\/\.-]+)/g.exec(pid);
  if (extracted_path) {
    config.tunnel_pid_file = extracted_path[1];
  } else {
    console.error('Error while parsing flag --pid. Usage: --pid=/path/to/file');
  }
}

var runner = require('./cli.js');
runner.run(config, function(err) {
  if(err) {
    if (err.name === 'TestsFailedError') {
      console.error('Exit with fail due to some tests failure.');
    } else {
      console.error(err);
      console.error(err.stack);
      console.error('Invalid Command');
    }
    process.exit(1);
  }
  process.exit(0);
});
