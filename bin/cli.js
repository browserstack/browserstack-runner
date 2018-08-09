var Log = require('../lib/logger'),
    logger = new Log(global.logLevel || 'info'),
    BrowserStack = require('browserstack'),
    qs = require('querystring'),
    chalk = require('chalk'),
    utils = require('../lib/utils'),
    Server = require('../lib/server').Server,
    Tunnel = require('../lib/local').Tunnel,
    tunnel = require('tunnel'),
    http = require('http'),
    ConfigParser = require('../lib/configParser').ConfigParser,
    config,
    server,
    timeout,
    activityTimeout,
    ackTimeout,
    client,
    workers = {},
    workerKeys = {},
    tunnelingAgent;

function terminateAllWorkers(callback) {
  logger.trace('terminateAllWorkers');

  var cleanWorker = function(id, key) {
    logger.trace('cleanWorker(%s, %s)', id, key);

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
        logger.trace('terminateAllWorkers: done');
        callback();
      }
    });
  };

  if (utils.objectSize(workers) === 0) {
    logger.trace('terminateAllWorkers: done');
    callback();
  } else {
    for (var key in workers){
      var worker = workers[key];
      if (worker.id) {
        cleanWorker(worker.id, key);
      } else {
        delete workers[key];
        if (utils.objectSize(workers) === 0) {
          logger.trace('terminateAllWorkers: done');
          callback();
        }
      }
    }
  }
}

function cleanUpAndExit(signal, error, report, callback) {
  ConfigParser.finalBrowsers = [];
  callback = callback || function() {};
  report = report || [];
  logger.trace('cleanUpAndExit: signal: %s', signal);

  try {
    server.close();
  } catch (e) {
    logger.debug('Server already closed');
  }

  if (statusPoller) {
    statusPoller.stop();
  }

  try {
    process.kill(tunnel.process.pid, 'SIGTERM');
  } catch (e) {
    logger.debug('Non existent tunnel');
  }

  if (signal === 'SIGTERM') {
    logger.debug('Exiting');
    callback(error, report);
  } else {
    terminateAllWorkers(function() {
      logger.debug('Exiting');
      callback(error, report);
    });
  }
}

function getTestBrowserInfo(browserString, path) {
  var info = browserString;
  if (config.multipleTest) {
    info += ', ' + path;
  }

  logger.trace('getTestBrowserInfo(%s, %s): %s', browserString, path, info);
  return info;
}

function buildTestUrl(test_path, worker_key, browser) {
  var host;
  if (browser.os.toLowerCase() === 'ios' ){
    host = 'bs-local.com';
  } else {
    host = 'localhost';
  }
  var url = 'http://'+host+':' + config.test_server_port + '/' + test_path;
  var browser_string = utils.browserString(browser);
  var querystring = qs.stringify({
    _worker_key: worker_key,
    _browser_string: browser_string
  });

  url += ((url.indexOf('?') > 0) ? '&' : '?') + querystring;
  logger.trace('buildTestUrl:', url);
  return url;
}

function launchServer(config, callback) {
  logger.trace('launchServer:', config.test_server_port);
  logger.debug('Launching server on port:', config.test_server_port);

  server = new Server(client, workers, config, callback);
  server.listen(parseInt(config.test_server_port, 10));
}

