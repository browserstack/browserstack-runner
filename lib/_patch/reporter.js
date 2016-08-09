(function() {
  var runner;

  if (window.QUnit) {
    runner = new JsReporters.QUnitAdapter(QUnit);
  } else if (window.jasmine) {
    runner = new JsReporters.JasmineAdapter(jasmine.getEnv());
  } else if (window.mocha) {
    runner = new JsReporters.MochaAdapter(mocha);
  } else {
    throw new Error('JsReporters: No testing framework was found');
  }

  runner.on('testEnd', function(test) {
    BrowserStack.post("/_progress", {
      test: test
    });
  });

  runner.on('runEnd', function(globalSuite) {
    BrowserStack.post("/_report", globalSuite, function() {});
  });
})();

