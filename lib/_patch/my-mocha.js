(function() {
  var runner = new JsReporters.MochaAdapter(mocha);
  var errors = []
  var passed = 0, failed = 0, total = 0;
  var startTime;

  runner.on('runStart', function() {
    startTime = new Date()
  });

  runner.on('testEnd', function(test) {
    total = total + 1;

    passed = passed + (test.status === 'passed' ? 1 : 0);
    failed = failed + (test.status === 'failed' ? 1 : 0);

    test.errors.forEach(function(error) {
      errors.push(error)
    });
  });

  runner.on('runEnd', function() {
    var results = {}

    results.runtime = new Date() - startTime;
    results.total = total;
    results.passed = passed;
    results.failed = failed;
    results.tracebacks = errors;
    results.url = window.location.pathname;

    BrowserStack.post("/_report", results, function() {});
  });
})();
