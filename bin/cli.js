#! /usr/bin/env node

var todo = process.argv[2];

if (todo === '--verbose') {
  global.logLevel = 'debug';
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

var Log = require('../lib/logger'),
    logger = new Log(global.logLevel),
    BrowserStack = require('browserstack'),
    fs = require('fs'),
    qs = require('querystring'),
    chalk = require('chalk'),
    config = require('../lib/config'),
    utils = require('../lib/utils'),
    Server = require('../lib/server').Server,
    Tunnel = require('../lib/local').Tunnel,
    tunnel = require('tunnel'),
    http = require('http'),
    ConfigParser = require('../lib/configParser').ConfigParser,
    serverPort = 8888,
    server,
    timeout,
    activityTimeout,
    ackTimeout,
    workers = {},
    workerKeys = {},
    tunnelingAgent,
    tunnel;

function terminateAllWorkers(callback) {
  var cleanWorker = function(id, key) {
    client.terminateWorker(id, function() {
      var worker = workers[key];
      if(worker) {
        logger.debug('[%s] Terminated', worker.string);
        clearTimeout(worker.ackTimeout);
        clearTimeout(worker.activityTimeout);
        clearTimeout(worker.testActivityTimeout);
        delete workers[key];
        delete workerKeys[worker.id];
      }
      if (utils.objectSize(workers) === 0) {
        callback();
      }
    });
  };

  if (utils.objectSize(workers) === 0) {
    callback();
  } else {
    for (var key in workers){
      var worker = workers[key];
      if (worker.id) {
        cleanWorker(worker.id, key);
      } else {
        delete workers[key];
        if (utils.objectSize(workers) === 0) {
          callback();
        }
      }
    }
  }
}

function cleanUpAndExit(signal, status) {
  try {
    server.close();
  } catch (e) {
    logger.debug('Server already closed');
  }

  if (statusPoller) {
    statusPoller.stop();
  }

  try {
    process.kill(tunnel.process.pid, 'SIGKILL');
  } catch (e) {
    logger.debug('Non existent tunnel');
  }
  try {
    fs.unlinkSync(pid_file);
  } catch (e) {
    logger.debug('Non existent pid file.');
  }

  if (signal === 'SIGTERM') {
    logger.debug('Exiting');
    process.exit(status);
  } else {
    terminateAllWorkers(function() {
      logger.debug('Exiting');
      process.exit(1);
    });
  }
}

function getTestBrowserInfo(browserString, path) {
  var info = browserString;
  if (config.multipleTest) {
    info += ', ' + path;
  }

  return info;
}


function buildTestUrl(test_path, worker_key, browser_string) {
  var url = 'http://localhost:' + serverPort + '/' + test_path;

  var querystring = qs.stringify({
    _worker_key: worker_key,
    _browser_string: browser_string
  });

  url += ((url.indexOf('?') > 0) ? '&' : '?') + querystring;
  return url;
}


function launchServer() {
  logger.debug('Launching server on port:', serverPort);

  server = new Server(client, workers);
  server.listen(parseInt(serverPort, 10));
}

function launchBrowser(browser, path) {
  var key = utils.uuid();
  var browserString = utils.browserString(browser);
  var browserInfo = getTestBrowserInfo(browserString, path);
  logger.debug('[%s] Launching', browserInfo);

  browser.url = buildTestUrl(path.replace(/\\/g, '/'), key, browserString);

  if (config.project) {
    browser.project = config.project;
  }
  if (config.build) {
    browser.build = config.build;
  }

  if(config.tunnelIdentifier) {
    browser['tunnel_identifier'] = config.tunnelIdentifier;
  }

  timeout = parseInt(config.timeout);
  if (!isNaN(timeout)) {
    browser.timeout = timeout;
  } else {
    timeout = 300;
  }
  activityTimeout = timeout - 10;
  ackTimeout = parseInt(config.ackTimeout) || 60;

  client.createWorker(browser, function (err, worker) {
    if (err || typeof worker !== 'object') {
      logger.info('Error from BrowserStack: ', err);
      utils.alertBrowserStack('Failed to launch worker',
                              'Arguments: ' + JSON.stringify({
                                err: err,
                                worker: worker
                              }, null, 4));
      return;
    }

    worker.config = browser;
    worker.string = browserString;
    worker.test_path = path;
    worker.path_index = 0;

    // attach helper methods to manage worker state
    attachWorkerHelpers(worker);

    workers[key] = worker;
    workerKeys[worker.id] = {key: key, marked: false};
  });
}

function launchBrowsers(config, browser) {
  setTimeout(function () {
    if (Array.isArray(config.test_path)){
      config.multipleTest = config.test_path.length > 1? true : false;
      launchBrowser(browser, config.test_path[0]);
    } else {
      config.multipleTest = false;
      launchBrowser(browser, config.test_path);
    }
  }, 100);
}


function attachWorkerHelpers(worker) {
  // TODO: Consider creating instances of a proper 'Worker' class

  worker.buildUrl = function buildUrl(test_path) {
    var workerKey = workerKeys[this.id] ? workerKeys[this.id].key : null;
    return buildTestUrl(test_path || this.test_path, workerKey, this.getTestBrowserInfo());
  };

  worker.getTestBrowserInfo = function getTestBrowserInfo(test_path) {
    var info = this.string;
    if (config.multipleTest) {
      info += ', ' + (test_path || this.test_path);
    }
    return info;
  };

  worker.awaitAck = function awaitAck() {
    var self = this;

    if (this.ackTimeout) {
      // Already awaiting ack, or awaited ack once and failed
      return;
    }

    this.ackTimeout = setTimeout(function () {
      if (self.isAckd) {
        // Already ack'd
        return;
      }

      // worker has not acknowledged itself in 60 sec, reopen url
      client.changeUrl(self.id, { url: self.buildUrl() }, function () {
        logger.debug('[%s] Sent Request to reload url', self.getTestBrowserInfo());
      });

    }, ackTimeout * 1000);

    logger.debug('[%s] Awaiting ack', this.getTestBrowserInfo());
  };

  worker.markAckd = function markAckd() {
    this.resetAck();
    this.isAckd = true;

    logger.debug('[%s] Received ack', this.getTestBrowserInfo());
  };

  worker.resetAck = function resetAck() {
    clearTimeout(this.ackTimeout);
    this.ackTimeout = null;
    this.isAckd = false;
  };

  return worker;
}


var statusPoller = {
  poller: null,

  start: function() {
    statusPoller.poller = setInterval(function () {
      client.getWorkers(function (err, _workers) {
        if (!_workers) {
          logger.info(chalk.red('Error found: ' + err));
          return;
        }
        _workers.filter(function(currentValue) {
          return currentValue.status === 'running' && workerKeys[currentValue.id] && !workerKeys[currentValue.id].marked;
        }).forEach(function(_worker) {
          var workerData = workerKeys[_worker.id];
          var worker = workers[workerData.key];
          if (worker.launched) {
            return;
          }

          if (_worker.status === 'running') {
            //clearInterval(statusPoller);
            logger.debug('[%s] Launched', worker.getTestBrowserInfo());
            worker.launched = true;
            workerData.marked = true;

            // Await ack from browser-worker
            worker.awaitAck();

            worker.activityTimeout = setTimeout(function () {
              if (!worker.isAckd) {
                var subject = 'Worker inactive for too long: ' + worker.string;
                var content = 'Worker details:\n' + JSON.stringify(worker.config, null, 4);
                utils.alertBrowserStack(subject, content, null, function(){});
                delete workers[workerData.key];
                delete workerKeys[worker.id];
                config.status += 1;
                if (utils.objectSize(workers) === 0) {
                  var color = config.status > 0 ? 'red' : 'green';
                  logger.info(chalk[color]('All tests done, failures: %d.'), config.status);

                  if (config.status > 0) {
                    config.status = 1;
                  }

                  process.exit('SIGTERM');
                }
              }
            }, activityTimeout * 1000);

            worker.testActivityTimeout = setTimeout(function () {
              if (worker.isAckd) {
                var subject = 'Tests timed out on: ' + worker.string;
                var content = 'Worker details:\n' + JSON.stringify(worker.config, null, 4);
                utils.alertBrowserStack(subject, content, null, function(){});
                delete workers[workerData.key];
                delete workerKeys[worker.id];
                config.status += 1;
                if (utils.objectSize(workers) === 0) {
                  var color = config.status > 0 ? 'red' : 'green';
                  logger.info(chalk[color]('All tests done, failures: %d.'), config.status);

                  if (config.status > 0) {
                    config.status = 1;
                  }

                  process.exit('SIGTERM');
                }
              }
            }, (activityTimeout * 1000));
          }
        });
      });
    }, 2000);
  },

  stop: function() {
    clearInterval(statusPoller.poller);
  }
};

function runTests() {
  if (config.proxy) {
    tunnelingAgent = tunnel.httpOverHttp({
      proxy: config.proxy
    });
    var oldhttpreq = http.request;
    http.request = function (options, callback) {
      options.agent = tunnelingAgent;
      return oldhttpreq.call(null, options, callback);
    };
  }
  if (config.browsers && config.browsers.length > 0) {
    ConfigParser.parse(client, config.browsers, function(browsers){
      launchServer();
      tunnel = new Tunnel(config.key, serverPort, config.tunnelIdentifier, function () {
        statusPoller.start();
        var total_runs = config.browsers.length * (Array.isArray(config.test_path) ? config.test_path.length : 1);
        logger.info('Launching ' + config.browsers.length + ' worker(s) for ' + total_runs + ' run(s).');
        browsers.forEach(function(browser) {
          if (browser.browser_version === 'latest') {
            logger.debug('[%s] Finding version.', utils.browserString(browser));

            client.getLatest(browser, function(err, version) {
              logger.debug('[%s] Version is %s.',
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
    });
  } else {
    launchServer();
  }
}

try {
  var client = BrowserStack.createClient({
    username: config.username,
    password: config.key
  });
  runTests();
  var pid_file = process.cwd() + '/browserstack-run.pid';
  fs.writeFileSync(pid_file, process.pid, 'utf-8');
  process.on('exit', function(signal){
    cleanUpAndExit(signal, config.status);
  });
} catch (e) {
  console.log(e);
  console.log('Invalid command.');
}
