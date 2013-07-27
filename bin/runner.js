#! /usr/bin/env node

var program = require('commander'),
    exec = require('child_process').exec,
    BrowserStack = require('browserstack'),
    fs = require('fs'),
    server = require('../lib/server').server;

var serverPort = 8888;


try {
  var config = require(process.cwd() + '/browserstack');
}

catch (e) {
  if (e.code == 'MODULE_NOT_FOUND') {
    console.log('Configuration file `browserstack.json` is missing.');
  } else {
    throw(e);
  }

  process.exit();
}

var client = BrowserStack.createClient({
  username: config.username,
  password: config.key
});

var pid_file = process.cwd() + '/browserstack-run.pid';
fs.writeFileSync(pid_file, process.pid, 'utf-8')

var cleanUp = function cleanUp () {
  console.log("Exiting");
  fs.unlink(pid_file);
  server.close();
};

process.on('exit', cleanUp);
process.on('SIGTERM', cleanUp);

console.log("Launching server..");
server.listen(parseInt(serverPort, 10));
console.log("Tunneling..");

var tunnelCommand = 'java -jar ~/.browserstack/BrowserStackTunnel.jar ';
tunnelCommand += config.key + ' ';
tunnelCommand += 'localhost' + ',';
tunnelCommand += serverPort.toString() + ',';
tunnelCommand += '0';

var workers = [];

exec(tunnelCommand, function () {
  console.log(arguments);
});

setTimeout(function () {
  config.browsers.forEach(function(browser) {
    console.log("Launching:", browser);

    var url = 'http://localhost:' + serverPort.toString() + '/';
    url += config.test_path;

    browser['url'] = url;

    client.createWorker(browser, function () {
    });
  });
}, 5000);
