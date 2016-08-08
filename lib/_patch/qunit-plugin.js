// For logging assertions on the console, here's what grunt-contrib-qunit uses:
// https://github.com/gruntjs/grunt-contrib-qunit/blob/784597023e7235337ca9c0651aa45124a2d72341/tasks/qunit.js#L45
(function (factory) {
  if (typeof define === 'function' && define.amd) {
    require(['qunit'], factory);
  } else {
    factory(QUnit);
  }
}(function(QUnit) {
  var failedAssertions = [];
  var options,
    currentModule,
    currentTest,
    setTimeoutVariable;
  var pendingTest = {};

  var testTimeout = function() {
    var error = {
      testName: currentTest,
      message: "Stuck on this test for 60 sec."
    };

    BrowserStack.post('/_progress', {
      tracebacks: [error]
    }, function(){});
  };

  QUnit.testDone(function(details) {
    var ct = details.module + " - " + details.name;
    clearTimeout(pendingTest[ct]);
  });

  QUnit.testStart(function(details) {
    currentTest = details.module + " - " + details.name;
    pendingTest[currentTest] = setTimeout(function() {
      testTimeout(currentTest);
    }, 60000);
  });

  QUnit.log(function(details) {
    if (details.result) {
      return;
    }

    var error = {
      actual: details.actual,
      expected: details.expected,
      message: details.message,
      source: details.source,
      testName:( details.module + ": " + details.name)
    };

    BrowserStack.post('/_progress', {
      tracebacks: [error]
    }, function(){});
  });

  QUnit.done(function(results) {
    results.url = window.location.pathname;
    BrowserStack.post("/_report", results, function(){});
  });
}));
