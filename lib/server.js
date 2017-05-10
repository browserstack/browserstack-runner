var Log = require('./logger'),
  logger = new Log(global.logLevel || 'info'),
  http = require('http'),
  url = require('url'),
  path = require('path'),
  util = require('util'),
  fs = require('fs'),
  qs = require('querystring'),
  utils = require('./utils'),
  proxyServer = require('./proxy').proxyServer,
  chalk = require('chalk'),
  mime = require('mime'),
  send = require('send'),
  vm = require('vm'),
  CircularJSON = require('circular-json'),
  resolve = require('resolve');

exports.Server = function Server(bsClient, workers, config, callback) {
  var testFilePaths = (Array.isArray(config.test_path) ? config.test_path : [ config.test_path ])
    .map(function (path) {
      return path.split(/[?#]/)[0];
    }),
    reports = [];

  function getBrowserReport(browserInfo) {
    var browserReport = null;
    reports.forEach(function(report) {
      if(report && report.browser === browserInfo) {
        browserReport = report;
      }
    });
    if(!browserReport) {
      browserReport = {
        browser: browserInfo
      };
      reports.push(browserReport);
    }
    browserReport.tests = browserReport.tests || [];
    return browserReport;
  }

  function reformatJasmineReport(browserReport) {
    var results = browserReport.suites;
    browserReport.tests = browserReport.tests || [ ];
    browserReport.suites = {
      fullName : [ ],
      childSuites : [ ],
      tests : [ ],
      status : !results.failed ? 'passed' : 'failed',
      testCounts : {
        passed : results.passed,
        failed : results.failed,
        skipped : results.skipped,
        total : results.total,
      },
      runtime : results.runtime
    };
    function recurseThroughSuites(jasmineSuite, par) {
      if(!jasmineSuite) return
      var suite = {
        name : jasmineSuite.description,
        fullName: [ ],
        childSuites : [ ],
        tests: [ ],
        status : jasmineSuite.passed ? 'passed' : 'failed',
        testCounts : {
          passed : 0,
          failed : 0,
          skipped: 0,
          total: 0
        },
        runtime: 0
      };
      if(par.name) {
        suite.fullName.push(par.name);
      }
      suite.fullName.push(jasmineSuite.description);
      jasmineSuite.specs.forEach(function(spec) {
        var test = {
          name : spec.description,
          suiteName : suite.decription,
          fullName : [
          ],
          status : spec.passed ?  'passed' : (spec.results.skipped ? 'skipped' : 'failed'),
          runtime : spec.durationSec,
          errors : [ ],
          assertions : [ ]
        };
        Array.prototype.push.apply(test.fullName, suite.fullName);
        test.fullName.push(spec.description);
        if(!spec.passed) {
          spec.results.items_.forEach(function(jasmineItem) {
            if(!jasmineItem.passed_) {
              var detail = {
                passed : false
              };
              if('message' in jasmineItem) {
                detail.message = jasmineItem.message;
              }
              if('actual' in jasmineItem) {
                detail.actual = jasmineItem.actual;
              }
              if('expected' in jasmineItem) {
                detail.expected = jasmineItem.expected;
              }
              if('trace' in jasmineItem) {
                detail.stack = jasmineItem.trace.message || jasmineItem.trace.stack;
              }
              test.errors.push(detail);
              test.assertions.push(detail);
            }
          });
        }
        suite.tests.push(test);
        browserReport.tests.push(test);
        if(spec.passed) {
          ++suite.testCounts.passed;
        }
        else if(spec.skipped) {
          ++suite.testCounts.skipped;
        }
        else {
          ++suite.testCounts.failed;
        }
        ++suite.testCounts.total;
        suite.runtime += spec.durationSec;
      });
      jasmineSuite.suites.forEach(function(childSuite) {
        recurseThroughSuites(childSuite, suite);
      });
      par.childSuites.push(suite);
    }
    results.report.suites.forEach(function(jasmineSuite) {
      recurseThroughSuites(jasmineSuite, browserReport.suites);
    });
  }

  function handleFile(filename, request, response, doNotUseProxy) {
    var url_parts = url.parse(request.url, true);
    var query = url_parts.query;

    if (query._worker_key && workers[query._worker_key]) {
      var worker = workers[query._worker_key];
      worker.markAckd();
    }

    var getReporterPatch = function () {
      var scripts = [
        'json2.js',
        'browserstack.js',
        'browserstack-util.js'
      ];

      var framework_scripts = {
        'jasmine': ['jasmine-jsreporter.js', 'jasmine-plugin.js']
      };

      var filePath = path.relative(process.cwd(), filename);
      var pathMatches = (testFilePaths.indexOf(filePath) !== -1);

      if (pathMatches) {
        var framework = config['test_framework'];
        var tag_name = (framework === 'mocha') ? 'head' : 'body';
        var patch = '$1';

        scripts.forEach(function(script) {
          patch += '<script type="text/javascript" src="/_patch/' + script + '"></script>\n';
        });

        patch += externalScript('js-reporters/dist/js-reporters.js');
        patch += externalScript('circular-json/build/circular-json.js');

        // adding framework scripts
        if (framework === 'jasmine') {
          framework_scripts['jasmine'].forEach(function(script) {
            patch += '<script type="text/javascript" src="/_patch/' + script + '"></script>\n';
          });
          patch += '<script type="text/javascript">jasmine.getEnv().addReporter(new jasmine.JSReporter());</script>\n';
        } else {
          patch += '<script type="text/javascript" src="/_patch/reporter.js"></script>\n';
        }
        patch += '</' + tag_name + '>';
        return patch;
      }
    };

    var writeResponse = function(err, data) {

      if (err) {
        sendError(response, err, 500);
        return;
      }

      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8'
      });
      var tag_name = (config['test_framework'] === 'mocha') ? 'head' : 'body';
      var matcher = new RegExp('(.*)<\/' + tag_name + '>'); ///(.*)<\/body>/;
      var patch = getReporterPatch();
      data = data.replace(matcher, patch);

      response.write(data);
      response.end();
    };

    if (!doNotUseProxy && config.test_server) {
      proxyServer.onRequest(request, response, config.test_server, function(remote_response, response_data) {
        var mimeType = mime.lookup(filename);
        var final_data = response_data;
        var headers = remote_response.headers;
        if (mimeType === 'text/html') {
          var matcher = /(.*)<\/head>/;
          var patch = getReporterPatch();
          final_data = response_data.replace(matcher, patch);
          headers['content-length'] = final_data.length;
        }
        response.writeHead(remote_response.statusCode, headers);
        response.write(final_data);
        response.end();
        return;
      });

    } else {

      fs.exists(filename, function(exists) {
        if (!exists) {
          sendError(response,'file not found', 404);
          return;
        }

        if (fs.lstatSync(filename).isDirectory()) {
          filename = filename + (filename.lastIndexOf('/') === filename.length - 1 ? '' : '/') + 'index.html';
        }

        var mimeType = mime.lookup(filename);
        if (mimeType === 'text/html') {
          fs.readFile(filename, { encoding: 'utf8' }, function (err, data) {
            writeResponse(err, data);
          });
        } else {
          send(request, filename)
            .on('error', function onSendError(err) {
              sendError(response, (err.message || 'Internal Server Error'), err.status || 500);
            })
            .pipe(response);
        }
      });
    }
  }

  function formatTraceback(details) {
    var output = '"' + details.testName + '" failed';
    if(details.error) {
      if (details.error.message) {
        output += ', ' + details.error.message;
      }
      if (details.error.actual != null && details.error.expected != null) {
        output += '\n' + chalk.blue('Expected: ') + details.error.expected +
          '\n' + chalk.blue('  Actual: ') + details.error.actual;
      }
      if (details.error.source || details.error.stack) {
        output += '\n' + chalk.blue('  Source: ') + '';
        output += ( details.error.source || details.error.stack ).split('\n').join('\n\t  ');
      }
    }
    return output;
  }

  function checkAndTerminateWorker(worker, callback) {
    var next_path = getNextTestPath(worker);
    if (next_path) {
      var url = worker.buildUrl(next_path);
      worker.test_path = next_path;
      worker.config.url = next_path;

      bsClient.changeUrl(worker.id, { url: url }, function () {
        callback(true);
      });

    } else {
      bsClient.terminateWorker(worker.id, function () {
        callback(false);
      });
    }
  }

  function getNextTestPath(worker) {
    if (!config.multipleTest) {
      return null;
    }
    return config.test_path[ ++worker.path_index ];
  }

  function getWorkerUuid(request) {
    var uuid = request.headers['x-worker-uuid'];

    uuid = uuid && uuid.replace(/[^a-zA-Z0-9\-]/, '');
    logger.trace('cleaning up worker uuid:', uuid);

    uuid = (uuid && typeof workers[uuid] === 'object') ? uuid : null;
    logger.trace('worker uuid', uuid, (uuid ? 'valid' : 'invalid'));

    return (uuid && workers[uuid]) ? uuid : null;
  }


  function sendError(response, errMessage, statusCode) {
    response.writeHead(statusCode || 400, {
      'Content-Type': 'text/plain'
    });

    if (errMessage) {
      response.write(errMessage + '\n');
    }

    response.end();
  }

  function externalScript(scriptPath) {
    var resolvedPath = resolve.sync(scriptPath, { basedir: __dirname });
    var scriptContents = fs.readFileSync(resolvedPath, { encoding: 'utf8' });
    return '<script type="text/javascript">' + scriptContents + '</script>';
  }

  var handlers = {
    '_progress': function progressHandler(uri, body, request, response) {
      var uuid = getWorkerUuid(request);

      if (!uuid) {
        sendError(response, 'worker not found', 404);
        return;
      }

      var worker = workers[uuid];
      var browserInfo = worker.getTestBrowserInfo();
      var query = null;

      try {
        query = CircularJSON.parse(body);
      } catch(e) {
        logger.info('[%s] Exception in parsing log', worker.string);
        logger.info('[%s] Log: ' + qs.parse(body).data, worker.string);
      }

      logger.trace('[%s] _progress', worker.id, CircularJSON.stringify(query));

      if (query && query.test && query.test.errors) {
        var browserReport = getBrowserReport(browserInfo);
        browserReport.tests.push(query.test || {});

        query.test.errors.forEach(function(error) {
          logger.info('[%s] ' + chalk.red('Error:'), browserInfo, formatTraceback({
            error: error,
            testName: query.test.name,
            suiteName: query.test.suiteName
          }));
        });
      }
      response.end();
    },

    '_report': function reportHandler(uri, body, request, response) {
      var uuid = getWorkerUuid(request);
      if (!uuid) {
        sendError(response, 'worker not found', 404);
        return;
      }


      var worker = workers[uuid];
      worker._worker_key = uuid;
      var browserInfo = worker.getTestBrowserInfo();

      var query = null;
      try {
        query = CircularJSON.parse(body);
      } catch (e) {}

      logger.trace('[%s] _report', worker.id, CircularJSON.stringify(query));

      if (query === null) {
        logger.info('[%s] Null response from remote Browser', request.headers['x-browser-string']);
      } else {
        var browserReport = getBrowserReport(browserInfo);
        browserReport.suites = query;

        var color;
        if(config['test_framework'] === 'jasmine') {
          color = ( query.total !== query.passed ) ? 'red' : 'green';
          logger.info('[%s] ' + chalk[color](( query.total !== query.passed ) ? 'Failed:' : 'Passed:') + ' %d tests, %d passed, %d failed; ran for %dms', browserInfo, query.total, query.passed, query.failed, query.runtime);
          config.status += query.failed;
          reformatJasmineReport(browserReport);
        } else if(query.testCounts) {
          color = query.status === 'failed' ? 'red' : 'green';
          logger.info('[%s] ' + chalk[color](query.status === 'failed' ? 'Failed:' : 'Passed:') + ' %d tests, %d passed, %d failed, %d skipped; ran for %dms', browserInfo, query.testCounts.total, query.testCounts.passed, query.testCounts.failed, query.testCounts.skipped, query.runtime);
          config.status += query.testCounts.failed;
        }
      }

      logger.trace('[%s] _report: client.takeScreenshot', worker.id);

      bsClient.takeScreenshot(worker.id, function(error, screenshot) {
        logger.trace('[%s] _report: client.takeScreenshot | response:', worker.id, screenshot, error);

        if (!error && screenshot.url && query && query.failed) {
          logger.info('[%s] ' + chalk.yellow('Screenshot:') + ' %s', browserInfo, screenshot.url);
        }

        checkAndTerminateWorker(worker, function(reusedWorker) {
          if (!workers[uuid]) {
            logger.trace('[%s] _report: checkAndTerminateWorker: worker not found', worker.id);
            return;
          }

          if (reusedWorker) {
            logger.trace('[%s] _report: checkAndTerminateWorker: reused worker', worker.id);
            logger.debug('[%s] Reused', browserInfo);
            worker.resetAck();
            worker.awaitAck();
            return;
          }

          logger.trace('[%s] _report: checkAndTerminateWorker: terminated', worker.id);
          logger.debug('[%s] Terminated', browserInfo);

          clearTimeout(workers[uuid].ackTimeout);
          clearTimeout(workers[uuid].activityTimeout);
          clearTimeout(workers[uuid].testActivityTimeout);
          delete workers[uuid];

          if (utils.objectSize(workers) === 0) {
            var color = config.status > 0 ? 'red' : 'green';
            logger.info(chalk[color]('All tests done, failures: %d.'), config.status);

            if (config.status > 0) {
              config.status = 1;
            }

            logger.trace('[%s] _report: checkAndTerminateWorker: all tests done', worker.id, config.status && 'with failures');
            callback(null, reports);
          }
        });
      });

      response.end();
    },
    '_log': function logHandler(uri, body, request, response) {
      var uuid = getWorkerUuid(request);
      var query = null;
      try {
        query = CircularJSON.parse(body);
      } catch (e) {
        query = body;
      }
      
      logger.trace('[%s] _log', ((uuid && workers[uuid]) || {}).id, query);

      var logged = false;

      if (query && Array.isArray(query.arguments)) {
        var context = { input: query.arguments, format: util.format, output: '' };
        var tryEvalOrString = 'function (arg) { try { return eval(\'o = \' + arg); } catch (e) { return arg; } }';

        try {
          // eval each element of query.arguments safely in an isolated context
          vm.runInNewContext('output = format.apply(null, input.map(' + tryEvalOrString + '));', context);
          logger.info('[' + request.headers['x-browser-string'] + '] ' + context.output);
          logged = true;
        } catch (e) {
          logger.debug('_log: failed to format console log data', query);
        }
      }

      if (!logged) {
        logger.info('[' + request.headers['x-browser-string'] + '] ' + query);
      }

      response.end();
    },
    '_patch': function patchHandler(uri, body, request, response) {
      var filePath = path.join(__dirname, uri);
      logger.trace('_patch', filePath);

      handleFile(filePath, request, response, true);
    },
    '_default': function defaultHandler(uri, body, request, response) {
      var filePath = path.join(process.cwd(), uri);
      logger.trace('_default', filePath);

      handleFile(filePath, request, response);
    }
  };


  return http.createServer(function(request, response) {
    var uri = url.parse(request.url).pathname;
    var method = uri.split('/')[1];
    var body = '';

    request.on('data', function(data) {
      body += data;
    });
    request.on('end', function() {
      (handlers[method] || handlers._default)(uri, body, request, response);
    });
  });
};

exports.logger = logger;
