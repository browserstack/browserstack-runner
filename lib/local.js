var Log = require('./logger'),
  logger = new Log(global.logLevel),
  exec = require('child_process').execFile,
  fs = require('fs'),
  http = require('http'),
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

  fs.exists(localBinary, function(exists) {
    if (exists) {
      tunnelLauncher();
      return;
    }
    logger.debug('Downloading BrowserStack Local to "%s"', localBinary);

    var file = fs.createWriteStream(localBinary);
    http.get((windows ? 'http://s3.amazonaws.com/browserStack/browserstack-local/BrowserStackLocal.exe' : ('http://s3.amazonaws.com/browserStack/browserstack-local/BrowserStackLocal-' + process.platform + '-' + process.arch)),
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
