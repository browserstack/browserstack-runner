#! /usr/bin/env node

var BrowserStack = require('browserstack'),
    fs = require('fs'),
    chalk = require('chalk'),
    utils = require('../lib/utils'),
    Server = require('../lib/server').Server,
    config = require('../lib/config'),
    Tunnel = require('../lib/local').Tunnel,
    ConfigParser = require('../lib/configParser').ConfigParser,
    serverPort = 8888,
    timeout = null,
    activityTimeout = null,
    tunnel;

var client = BrowserStack.createClient({
  username: config.username,
  password: config.key
});

var pid_file = process.cwd() + '/browserstack-run.pid';
fs.writeFileSync(pid_file, process.pid, 'utf-8')

var workers = {};
var workerKeys = {};
var cleanUp = function(signal) {
  try {
    server.close();
  } catch (e) {
    console.log("Server already closed");
  }

  console.log("Exiting");

  for (var key in workers) {
    var worker = workers[key];
    if (workers.hasOwnProperty(key)) {
      client.terminateWorker(worker.id, function () {
        if (!workers[key]) {
          return;
        }

        console.log('[%s] Terminated', worker.string);
        clearTimeout(worker.activityTimeout);
        delete workers[key];
        delete workerKeys[worker.id];
      });
    }
  }
  if (statusPoller) statusPoller.stop();

  try {
    process.kill(tunnel.process.pid, 'SIGKILL');
  } catch (e) {
    console.log("Non existent tunnel");
  }
  try {
    fs.unlinkSync(pid_file);
  } catch (e) {
    console.log("Non existent pid file.");
  }
  if (signal) {
    process.kill(process.pid, 'SIGTERM');
  }
};

process.on('exit', function() {cleanUp(false)});
process.on('SIGINT', function() {cleanUp(true)});

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

  timeout = parseInt(config.timeout);
  if(! isNaN(timeout)) {
    browser.timeout = timeout;
  } else {
    timeout = 300;
  }
  activityTimeout = timeout - 10;

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
    workerKeys[worker.id] = {key: key, marked: false};
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

var statusPoller = {
  poller: null,

  start: function() {
    statusPoller.poller = setInterval(function () {
      client.getWorkers(function (err, _workers) {
        _workers = _workers.filter(function(currentValue, index, array) {
          return currentValue.status == 'running' && workerKeys[currentValue.id] && !workerKeys[currentValue.id].marked;
        });
        for (var i in _workers) {
          var _worker = _workers[i];
          var workerData = workerKeys[_worker.id];
          var worker = workers[workerData.key];
          if (worker.launched) {
            return;
          }

          if (_worker.status === 'running') {
            //clearInterval(statusPoller);
            console.log('[%s] Launched', worker.string);
            worker.launched = true;
            workerData.marked = true;

            worker.activityTimeout = setTimeout(function () {
              if (!worker.acknowledged) {
                var subject = "Worker inactive for too long: " + worker.string;
                var content = "Worker details:\n" + JSON.stringify(worker.config, null, 4);
                utils.alertBrowserStack(subject, content, null, function(){});
                delete workers[workerData.key];
                delete workerKeys[worker.id];
                config.status += 1;
                if (utils.objectSize(workers) === 0) {
                  var color = config.status > 0 ? "red" : "green";
                  console.log(chalk[color]("All tests done, failures: %d."), config.status);

                  if (config.status > 0) {
                    config.status = 1;
                  }

                  process.exit(config.status);
                }
              }
            }, activityTimeout * 1000);

            setTimeout(function () {
              if (worker.acknowledged) {
                var subject = "Tests timed out on: " + worker.string;
                var content = "Worker details:\n" + JSON.stringify(worker.config, null, 4);
                utils.alertBrowserStack(subject, content, null, function(){});
                delete workers[workerData.key];
                delete workerKeys[worker.id];
                config.status += 1;
                if (utils.objectSize(workers) === 0) {
                  var color = config.status > 0 ? "red" : "green";
                  console.log(chalk[color]("All tests done, failures: %d."), config.status);

                  if (config.status > 0) {
                    config.status = 1;
                  }

                  process.exit(config.status);
                }
              }
            }, (activityTimeout * 1000));
          }
        }
      });
    }, 2000);
  },
  
  stop: function() {
    clearInterval(statusPoller.poller);
  }
};

if (config.browsers && config.browsers.length > 0) {
  ConfigParser.parse(client, config.browsers, function(browsers){
    tunnel = new Tunnel(config.key, serverPort, config.tunnelIdentifier, function () {
      console.log("Launching BrowserStack workers");
      browsers.forEach(function(browser) {
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
    statusPoller.start();
  });
}
