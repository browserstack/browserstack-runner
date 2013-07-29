var exec = require('child_process').exec;


var Tunnel = function Tunnel (key, port, callback, err) {
  var tunnelCommand = 'java -jar ~/.browserstack/BrowserStackTunnel.jar ';
  tunnelCommand += key + ' ';
  tunnelCommand += 'localhost' + ',';
  tunnelCommand += port.toString() + ',';
  tunnelCommand += '0';

  if (typeof callback !== 'function') {
    callback = function () {};
  }

  console.log("Launching tunnel..");
  var process = exec(tunnelCommand, function (error, stdout, stderr) {
    if (stdout.indexOf('Error') >= 0) {
      console.log("..Failed");
      console.log(stdout);
    }
  });

  var data = '';
  var running = false;
  var runMatcher = "You can now access your local server(s)";

  process.stdout.on('data', function (_data) {
    if (running) {
      return;
    }

    data += _data;

    if (data.indexOf(runMatcher) >= 0) {
      running = true;
      console.log("..Done");
      callback();
    }

    running = true;
  });

  var that = {
    process: process,
  };

  return that;
}

exports.Tunnel = Tunnel;
