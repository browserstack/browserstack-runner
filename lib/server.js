var Log = require('./logger'),
  logger = new Log(global.logLevel),
  http = require("http"),
  url = require("url"),
  path = require("path"),
  fs = require("fs"),
  qs = require("querystring"),
  utils = require("./utils"),
  config = require('../lib/config'),
  exec = require('child_process').exec,
  chalk = require('chalk');

var mimeTypes = {
  "html": "text/html",
  "json": "text/json",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "png": "image/png",
  "js": "text/javascript",
  "css": "text/css"
};

function getTestBrowserInfo(worker) {
  var info = worker.string;
  if(config.multipleTest) {
    info += ", " + worker.test_path
  }
  return info;
}

// ECMASCript 6 Polyfill
//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
if (!Array.prototype.find) {
  Object.defineProperty(Array.prototype, 'find', {
    enumerable: false,
	configurable: true,
	writable: true,
	value: function(predicate) {
	  if (this == null) {
	    throw new TypeError('Array.prototype.find called on null or undefined');
	  }
	  if (typeof predicate !== 'function') {
	    throw new TypeError('predicate must be a function');
	  }
	  var list = Object(this);
	  var length = list.length >>> 0;
	  var thisArg = arguments[1];
	  var value;

	  for (var i = 0; i < length; i++) {
	    if (i in list) {
	      value = list[i];
		  if (predicate.call(thisArg, value, i, list)) {
		    return value;
		  }
		}
	  }
	  return undefined;
	}
  });
}

