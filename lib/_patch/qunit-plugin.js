(function() {
  var failures = [];

  QUnit.log(function(details) {
    if (!details.result) {
      failures.push(JSON.stringify({
        module: details.module,
        name: details.name,
        message: details.message,
        expected: QUnit.jsDump.parse(details.expected),
        actual: QUnit.jsDump.parse(details.actual),
        source: details.source
      }));
    }
  });

  QUnit.done(function(results) {
    results.tracebacks = failures;
    results.url = window.location.pathname;
    BrowserStack.post("/_report", results, function(){});
  });
})();
