#! /usr/bin/env node

var fs = require('fs');
var preset = require('./runner').preset;
var path = require('./runner').path;
var browsers = require('../presets/' + preset + '.json');

var config = {
  username: 'BROWSERSTACK_USERNAME',
  key: 'BROWSERSTACK_KEY',
  test_path: path || 'path/to/test/runner',
  browsers: browsers
};

var configString = JSON.stringify(config, null, 4);

fs.writeFile('browserstack.json', configString, function (err) {
  if (err) {
    console.log('Failed to generate `browserstack.json`', err);
    return;
  }
  console.log('Generated `browserstack.json` using preset "%s" having %d browsers.',
              preset, browsers.length);
});
