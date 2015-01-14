#! /usr/bin/env node

var packagePath = require('path').resolve(__dirname, '../package.json'),
    packageJson = require(packagePath);
console.log('browserstack-runner @', packageJson['version']);