function launchBrowser(browser, path) {
  var key = utils.uuid();
  var browserString = utils.browserString(browser);
  var browserInfo = getTestBrowserInfo(browserString, path);
  logger.debug('[%s] Launching', browserInfo);

  browser.url = buildTestUrl(path.replace(/\\/g, '/'), key, browser);

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

  logger.trace('[%s] client.createWorker', browserInfo, browser);

  client.createWorker(browser, function (err, worker) {
    logger.trace('[%s] client.createWorker | response:', browserInfo, worker, err);

    if (err || typeof worker !== 'object') {
      logger.info('Error from BrowserStack: ', err);
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
    logger.trace('launchBrowsers', browser);

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
    var url = buildTestUrl(test_path || this.test_path, workerKey, this.config);
    logger.trace('[%s] worker.buildUrl: %s', this.id, url);
    return url;
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
      logger.trace('[%s] worker.awaitAck: already awaiting ack, or awaited ack once and failed', self.id);
      return;
    }

    logger.trace('[%s] worker.awaitAck: timeout in %d secs', self.id, ackTimeout);

    this.ackTimeout = setTimeout(function () {
      if (self.isAckd) {
        logger.trace('[%s] worker.awaitAck: already ackd', self.id);
        return;
      }

      var url = self.buildUrl();
      logger.trace('[%s] worker.awaitAck: client.changeUrl: %s', self.id, url);

      client.changeUrl(self.id, { url: url }, function (err, data) {
        logger.trace('[%s] worker.awaitAck: client.changeUrl: %s | response:', self.id, url, data, err);
        logger.debug('[%s] Sent Request to reload url', self.getTestBrowserInfo());
      });

    }, ackTimeout * 1000);

    logger.debug('[%s] Awaiting ack', this.getTestBrowserInfo());
  };

  worker.markAckd = function markAckd() {
    this.resetAck();
    this.isAckd = true;

    logger.trace('[%s] worker.markAckd', this.id);
    logger.debug('[%s] Received ack', this.getTestBrowserInfo());
  };

  worker.resetAck = function resetAck() {
    logger.trace('[%s] worker.resetAck', this.id);

    clearTimeout(this.ackTimeout);
    this.ackTimeout = null;
    this.isAckd = false;
  };

  return worker;
}

var statusPoller = {
  poller: null,

  start: function(callback) {
    logger.trace('statusPoller.start');

    statusPoller.poller = setInterval(function () {
      client.getWorkers(function (err, _workers) {
        logger.trace('client.getWorkers | response: worker count: %d', (_workers || []).length, err);

        if (!_workers) {
          logger.info(chalk.red('Error found: ' + err));
          return;
        }
        _workers.filter(function(currentValue) {
          return currentValue.status === 'running' && workerKeys[currentValue.id] && !workerKeys[currentValue.id].marked;
        }).forEach(function(_worker) {
          var workerData = workerKeys[_worker.id];
          var worker = workers[workerData.key];
          if (!worker || worker.launched) {
            return;
          }

          if (_worker.status === 'running') {
            //clearInterval(statusPoller);
            logger.debug('[%s] Launched', worker.getTestBrowserInfo());
            worker.launched = true;
            workerData.marked = true;

            // Await ack from browser-worker
            worker.awaitAck();
            logger.trace('[%s] worker.activityTimeout: timeout in %d secs', worker.id, activityTimeout);

            worker.activityTimeout = setTimeout(function () {
              if (!worker.isAckd) {
                logger.trace('[%s] worker.activityTimeout', worker.id);

                delete workers[workerData.key];
                delete workerKeys[worker.id];
                config.status += 1;
                if (utils.objectSize(workers) === 0) {
                  var color = config.status > 0 ? 'red' : 'green';
                  logger.info(chalk[color]('All tests done, failures: %d.'), config.status);

                  if (config.status > 0) {
                    config.status = 1;
                  }

                  logger.trace('[%s] worker.activityTimeout: all tests done', worker.id, config.status && 'with failures');
                  var testsFailedError = utils.createTestsFailedError(config);
                  if(server && server.reports) {
                    callback(testsFailedError, server.reports);
                  } else {
                    callback(testsFailedError, {});
                  }
                }
              } else {
                logger.trace('[%s] worker.activityTimeout: already ackd', worker.id);
              }
            }, activityTimeout * 1000);


            logger.trace('[%s] worker.testActivityTimeout: timeout in %d secs', worker.id, activityTimeout);

            worker.testActivityTimeout = setTimeout(function () {
              if (worker.isAckd) {
                logger.trace('[%s] worker.testActivityTimeout', worker.id);

                delete workers[workerData.key];
                delete workerKeys[worker.id];
                config.status += 1;
                if (utils.objectSize(workers) === 0) {
                  var color = config.status > 0 ? 'red' : 'green';
                  logger.info(chalk[color]('All tests done, failures: %d.'), config.status);

                  if (config.status > 0) {
                    config.status = 1;
                  }

                  logger.trace('[%s] worker.testActivityTimeout: all tests done', worker.id, config.status && 'with failures');
                  var testsFailedError = utils.createTestsFailedError(config);
                  if(server && server.reports) {
                    callback(testsFailedError, server.reports);
                  } else {
                    callback(testsFailedError, {});
                  }
                }
              } else {
                logger.trace('[%s] worker.testActivityTimeout: not ackd', worker.id);
              }
            }, (activityTimeout * 1000));
          }
        });
      });
    }, 2000);
  },

  stop: function() {
    logger.trace('statusPoller.poller');
    clearInterval(statusPoller.poller);
  }
};

function runTests(config, callback) {
  var runTestsCallback = function(error, report) {
    ConfigParser.finalBrowsers = [];
    callback(error, report);
  };
  if (config.proxy) {
    logger.trace('runTests: with proxy', config.proxy);

    tunnelingAgent = tunnel.httpOverHttp({
      proxy: config.proxy
    });
    var oldhttpreq = http.request;
    http.request = function (options, reqCallback) {
      options.agent = tunnelingAgent;
      return oldhttpreq.call(null, options, reqCallback);
    };
  }
  if (config.browsers && config.browsers.length > 0) {
    ConfigParser.parse(client, config.browsers, function(browsers){
      launchServer(config, runTestsCallback);

      logger.trace('runTests: creating tunnel');
      tunnel = new Tunnel(config.key, config.test_server_port, config.tunnelIdentifier, config, function (err) {
        if(err) {
          cleanUpAndExit(null, err, [], callback);
        } else {
          logger.trace('runTests: created tunnel');

          statusPoller.start(runTestsCallback);
          var total_runs = config.browsers.length * (Array.isArray(config.test_path) ? config.test_path.length : 1);
          logger.info('Launching ' + config.browsers.length + ' worker(s) for ' + total_runs + ' run(s).');
          browsers.forEach(function(browser) {
            if (browser.browser_version === 'latest') {
              logger.debug('[%s] Finding version.', utils.browserString(browser));
              logger.trace('runTests: client.getLatest');

              client.getLatest(browser, function(err, version) {
                logger.trace('runTests: client.getLatest | response:', version, err);
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
        }
      });
    });
  } else {
    launchServer(config, callback);
  }
}

exports.run = function(user_config, callback) {
  callback = callback || function() {};

  try {
    config = new (require('../lib/config').config)(user_config);

    client = BrowserStack.createClient({
      username: config.username,
      password: config.key
    });
    runTests(config, function(error, report) {
      cleanUpAndExit('SIGTERM', error, report, callback);
    });
  } catch (e) {
    callback(e);
  }
};
