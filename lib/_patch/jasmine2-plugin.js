(function() {
  var runner = new JsReporters.JasmineAdapter(jasmine.getEnv());
  var tracebacks = [];
  var total = 0,
      passed = 0,
      failed = 0;

  runner.on('testEnd', function(test) {
    total = total + 1

    passed = passed + (test.status === 'passed' ? 1 : 0);
    failed = failed + (test.status === 'failed' ? 1 : 0);

    test.errors.forEach(function(error) {
      tracebacks.push(error)
    });
  });

  runner.on('runEnd', function(globalSuite) {
    var results = {};

    results.runtime = globalSuite.runtime;
    results.total = total;
    results.passed = passed;
    results.failed = failed;
    results.tracebacks = tracebacks;
    results.url = window.location.pathname;

    BrowserStack.post("/_report", results, function() {});
  });
})();

