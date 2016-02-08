var Log = require('./logger'),
  logger = new Log(global.logLevel),
  exec = require('child_process').execFile,
  fs = require('fs'),
  https = require('https'),
  windows = ((process.platform.match(/win32/) || process.platform.match(/win64/)) !== null),
  localBinary = __dirname + '/BrowserStackLocal' + (windows ? '.exe' : ''),
  utils = require('./utils'),
  config = require('./config');

var Tunnel = function Tunnel(key, port, uniqueIdentifier, callback) {
  var that = {};

  function tunnelLauncher() {
    var tunnelOptions = getTunnelOptions(key, uniqueIdentifier);

    if (typeof callback !== 'function') {
      callback = function(){};
    }

    logger.debug('[%s] Launching tunnel', new Date());

    var subProcess = exec(localBinary, tunnelOptions, function(error, stdout, stderr) {
      logger.debug(stderr);
      logger.debug(error);
      if (stdout.indexOf('Error') >= 0 || error) {
        logger.debug('[%s] Tunnel launching failed', new Date());
        logger.debug(stdout);
        process.exit('SIGINT');
      }
    });

    var data = '';
    var running = false;
    var runMatcher = 'You can now access your local server(s)';

    setTimeout(function() {
      if (!running) {
        utils.alertBrowserStack('Tunnel launch timeout', 'Stdout:\n' + data);
      }
    }, 30 * 1000);

    subProcess.stdout.on('data', function(_data) {
      if (running) {
        return;
      }

      data += _data;

      if (data.indexOf(runMatcher) >= 0) {
        running = true;
        logger.debug('[%s] Tunnel launched', new Date());
        setTimeout(function(){
          callback();
        }, 2000);
      }
    });

    that.process = subProcess;
  }

  function getTunnelOptions(key, uniqueIdentifier) {
    var options = [key];

    if (config.debug) {
      options.push('-v');
    }

    if (!uniqueIdentifier) {
      options.push('-force');
      options.push('-onlyAutomate');
    } else {
      options.push('-localIdentifier');
      options.push(uniqueIdentifier);
    }

    var proxy = config.proxy;

    if (proxy) {
      options.push('-proxyHost ' + proxy.host);
      options.push('-proxyPort ' + proxy.port);

      if (proxy.username && proxy.password) {
        options.push('-proxyUser ' + proxy.username);
        options.push('-proxyPass ' + proxy.password);
      }
    }

    return options;
  }

  function runTunnelCmd(tunnelOptions, subProcessTimeout, processOutputHook, callback) {
    var isRunning, subProcess, timeoutHandle;

    var callbackOnce = function (err, result) {
      clearTimeout(timeoutHandle);
      if (subProcess && isRunning) {
        try {
          process.kill(subProcess.pid, 'SIGKILL');
          subProcess = null;
        } catch (e) {
          logger.debug('[%s] failed to kill process:', new Date(), e);
        }
      }

      callback && callback(err, result);
      callback = null;
    };

    isRunning = true;

    try {
      subProcess = exec(localBinary, tunnelOptions, function (error, stdout) {
        isRunning = false;

        if (error) {
          callbackOnce(new Error('failed to get process output: ' + error));
        } else if (stdout) {
          processOutputHook(stdout, callbackOnce);
        }
      });

      subProcess.stdout.on('data', function (data) {
        processOutputHook(data, callbackOnce);
      });
    } catch (e) {
      // Handles EACCESS and other errors when binary file exists,
      // but doesn't have necessary permissions (among other issues)
      callbackOnce(new Error('failed to get process output: ' + e));
    }

    if (subProcessTimeout > 0) {
      timeoutHandle = setTimeout(function () {
        callbackOnce(new Error('failed to get process output: command timeout'));
      }, subProcessTimeout);
    }
  }

  function getTunnelBinaryVersion(callback) {
    var subProcessTimeout = 3000;

    runTunnelCmd([ '-version' ], subProcessTimeout, function (data, done) {
      var matches = /version\s+(\d+(\.\d+)*)/.exec(data);
      var version = (matches && matches.length > 2) && matches[1];
      logger.debug('[%s] Tunnel binary: found version', new Date(), version);

      done(isFinite(version) ? null : new Error('failed to get binary version'), parseFloat(version));
    }, callback);
  }

  function verifyTunnelBinary(callback) {
    logger.debug('[%s] Verifying tunnel binary', new Date());

    fs.exists(localBinary, function (exists) {
      if (!exists) {
        logger.debug('[%s] Verifying tunnel binary: file does not exist', new Date());
        callback(false);
      } else {
        getTunnelBinaryVersion(function (err, version) {
          callback(!err && isFinite(version));
        });
      }
    });
  }

  verifyTunnelBinary(function (exists) {
    if (exists) {
      tunnelLauncher();
      return;
    }
    logger.debug('Downloading BrowserStack Local to "%s"', localBinary);

    var file = fs.createWriteStream(localBinary);
    https.get('https://s3.amazonaws.com/browserStack/browserstack-local/BrowserStackLocal' + (windows ? '.exe' : '-' + process.platform + '-' + process.arch),
    function(response) {
      response.pipe(file);

      response.on('end', function() {
        fs.chmodSync(localBinary, 0700);
        setTimeout(function() {
          tunnelLauncher();
        }, 100);
      }).on('error', function(e) {
        logger.info('Got error while downloading binary: ' + e.message);
        process.exit('SIGINT');
      });
    });
  });

  return that;
};

exports.Tunnel = Tunnel;
