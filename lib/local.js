var Log = require('./logger'),
  logger = new Log(global.logLevel),
  exec = require('child_process').exec,
  fs = require('fs'),
  http = require('http'),
  windows = ((process.platform.match(/win32/) || process.platform.match(/win64/)) !== null),
  localBinary = process.cwd() + (windows ? '/BrowserStackTunnel.jar' : '/BrowserStackLocal'),
  utils = require('./utils'),
  config = require('./config');

var Tunnel = function Tunnel(key, port, uniqueIdentifier, callback, err) {
  var that = {};

  function tunnelLauncher() {
    var tunnelCommand = (windows ? 'java -jar ' : '') + localBinary + ' ';
    if (config.debug) tunnelCommand += ' -v ';
    tunnelCommand += key + ' ';
    tunnelCommand += 'localhost' + ',';
    tunnelCommand += port.toString() + ',';
    tunnelCommand += '0';
    tunnelCommand += (typeof uniqueIdentifier === 'undefined') ? ' -force -onlyAutomate' : ' -tunnelIdentifier ' + uniqueIdentifier;
    tunnelCommand += checkAndAddProxy();

    if (typeof callback !== 'function') {
      callback = function(){};
    }

    logger.debug("[%s] Launching tunnel", new Date());
    var subProcess = exec(tunnelCommand, function(error, stdout, stderr) {
      logger.debug(stderr);
      logger.debug(error);
      if (stdout.indexOf('Error') >= 0 || error) {
        logger.debug("[%s] Tunnel launching failed", new Date());
        logger.debug(stdout);
        process.kill(process.pid, 'SIGINT');
      }
    });

    var data = '';
    var running = false;
    var runMatcher = "You can now access your local server(s)";

    setTimeout(function() {
      if (!running) {
        utils.alertBrowserStack("Tunnel launch timeout", 'Stdout:\n' + data);
      }
    }, 30 * 1000);

    subProcess.stdout.on('data', function(_data) {
      if (running) {
        return;
      }

      data += _data;

      if (data.indexOf(runMatcher) >= 0) {
        running = true;
        logger.debug("[%s] Tunnel launched", new Date());
        callback();
      }
    });

    that.process = subProcess;
  }

  function checkAndAddProxy() {
    var proxy = config.proxy;
    if(typeof proxy == 'undefined') {
      return "";
    }
    var proxyCommand = "";
    proxyCommand += " -proxyHost " + proxy.host;
    proxyCommand += " -proxyPort " + proxy.port;
    if(typeof proxy.username !== 'undefined'){
      proxyCommand += " -proxyUser " + proxy.username;
      proxyCommand += " -proxyPass " + proxy.password;
    }
    return proxyCommand;
  }

  fs.exists(localBinary, function(exists) {
    if (exists) {
      tunnelLauncher();
      return;
    }
    logger.debug('Downloading BrowserStack Local to `%s`', localBinary);

    var file = fs.createWriteStream(localBinary);
    var request = http.get(
    (windows ? "http://www.browserstack.com/BrowserStackTunnel.jar" : ("http://s3.amazonaws.com/browserStack/browserstack-local/BrowserStackLocal-" + process.platform + "-" + process.arch)),
    function(response) {
      response.pipe(file);

      response.on('end', function() {
        fs.chmodSync(localBinary, 0700);
        setTimeout(function() {
          tunnelLauncher();
        }, 100);
      }).on('error', function(e) {
        logger.info("Got error while downloading binary: " + e.message);
        process.kill(process.pid, 'SIGINT');
      });
    });
  });

  return that;
};

exports.Tunnel = Tunnel;
