#! /usr/bin/env node

var BrowserStack = require('browserstack'),
    fs = require('fs'),
    utils = require('../lib/utils');
    Server = require('../lib/server').Server;
    config = require('../lib/config');
    Tunnel = require('../lib/local').Tunnel;

var serverPort = 8888;
var tunnel;

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
        if (!workers[key]) {
          return;
        }

        console.log('[%s] Terminated', workers[key].string);
        clearTimeout(workers[key].activityTimeout);
        delete workers[key]
      });
    }
  }

  try {
    process.kill(tunnel.process.pid, 'SIGKILL');
  } catch (e) {
    console.log("Non existent tunnel");
  }
  try {
    fs.unlink(pid_file);
  } catch (e) {
    console.log("Non existent pid file.");
  }
};

process.on('exit', cleanUp);
process.on('SIGINT', cleanUp);

console.log("Launching server on port:", serverPort);

var server = new Server(client, workers);
server.listen(parseInt(serverPort, 10));

function launchBrowser(browser, url) {
  var browserString = utils.browserString(browser);
  console.log("[%s] Launching", browserString);

  var key = utils.uuid();

  if (url.indexOf('?') > 0) {
    url += '&';
  } else {
    url += '?';
  }

  url += '_worker_key=' + key + '&_browser_string=' + browserString;
  browser['url'] = url;

  if (config.project) {
    browser.project = config.project;
  }
  if (config.build) {
    browser.build = config.build;
  }

  if(config.tunnelIdentifier) {
    browser["tunnel_identifier"] = config.tunnelIdentifier;
  }

  var timeout = parseInt(config.timeout);
  if(! isNaN(timeout)) {
    browser.timeout = timeout;
  } else {
    timeout = 300;
  }

  client.createWorker(browser, function (err, worker) {
    if (err || typeof worker !== 'object') {
      console.log("Error from BrowserStack: ", err);
      utils.alertBrowserStack("Failed to launch worker",
                              "Arguments: " + JSON.stringify({
                                err: err,
                                worker: worker
                              }, null, 4));
      return;
    }

    worker.config = browser;
    worker.string = browserString;
    workers[key] = worker;

    var statusPoller = setInterval(function () {
      client.getWorker(worker.id, function (err, _worker) {
        if (worker.launched) {
          return;
        }

        if (_worker.status === 'running') {
          clearInterval(statusPoller);
          console.log('[%s] Launched', worker.string);
          worker.launched = true;

          worker.activityTimeout = setTimeout(function () {
            if (!worker.acknowledged) {
              var subject = "Worker inactive for too long: " + worker.string;
              var content = "Worker details:\n" + JSON.stringify(worker.config, null, 4);
              client.takeScreenshot(worker.id, function(error, screenshot) {
                if (!error && screenshot.url) {
                  console.log('[%s] Screenshot: %s', worker.string, screenshot.url);
                }
              });
              utils.alertBrowserStack(subject, content);
            }
          }, timeout * 1000);

          setTimeout(function () {
            if (workers[key]) {
              var subject = "Tests timed out on: " + worker.string;
              var content = "Worker details:\n" + JSON.stringify(worker.config, null, 4);
              utils.alertBrowserStack(subject, content);
            }
          }, (timeout * 1000));
        }
      });
    }, 2000);
  });
}

var launchBrowsers = function(config, browser) {
  setTimeout(function () {
    if(Object.prototype.toString.call(config.test_path) === '[object Array]'){
      config.test_path.forEach(function(path){
        var url = 'http://localhost:' + serverPort.toString() + '/' + path;
        launchBrowser(browser,url);
      });
    } else {
      var url = 'http://localhost:' + serverPort.toString() + '/' + config.test_path;
      launchBrowser(browser,url);
    }
  }, 100);
}

if (config.browsers && config.browsers.length > 0) {
  tunnel = new Tunnel(config.key, serverPort, config.tunnelIdentifier, function () {
    console.log("Launching BrowserStack workers");
    config.browsers.forEach(function(browser) {
      if (browser.browser_version === "latest") {
        console.log("[%s] Finding version.", utils.browserString(browser));

        client.getLatest(browser, function(err, version) {
          console.log("[%s] Version is %s.",
                      utils.browserString(browser), version);
          browser.browser_version = version;
          // So that all latest logs come in together
          launchBrowsers(config, browser);
        });
      } else {
        launchBrowsers(config, browser);
      }
    });
  });
}
