#! /usr/bin/env node

var todo = process.argv[2];

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

var runner = require('./runner.js');
runner.test(process.env.BROWSERSTACK_JSON || 'browserstack.json', function(err) {
  if(err) {
    console.log(err);
    console.log(err.stack);
    console.log('Invalid Command');
  }
});
