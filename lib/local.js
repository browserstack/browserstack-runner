var exec = require('child_process').exec,
    fs = require('fs'),
    http = require('http'),
    windows = (process.platform.match(/win/) != null),
    localBinary = __dirname + (windows ? '/BrowserStackTunnel.jar' : '/BrowserStackLocal'),
    utils = require('./utils'),
    config = require('./config');

var Tunnel = function Tunnel (key, port, uniqueIdentifier, callback, err) {
  var that = {};

  function tunnelLauncher () {
    var tunnelCommand = (windows ? 'java -jar ' : '') + localBinary + ' ';
    if (config.debug)
      tunnelCommand += ' -v ';
    tunnelCommand += key + ' ';
    tunnelCommand += 'localhost' + ',';
    tunnelCommand += port.toString() + ',';
    tunnelCommand += '0';
    tunnelCommand += (typeof uniqueIdentifier === 'undefined')? ' -force -onlyAutomate' : ' -tunnelIdentifier ' + uniqueIdentifier;

    if (typeof callback !== 'function') {
      callback = function () {};
    }

    console.log("[%s] Launching tunnel", new Date());
    var subProcess = exec(tunnelCommand, function (error, stdout, stderr) {
      console.log(stderr);
      console.log(error);
      if (stdout.indexOf('Error') >= 0) {
        console.log("[%s] Tunnel launching failed", new Date());
        console.log(stdout);
        process.exit(1);
      }
    });

    var data = '';
    var running = false;
    var runMatcher = "You can now access your local server(s)";

    setTimeout(function () {
      if (!running) {
        utils.alertBrowserStack("Tunnel launch timeout", 'Stdout:\n' + data);
      }
    }, 30 * 1000);

    subProcess.stdout.on('data', function (_data) {
      if (running) {
        return;
      }

      data += _data;

      if (data.indexOf(runMatcher) >= 0) {
        running = true;
        console.log("[%s] Tunnel launched", new Date());
        callback();
      }
    });

    that.process = subProcess;
  }

  fs.exists(localBinary, function (exists) {
    if (exists) {
      fs.unlinkSync(localBinary);
      // tunnelLauncher();
      // return;
    }
    console.log('Downloading BrowserStack Local to `%s`', localBinary);

    var file = fs.createWriteStream(localBinary);
    var request = http.get(
      (windows ? "http://www.browserstack.com/BrowserStackTunnel.jar" : ("http://s3.amazonaws.com/browserStack/browserstack-local/BrowserStackLocal-" + process.platform + "-" + process.arch)),
      function(response) {
        response.pipe(file);

        response.on('end', function () {
          fs.chmodSync(localBinary, 0700);
          setTimeout(function() {tunnelLauncher();}, 100);
        });
      }
    );
  });

  return that;
}

exports.Tunnel = Tunnel;
