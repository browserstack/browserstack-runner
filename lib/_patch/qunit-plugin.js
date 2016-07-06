// For logging assertions on the console, here's what grunt-contrib-qunit uses:
// https://github.com/gruntjs/grunt-contrib-qunit/blob/784597023e7235337ca9c0651aa45124a2d72341/tasks/qunit.js#L45
(function (factory) {
  if (typeof define === 'function' && define.amd) {
    require(['qunit'], factory);
  } else {
    factory(QUnit);
  }
}(function(QUnit) {
  var runner = new JsReporters.QUnitAdapter(QUnit);
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

    BrowserStack.post("/_report", results, function(){});
  });
}));
