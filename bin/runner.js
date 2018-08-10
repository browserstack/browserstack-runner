#! /usr/bin/env node

var yargs = require('yargs')
  .command('init [preset] [path]', 'initialise browserstack.json with preset and test runner path', function(yargs) {
    return yargs.option('preset', {
      type: 'string',
      default: 'default',
      description: 'name of preset json file(without extension)(present in node_modules/browserstack-runner/presets to be used while initiating'
    })
    .option('path', {
      type: 'string',
      default: '/path/to/test/runner',
      description: 'path to test runner to be inserted in browserstack.json'
    })
  })
  .option('browsers', {
    alias: 'b',
    type: 'array',
    description: 'list of space separatedbrowsers keys as described in json file'
  })
  .option('path', {
    type: 'string',
    description: 'path to test file'
  })
  .option('version', {
    alias: 'V',
    description: 'browserstack-runner version'
  })
  .option('pid', {
    type: 'string',
    description: 'path to pid file'
  })
  .option('verbose', {
    alias: 'v',
    description: 'verbose logging'
  }).argv;

if (yargs['verbose']) {
  global.logLevel = process.env.LOG_LEVEL || 'debug';
} else {
  global.logLevel = 'info';
}
var path = require('path'),
  config;

if(yargs['_'].indexOf('init') !== -1) {
  module.exports.preset = yargs['preset'];
  module.exports.path = yargs['path'];
  require('./init.js');
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
if(yargs['pid']) {
  if(yargs['pid'].length > 0) {
    config.tunnel_pid_file = yargs['pid'];
  } else {
    console.error('Error while parsing flag --pid. Usage: --pid=/path/to/file');
  }
}

// filter browsers according to from command line arguments
if(yargs['browsers']) {
  if(yargs['browsers'].length > 0) {
    config.browsers = config.browsers.filter( function(browser) {
      return yargs['browsers'].indexOf(browser['cli_key']) !== -1;
    });
  } else {
    console.error('No browser keys specified. Usage --browsers <key1> <key2> ...');
  }
}

// test file path from cli arguments
config.test_path = yargs['path'] || config.test_path;

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
