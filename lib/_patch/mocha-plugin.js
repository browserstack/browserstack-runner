(function() {
  function stack(err) {
    var str = err.stack || err.toString();

    if (!~str.indexOf(err.message)) {
      str = err.message + '\n' + str;
    }

    if ('[object Error]' == str) {
      str = err.message;
    }

    if (!err.stack && err.sourceURL && err.line !== undefined) {
      str += '\n(' + err.sourceURL + ':' + err.line + ')';
    }
    return str.replace(/^/gm, '  ');
  }

  function title(test) {
    return test.fullTitle().replace(/#/g, '');
  }

  var origReporter = mocha._reporter;

  Mocha.BrowserStack = function(runner, root) {
    origReporter.apply(this, arguments);

    var count = 1,
      that = this,
      failures = 0,
      passes = 0,
      start = 0,
      tracebacks = [];

    runner.on('start', function() {
      start = (new Date).getTime();
    });

    runner.on('test end', function(test) {
      count += 1;
    });

    runner.on('pass', function(test) {
      passes += 1;
    });

    runner.on('fail', function(test, err) {
      failures += 1;

      if (err) {
        tracebacks.push(err);
      }
    });

    runner.on('end', function() {
      results = {};
      results.runtime = (new Date).getTime() - start;
      results.total = passes + failures;
      results.passed = passes;
      results.failed = failures;
      results.tracebacks = tracebacks;
      results.url = window.location.pathname;
      BrowserStack.post("/_report", results, function(){});
    });
  };

  Mocha.BrowserStack.prototype = origReporter.prototype;

  return Mocha.BrowserStack;
})();
