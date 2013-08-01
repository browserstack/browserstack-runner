#! /usr/bin/env node

var BrowserStack = require('browserstack'),
    fs = require('fs'),
    utils = require('../lib/utils');
    Server = require('../lib/server').Server;
    Tunnel = require('../lib/tunnel').Tunnel;

var serverPort = 8888;
var tunnel;

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

if (process.env.BROWSERSTACK_KEY) {
  config.key = process.env.BROWSERSTACK_KEY;
}

if (process.env.BROWSERSTACK_USERNAME) {
  config.username = process.env.BROWSERSTACK_USERNAME;
}

var client = BrowserStack.createClient({
  username: config.username,
  password: config.key
});

var pid_file = process.cwd() + '/browserstack-run.pid';
fs.writeFileSync(pid_file, process.pid, 'utf-8')

var workers = {};

var cleanUp = function cleanUp () {
  try {
    server.close();
  } catch (e) {
    console.log("Server already closed");
  }

  console.log("Exiting");

  for (var key in workers) {
    if (workers.hasOwnProperty(key)) {
      client.terminateWorker(workers[key].id, function () {
        console.log('[%s] Terminated', workers[key].string);
      });
    }
  }

  process.kill(tunnel.process.pid, 'SIGKILL');
  fs.unlink(pid_file);
};

process.on('exit', cleanUp);
process.on('SIGINT', cleanUp);

console.log("Launching server..");

var server = new Server(client, workers);
server.listen(parseInt(serverPort, 10));

if (config.browsers) {
  tunnel = new Tunnel(config.key, serverPort, function () {
    config.browsers.forEach(function(browser) {
      var browserString = utils.browserString(browser);
      console.log("[%s] Launching", browserString);

      var url = 'http://localhost:' + serverPort.toString() + '/';
      url += config.test_path;

      var key = utils.uuid();

      if (url.indexOf('?') > 0) {
        url += '&';
      } else {
        url += '?';
      }

      url += '_worker_key=' + key + '&_browser_string=' + browserString;
      browser['url'] = url;

      client.createWorker(browser, function (err, worker) {
        var runningChecked = false;

        worker.config = browser;
        worker.string = browserString;
        workers[key] = worker;

        var statusPoller = setInterval(function () {
          client.getWorker(worker.id, function (err, _worker) {
            if (runningChecked) {
              return;
            }

            if (_worker.status === 'running') {
              runningChecked = true;
              clearInterval(statusPoller);
              console.log('[%s] Launched', worker.string);
            }
          });
        }, 2000);
      });
    });
  });
}
