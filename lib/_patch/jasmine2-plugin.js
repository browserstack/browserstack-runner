(function() {
  var checker = setInterval(function() {
    if (!jasmine.running) {
      var results = {};
      var specs = jsApiReporter.specs();
      results.runtime = jsApiReporter.executionTime();
      results.total = 0;
      results.passed = 0;
      results.failed = 0;
      results.tracebacks = [];

      for (var spec in specs) {
        if (specs[spec].status === 'passed') {
            results.passed++;
        } else {
            results.tracebacks.push(specs[spec].description);
            results.failed++;
        }
      }

      results.total = results.passed + results.failed;
      results.url = window.location.pathname;
      BrowserStack.post('/_report', results, function(){});
    }
    clearInterval(checker);
  }, 1000);
})();

