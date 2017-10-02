(function() {
  var runner;

  if (window.QUnit) {
    runner = new JsReporters.QUnitAdapter(QUnit);
  } else if (window.jasmine) {
    runner = new JsReporters.JasmineAdapter(jasmine.getEnv());
  } else if (window.mocha) {
    runner = new JsReporters.MochaAdapter(mocha);
  } else if (window.nodeunit) {
    console.log('nodeunit adapter');

    runner = {
      _events: {},
      on: function (tag, cb) {
        this._events[tag] = cb;
      },
      emit: function (tag, data) {
        if (this._events[tag]) this._events[tag](data);
      }
    };

    var _runModules = nodeunit.runModules;

    nodeunit.runModules = function (modules, opt) {
        var _opt = {};

        for (var k in opt) {
          if (Object.prototype.hasOwnProperty.call(opt, k)) {
            _opt[k] = opt[k];
          }
        }

        var suites = [], tests = [];

        _opt.testDone = function (name, assertions) {
          //console.log('_opt.testDone', name, assertions);
          var failures = assertions.failures(), errors = [], asserts = [];

          for (var i = 0; i < assertions.length; i++) {
            var a = assertions[i];

            (a.failed() ? errors : asserts).push(new JsReporters.Assertion(
              !a.failed(),
              '',
              '',
              a.message || a.method || 'no message',
              a.error && a.error.stack ? a.error.stack : undefined
            ));
          }

          var test = new JsReporters.Test(name, undefined, [],
            failures ? 'failed' : 'passed',
            assertions.duration, errors, asserts);

          tests.push(test);

          //console.log('emit(testEnd)', test);
          runner.emit('testEnd', test);

          if (opt.testDone) opt.testDone(name, assertions);
        }

        _opt.done = function (assertions) {
            //console.log('_opt.done', assertions);
            var suite = new JsReporters.Suite(undefined, [], suites, tests);

            //console.log('emit(runEnd)', suite);
            runner.emit('runEnd', suite);

            opt.done(assertions);
        };

        return _runModules(modules, _opt);
    };
  } else {
    throw new Error('JsReporters: No testing framework was found');
  }

  runner.on('testEnd', function(eachTest) {
    BrowserStack.post("/_progress", {
      'test': eachTest
    }, function() {});
  });

  runner.on('runEnd', function(globalSuite) {
    BrowserStack.post("/_report", globalSuite, function() {});
  });
})();