exports.Server = function Server(bsClient, workers) {

  function handleFile(filename, request, response) {
    var url_parts = url.parse(request.url, true);
    var query = url_parts.query;

    if (query._worker_key && workers[query._worker_key]) {
      worker = workers[query._worker_key] || {};
      worker.acknowledged = true;
      logger.debug("[%s] Acknowledged", getTestBrowserInfo(worker));
    }

    fs.exists(filename, function(exists) {
      if (!exists) {
        response.writeHead(404, {
          "Content-Type": "text/plain"
        });
        response.write("404 Not Found\n");
        response.end();
        return;
      }

      if (fs.lstatSync(filename).isDirectory()) {
        filename = filename + (filename.lastIndexOf('/') == filename.length - 1 ? "" : "/") + "index.html";
      }

      fs.readFile(filename, {encoding: 'utf8'}, function(err, file) {

        if (err) {
          response.writeHead(500, {
            "Content-Type": "text/plain"
          });
          response.write(err + "\n");
          response.end();
          return;
        }

        var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
        response.writeHead(200, {
          "Content-Type": mimeType + "; charset=utf-8",
        });

        scripts = [
          'json2.js',
          'browserstack.js',
        ];

        framework_scripts = {
          'qunit': ['qunit-plugin.js'],
          'jasmine': ['jasmine-jsreporter.js', 'jasmine-plugin.js'],
          'jasmine2': ['jasmine2-plugin.js'],
          'mocha': ['mocha-plugin.js']
        };

        var filePath = path.relative(process.cwd(), filename);
        var pathMatches;

		if (typeof config.test_path === 'object') {
		  pathMatches = config.test_path.find(function (path){
		    return path.indexOf(filePath) !== -1;
		  });
		} else {
	      pathMatches = (config.test_path.indexOf(filePath) !== -1);
		}

        if (pathMatches && mimeType === 'text/html') {
          var framework = config['test_framework'];
          var tag_name = (framework === "mocha") ? "head" : "body";
          var matcher = new RegExp("(.*)<\/" + tag_name + ">"); ///(.*)<\/body>/;
          var patch = "$1";
          scripts.forEach(function(script) {
            patch += "<script type='text/javascript' src='/_patch/" + script + "'></script>\n";
          });

          // adding framework scripts
          if (framework === "jasmine") {
            framework_scripts['jasmine'].forEach(function(script) {
              patch += "<script type='text/javascript' src='/_patch/" + script + "'></script>\n";
            });
            patch += "<script type='text/javascript'>jasmine.getEnv().addReporter(new jasmine.JSReporter());</script>\n";
          } else if (framework === "jasmine2") {
            framework_scripts['jasmine2'].forEach(function(script) {
              patch += "<script type='text/javascript' src='/_patch/" + script + "'></script>\n";
            });
          } else if (framework === "mocha") {
            framework_scripts['mocha'].forEach(function(script) {
              patch += "<script type='text/javascript' src='/_patch/" + script + "'></script>\n";
            });
            patch += "<script type='text/javascript'>mocha.reporter(Mocha.BrowserStack);</script>\n";
          } else {
            framework_scripts['qunit'].forEach(function(script) {
              patch += "<script type='text/javascript' src='/_patch/" + script + "'></script>\n";
            });
          }
          patch += "</" + tag_name + ">";

          file = file.replace(matcher, patch);
        }


        response.write(file);
        response.end();
      });
    });
  }

  function parseBody(body) {
    // TODO: Have better implementation
    return JSON.parse(qs.parse(body).data.escapeSpecialChars());
  }

  function formatTraceback(details) {
    // looks like QUnit data
    if (details.testName) {
      var output = "'" + details.testName + "' failed";
      if (details.message) {
        output += ", " + details.message;
      }
      if (details.actual && details.expected) {
        output += "\n" + chalk.blue("Expected: ") + details.expected +
          "\n" + chalk.blue("  Actual: ") + details.actual;
      }
      if (details.source) {
        output += "\n" + chalk.blue("  Source: ") + "";
        output += details.source.split("\n").join("\n\t  ");
      }
      return output;
    }
    return details;
  }

  function checkAndTerminateWorker(worker, callback) {
    var next_path = getNextTestPath(worker);
    if (next_path) {
      var url = 'http://localhost:' + 8888 + '/' + next_path;
      if (url.indexOf('?') > 0) {
        url += '&';
      } else {
        url += '?';
      }
      url += "_worker_key=" + worker._worker_key + "&_browser_string=" + getTestBrowserInfo(worker) ;
      worker.test_path = next_path;
      bsClient.changeUrl(worker.id, {url: url}, function() {
        callback(true);
      });
    } else {
      bsClient.terminateWorker(worker.id, callback);
    }
  };

  function getNextTestPath(worker) {
    if (!config.multipleTest) {
      return null;
    }
    return config.test_path[ ++worker.path_index ];
  }

  handlers = {
    "_progress": function progressHandler(uri, body, request, response) {
      var uuid = request.headers['x-worker-uuid'];
      var worker = workers[uuid] || {};
      query = "";
      try {
        query = parseBody(body);
      } catch(e) {
        logger.info("[%s] Exception in parsing log", worker.string);
        logger.info("[%s] Log: " + qs.parse(body).data, worker.string);
      }

      if (query.tracebacks) {
        query.tracebacks.forEach(function(traceback) {
          logger.info(chalk.red("[%s] Error:"), getTestBrowserInfo(worker), formatTraceback(traceback));
        });
      }
      response.end();
    },

    "_report": function reportHandler(uri, body, request, response) {
      query = null;
      try {
        query = parseBody(body);
      } catch (e) {}
      var uuid = request.headers['x-worker-uuid'];
      var worker = workers[uuid] || {};
      worker._worker_key = uuid;

      if (query === null) {
        logger.info("[%s] Null response from remote Browser", request.headers['x-browser-string']);
      } else {
        if (query.tracebacks && query.tracebacks.length > 0) {
          logger.info(chalk["red"]("[%s] Tracebacks:"), getTestBrowserInfo(worker));
          query.tracebacks.forEach(function(traceback) {
            logger.info(traceback);
          });
        }
        var color = query.failed ? "red" : "green";
        logger.info(chalk[color]("[%s] Completed in %d milliseconds. %d of %d passed, %d failed."), getTestBrowserInfo(worker), query.runtime, query.passed, query.total, query.failed);
        config.status += query.failed;
      }

      if (worker) {
        bsClient.takeScreenshot(worker.id, function(error, screenshot) {
          if (!error && screenshot.url) {
            logger.info('[%s] ' + chalk['yellow']('Screenshot') + ': %s', getTestBrowserInfo(worker), screenshot.url);
          }

          checkAndTerminateWorker(worker, function(reusedWorker) {
            if (!workers[uuid]) {
              return;
            }

            if (reusedWorker) {
              logger.debug('[%s] Reused', getTestBrowserInfo(worker));
              return;
            }

            logger.debug('[%s] Terminated', getTestBrowserInfo(worker));

            clearTimeout(workers[uuid].activityTimeout);
            clearTimeout(workers[uuid].testActivityTimeout);
            delete workers[uuid];

            if (utils.objectSize(workers) === 0) {
              var color = config.status > 0 ? "red" : "green";
              logger.info(chalk[color]("All tests done, failures: %d."), config.status);

              if (config.status > 0) {
                config.status = 1;
              }

              process.kill(process.pid, 'SIGTERM');
            }
          });
        });
      }

      response.end();
    },
    "_log": function logHandler(uri, body, request, response) {
      query = parseBody(body);
      logger.info('[' + request.headers['x-browser-string'] + '] ' + query);
      response.end();
    },
    "_patch": function patchHandler(uri, body, request, response) {
      handleFile(path.join(__dirname, uri), request, response);
    },
    "_default": function defaultHandler(uri, body, request, response) {
      handleFile(path.join(process.cwd(), uri), request, response);
    }
  };


  return http.createServer(function(request, response) {
    var uri = url.parse(request.url).pathname;
    var method = uri.split('/')[1];
    var filename;

    var body = '';

    request.on('data', function(data) {
      body += data;
    });
    request.on('end', function() {
      (handlers[method] || handlers._default)(uri, body, request, response);
    });
  });
};
