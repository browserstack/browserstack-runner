var Log = require('./logger'),
  logger = new Log(global.logLevel),
  http = require('http'),
  url = require('url'),
  path = require('path'),
  util = require('util'),
  fs = require('fs'),
  qs = require('querystring'),
  utils = require('./utils'),
  config = require('../lib/config'),
  proxyServer = require('./proxy').proxyServer,
  chalk = require('chalk'),
  mime = require('mime'),
  send = require('send'),
  vm = require('vm');


exports.Server = function Server(bsClient, workers) {

  var testFilePaths = (Array.isArray(config.test_path) ? config.test_path : [ config.test_path ])
    .map(function (path) {
      return path.split(/[?#]/)[0];
    });

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
        'qunit': ['qunit-plugin.js'],
        'jasmine': ['jasmine-jsreporter.js', 'jasmine-plugin.js'],
        'jasmine2': ['jasmine2-plugin.js'],
        'mocha': ['mocha-plugin.js']
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

        // adding framework scripts
        if (framework === 'jasmine') {
          framework_scripts['jasmine'].forEach(function(script) {
            patch += '<script type="text/javascript" src="/_patch/' + script + '"></script>\n';
          });
          patch += '<script type="text/javascript">jasmine.getEnv().addReporter(new jasmine.JSReporter());</script>\n';
        } else if (framework === 'jasmine2') {
          framework_scripts['jasmine2'].forEach(function(script) {
            patch += '<script type="text/javascript" src="/_patch/' + script + '"></script>\n';
          });
        } else if (framework === 'mocha') {
          framework_scripts['mocha'].forEach(function(script) {
            patch += '<script type="text/javascript" src="/_patch/' + script + '"></script>\n';
          });
          patch += '<script type="text/javascript">mocha.reporter(Mocha.BrowserStack);</script>\n';
        } else if (framework === 'qunit') {
          framework_scripts['qunit'].forEach(function(script) {
            patch += '<script type="text/javascript" src="/_patch/' + script + '"></script>\n';
          });
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

  function parseBody(body) {
    // TODO: Have better implementation
    return JSON.parse(qs.parse(body).data.escapeSpecialChars());
  }

  function formatTraceback(details) {
    // looks like QUnit data
    if (details.testName) {
      var output = '"' + details.testName + '" failed';
      if (details.message) {
        output += ', ' + details.message;
      }
      if (details.actual != null && details.expected != null) {
        output += '\n' + chalk.blue('Expected: ') + details.expected +
          '\n' + chalk.blue('  Actual: ') + details.actual;
      }
      if (details.source) {
        output += '\n' + chalk.blue('  Source: ') + '';
        output += details.source.split('\n').join('\n\t  ');
      }
      return output;
    }
    return details;
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


  var handlers = {
    '_progress': function progressHandler(uri, body, request, response) {
      var uuid = getWorkerUuid(request);
      if (!uuid) {
        sendError(response, 'worker not found', 404);
        return;
      }

      var worker = workers[uuid];
      var query = null;

      try {
        query = parseBody(body);
      } catch(e) {
        logger.info('[%s] Exception in parsing log', worker.string);
        logger.info('[%s] Log: ' + qs.parse(body).data, worker.string);
      }

      logger.trace('[%s] _progress', worker.id, query);

      if (query && query.tracebacks) {
        query.tracebacks.forEach(function(traceback) {
          logger.info('[%s] ' + chalk.red('Error:'), worker.getTestBrowserInfo(), formatTraceback(traceback));
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

      var query = null;
      try {
        query = parseBody(body);
      } catch (e) {}

      logger.trace('[%s] _report', worker.id, query);

      if (query === null) {
        logger.info('[%s] Null response from remote Browser', request.headers['x-browser-string']);
      } else {
        if (query.tracebacks && query.tracebacks.length > 0) {
          logger.info('[%s] ' + chalk['red']('Tracebacks:'), worker.getTestBrowserInfo());
          query.tracebacks.forEach(function(traceback) {
            logger.info(traceback);
          });
        }
        var color = query.failed ? 'red' : 'green';
        logger.info('[%s] ' + chalk[color](query.failed ? 'Failed:' : 'Passed:') + ' %d tests, %d passed, %d failed; ran for %dms', worker.getTestBrowserInfo(), query.total, query.passed, query.failed, query.runtime);
        config.status += query.failed;
      }

      logger.trace('[%s] _report: client.takeScreenshot', worker.id);

      bsClient.takeScreenshot(worker.id, function(error, screenshot) {
        logger.trace('[%s] _report: client.takeScreenshot | response:', worker.id, screenshot, error);

        if (!error && screenshot.url && query && query.failed) {
          logger.info('[%s] ' + chalk.yellow('Screenshot:') + ' %s', worker.getTestBrowserInfo(), screenshot.url);
        }

        checkAndTerminateWorker(worker, function(reusedWorker) {
          if (!workers[uuid]) {
            logger.trace('[%s] _report: checkAndTerminateWorker: worker not found', worker.id);
            return;
          }

          if (reusedWorker) {
            logger.trace('[%s] _report: checkAndTerminateWorker: reused worker', worker.id);
            logger.debug('[%s] Reused', worker.getTestBrowserInfo());
            worker.resetAck();
            worker.awaitAck();
            return;
          }

          logger.trace('[%s] _report: checkAndTerminateWorker: terminated', worker.id);
          logger.debug('[%s] Terminated', worker.getTestBrowserInfo());

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
            process.exit('SIGTERM');
          }
        });
      });

      response.end();
    },
    '_log': function logHandler(uri, body, request, response) {
      var uuid = getWorkerUuid(request);
      var query = parseBody(body);
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
