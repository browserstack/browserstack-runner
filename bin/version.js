#! /usr/bin/env node

packagePath = require('path').resolve(__dirname, "../package.json");
packageJson = require(packagePath);
console.log("BrowserstackRunner @", packageJson["version"]);
