/**
 * JsReporters 1.0.0
 * https://github.com/js-reporters
 *
 * Copyright jQuery Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: Wed Jul 06 2016
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.JsReporters = factory());
}(this, function () { 'use strict';

  function __commonjs(fn, module) { return module = { exports: {} }, fn(module, module.exports), module.exports; }


  var babelHelpers = {};
  babelHelpers.typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
  };

  babelHelpers.classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  babelHelpers.createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  babelHelpers.inherits = function (subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  };

  babelHelpers.possibleConstructorReturn = function (self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  };

  babelHelpers.slicedToArray = function () {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"]) _i["return"]();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    return function (arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError("Invalid attempt to destructure non-iterable instance");
      }
    };
  }();

  babelHelpers;

  var events = __commonjs(function (module) {
    // Copyright Joyent, Inc. and other Node contributors.
    //
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the
    // "Software"), to deal in the Software without restriction, including
    // without limitation the rights to use, copy, modify, merge, publish,
    // distribute, sublicense, and/or sell copies of the Software, and to permit
    // persons to whom the Software is furnished to do so, subject to the
    // following conditions:
    //
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    //
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    // MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
    // NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
    // DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
    // OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
    // USE OR OTHER DEALINGS IN THE SOFTWARE.

    function EventEmitter() {
      this._events = this._events || {};
      this._maxListeners = this._maxListeners || undefined;
    }
    module.exports = EventEmitter;

    // Backwards-compat with node 0.10.x
    EventEmitter.EventEmitter = EventEmitter;

    EventEmitter.prototype._events = undefined;
    EventEmitter.prototype._maxListeners = undefined;

    // By default EventEmitters will print a warning if more than 10 listeners are
    // added to it. This is a useful default which helps finding memory leaks.
    EventEmitter.defaultMaxListeners = 10;

    // Obviously not all Emitters should be limited to 10. This function allows
    // that to be increased. Set to zero for unlimited.
    EventEmitter.prototype.setMaxListeners = function (n) {
      if (!isNumber(n) || n < 0 || isNaN(n)) throw TypeError('n must be a positive number');
      this._maxListeners = n;
      return this;
    };

    EventEmitter.prototype.emit = function (type) {
      var er, handler, len, args, i, listeners;

      if (!this._events) this._events = {};

      // If there is no 'error' event listener then throw.
      if (type === 'error') {
        if (!this._events.error || isObject(this._events.error) && !this._events.error.length) {
          er = arguments[1];
          if (er instanceof Error) {
            throw er; // Unhandled 'error' event
          }
          throw TypeError('Uncaught, unspecified "error" event.');
        }
      }

      handler = this._events[type];

      if (isUndefined(handler)) return false;

      if (isFunction(handler)) {
        switch (arguments.length) {
          // fast cases
          case 1:
            handler.call(this);
            break;
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            args = Array.prototype.slice.call(arguments, 1);
            handler.apply(this, args);
        }
      } else if (isObject(handler)) {
        args = Array.prototype.slice.call(arguments, 1);
        listeners = handler.slice();
        len = listeners.length;
        for (i = 0; i < len; i++) {
          listeners[i].apply(this, args);
        }
      }

      return true;
    };

    EventEmitter.prototype.addListener = function (type, listener) {
      var m;

      if (!isFunction(listener)) throw TypeError('listener must be a function');

      if (!this._events) this._events = {};

      // To avoid recursion in the case that type === "newListener"! Before
      // adding it to the listeners, first emit "newListener".
      if (this._events.newListener) this.emit('newListener', type, isFunction(listener.listener) ? listener.listener : listener);

      if (!this._events[type])
        // Optimize the case of one listener. Don't need the extra array object.
        this._events[type] = listener;else if (isObject(this._events[type]))
        // If we've already got an array, just append.
        this._events[type].push(listener);else
        // Adding the second element, need to change to array.
        this._events[type] = [this._events[type], listener];

      // Check for listener leak
      if (isObject(this._events[type]) && !this._events[type].warned) {
        if (!isUndefined(this._maxListeners)) {
          m = this._maxListeners;
        } else {
          m = EventEmitter.defaultMaxListeners;
        }

        if (m && m > 0 && this._events[type].length > m) {
          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' + 'leak detected. %d listeners added. ' + 'Use emitter.setMaxListeners() to increase limit.', this._events[type].length);
          if (typeof console.trace === 'function') {
            // not supported in IE 10
            console.trace();
          }
        }
      }

      return this;
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.once = function (type, listener) {
      if (!isFunction(listener)) throw TypeError('listener must be a function');

      var fired = false;

      function g() {
        this.removeListener(type, g);

        if (!fired) {
          fired = true;
          listener.apply(this, arguments);
        }
      }

      g.listener = listener;
      this.on(type, g);

      return this;
    };

    // emits a 'removeListener' event iff the listener was removed
    EventEmitter.prototype.removeListener = function (type, listener) {
      var list, position, length, i;

      if (!isFunction(listener)) throw TypeError('listener must be a function');

      if (!this._events || !this._events[type]) return this;

      list = this._events[type];
      length = list.length;
      position = -1;

      if (list === listener || isFunction(list.listener) && list.listener === listener) {
        delete this._events[type];
        if (this._events.removeListener) this.emit('removeListener', type, listener);
      } else if (isObject(list)) {
        for (i = length; i-- > 0;) {
          if (list[i] === listener || list[i].listener && list[i].listener === listener) {
            position = i;
            break;
          }
        }

        if (position < 0) return this;

        if (list.length === 1) {
          list.length = 0;
          delete this._events[type];
        } else {
          list.splice(position, 1);
        }

        if (this._events.removeListener) this.emit('removeListener', type, listener);
      }

      return this;
    };

    EventEmitter.prototype.removeAllListeners = function (type) {
      var key, listeners;

      if (!this._events) return this;

      // not listening for removeListener, no need to emit
      if (!this._events.removeListener) {
        if (arguments.length === 0) this._events = {};else if (this._events[type]) delete this._events[type];
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        for (key in this._events) {
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = {};
        return this;
      }

      listeners = this._events[type];

      if (isFunction(listeners)) {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        while (listeners.length) {
          this.removeListener(type, listeners[listeners.length - 1]);
        }
      }
      delete this._events[type];

      return this;
    };

    EventEmitter.prototype.listeners = function (type) {
      var ret;
      if (!this._events || !this._events[type]) ret = [];else if (isFunction(this._events[type])) ret = [this._events[type]];else ret = this._events[type].slice();
      return ret;
    };

    EventEmitter.prototype.listenerCount = function (type) {
      if (this._events) {
        var evlistener = this._events[type];

        if (isFunction(evlistener)) return 1;else if (evlistener) return evlistener.length;
      }
      return 0;
    };

    EventEmitter.listenerCount = function (emitter, type) {
      return emitter.listenerCount(type);
    };

    function isFunction(arg) {
      return typeof arg === 'function';
    }

    function isNumber(arg) {
      return typeof arg === 'number';
    }

    function isObject(arg) {
      return (typeof arg === 'undefined' ? 'undefined' : babelHelpers.typeof(arg)) === 'object' && arg !== null;
    }

    function isUndefined(arg) {
      return arg === void 0;
    }
  });

  var EventEmitter = events && (typeof events === 'undefined' ? 'undefined' : babelHelpers.typeof(events)) === 'object' && 'default' in events ? events['default'] : events;

  var Test = function Test(testName, suiteName, status, runtime, errors) {
    babelHelpers.classCallCheck(this, Test);

    this.testName = testName;
    this.suiteName = suiteName;
    this.status = status;
    this.runtime = runtime;
    this.errors = errors;
  };

  var Suite = function () {

    /**
     *
     * @param name
     * @param childSuites
     * @param tests: array containing tests belonging to the suite but not to a child suite
     */

    function Suite(name, childSuites, tests) {
      babelHelpers.classCallCheck(this, Suite);

      this.name = name;
      this.childSuites = childSuites;
      this.tests = tests;
    }

    babelHelpers.createClass(Suite, [{
      key: 'getAllTests',
      value: function getAllTests() {
        var childSuiteTests = this.childSuites.map(function (suite) {
          return suite.getAllTests();
        }).reduce(function (allTests, a) {
          return allTests.concat(a);
        }, []);

        return this.tests.concat(childSuiteTests);
      }
    }, {
      key: 'runtime',
      get: function get() {
        var status = this.status;

        if (status === 'skipped' || status === undefined) {
          return undefined;
        }

        var runtime = this.getAllTests().map(function (test) {
          return test.status === 'skipped' ? 0 : test.runtime;
        }).reduce(function (sum, testRuntime) {
          return sum + testRuntime;
        }, 0);

        return runtime;
      }
    }, {
      key: 'status',
      get: function get() {
        var passed = 0;
        var failed = 0;
        var skipped = 0;

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = this.getAllTests()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var test = _step.value;

            // If a suite contains a test whose status is still undefined,
            // there is no final status for the suite as well.
            if (test.status === undefined) {
              return undefined;
            } else if (test.status === 'passed') {
              passed++;
            } else if (test.status === 'skipped') {
              skipped++;
            } else {
              failed++;
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        if (failed > 0) {
          return 'failed';
        } else if (skipped > 0 && passed === 0) {
          return 'skipped';
        } else {
          return 'passed';
        }
      }
    }]);
    return Suite;
  }();

  Object.defineProperties(Suite.prototype, {
    toJSON: {
      value: function value() {
        var ret = {};
        for (var x in this) {
          ret[x] = this[x];
        }
        return ret;
      }
    },
    runtime: {
      enumerable: true
    },
    status: {
      enumerable: true
    }
  });

  var QUnitAdapter = function (_EventEmitter) {
    babelHelpers.inherits(QUnitAdapter, _EventEmitter);

    function QUnitAdapter(QUnit) {
      babelHelpers.classCallCheck(this, QUnitAdapter);

      var _this = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(QUnitAdapter).call(this));

      _this.QUnit = QUnit;
      _this.tests = {};

      QUnit.begin(_this.onBegin.bind(_this));
      QUnit.testStart(_this.onTestStart.bind(_this));
      QUnit.log(_this.onLog.bind(_this));
      QUnit.testDone(_this.onTestDone.bind(_this));
      QUnit.done(_this.onDone.bind(_this));
      return _this;
    }

    babelHelpers.createClass(QUnitAdapter, [{
      key: 'convertModule',
      value: function convertModule(qunitModule) {
        var _this2 = this;

        return new Suite(qunitModule.name, [], qunitModule.tests.map(function (qunitTest) {
          var test = new Test(qunitTest.name, qunitModule.name.replace(/> /g, ''));

          _this2.tests[qunitTest.testId] = test;

          return test;
        }));
      }
    }, {
      key: 'saveTestDetails',
      value: function saveTestDetails(qunitTest) {
        var test = this.tests[qunitTest.testId];

        test.errors = this.errors;

        if (qunitTest.failed > 0) {
          test.status = 'failed';
        } else if (qunitTest.skipped) {
          test.status = 'skipped';
        } else {
          test.status = 'passed';
        }

        // Workaround for QUnit skipped tests runtime which is a Number.
        if (test.status !== 'skipped') {
          test.runtime = qunitTest.runtime;
        } else {
          test.runtime = undefined;
        }
      }
    }, {
      key: 'createGlobalSuite',
      value: function createGlobalSuite() {
        var topLevelSuites = [];
        var globalSuite;
        var modules;

        // Access QUnit internals to get all suites and tests, working around
        // missing event data.

        // Create the global suite first.
        if (this.QUnit.config.modules.length > 0 && this.QUnit.config.modules[0].name === '') {
          globalSuite = this.convertModule(this.QUnit.config.modules[0]);
          globalSuite.name = undefined;

          // The suiteName of global tests must be undefined.
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = globalSuite.tests[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var test = _step.value;

              test.suiteName = undefined;
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          modules = this.QUnit.config.modules.slice(1);
        } else {
          globalSuite = new Suite(undefined, [], []);
          modules = this.QUnit.config.modules;
        }

        // Build a list with all suites.
        var suites = modules.map(this.convertModule.bind(this));

        // Iterate through the whole suites and check if they have composed names,
        // like "suiteName1 > suiteName2 > ... > suiteNameN".
        //
        // If a suite has a composed name, its name will be the last in the sequence
        // and its parent name will be the one right before it. Search the parent
        // suite after its name and then add the suite with the composed name to the
        // childSuites.
        //
        // If a suite does not have a composed name, add it to the topLevelSuites,
        // this means that this suite is the direct child of the global suite.
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          for (var _iterator2 = suites[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var suite = _step2.value;

            var indexEnd = suite.name.lastIndexOf(' > ');

            if (indexEnd !== -1) {
              // Find the ' > ' characters that appears before the parent name.
              var indexStart = suite.name.substring(0, indexEnd).lastIndexOf(' > ');
              // If it is -1, the parent suite name starts at 0, else escape
              // this characters ' > '.
              indexStart = indexStart === -1 ? 0 : indexStart + 3;

              var parentSuiteName = suite.name.substring(indexStart, indexEnd);

              // Keep only the name of the suite itself.
              suite.name = suite.name.substring(indexEnd + 3);

              var _iteratorNormalCompletion3 = true;
              var _didIteratorError3 = false;
              var _iteratorError3 = undefined;

              try {
                for (var _iterator3 = suites[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                  var parentSuite = _step3.value;

                  if (parentSuite.name === parentSuiteName) {
                    parentSuite.childSuites.push(suite);
                  }
                }
              } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
              } finally {
                try {
                  if (!_iteratorNormalCompletion3 && _iterator3.return) {
                    _iterator3.return();
                  }
                } finally {
                  if (_didIteratorError3) {
                    throw _iteratorError3;
                  }
                }
              }
            } else {
              topLevelSuites.push(suite);
            }
          }
        } catch (err) {
          _didIteratorError2 = true;
          _iteratorError2 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion2 && _iterator2.return) {
              _iterator2.return();
            }
          } finally {
            if (_didIteratorError2) {
              throw _iteratorError2;
            }
          }
        }

        globalSuite.childSuites = topLevelSuites;

        return globalSuite;
      }
    }, {
      key: 'createSuiteStart',
      value: function createSuiteStart(suite) {
        return new Suite(suite.name, suite.childSuites.map(this.createSuiteStart.bind(this)), suite.tests.map(this.createTestStart.bind(this)));
      }
    }, {
      key: 'createSuiteEnd',
      value: function createSuiteEnd(suite) {
        return new Suite(suite.name, suite.childSuites.map(this.createSuiteEnd.bind(this)), suite.tests.map(this.createTestEnd.bind(this)));
      }
    }, {
      key: 'createTestStart',
      value: function createTestStart(test) {
        return new Test(test.testName, test.suiteName);
      }
    }, {
      key: 'createTestEnd',
      value: function createTestEnd(test) {
        return new Test(test.testName, test.suiteName, test.status, test.runtime, test.errors);
      }
    }, {
      key: 'emitData',
      value: function emitData(suite) {
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          for (var _iterator4 = suite.tests[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            var test = _step4.value;

            this.emit('testStart', this.createTestStart(test));
            this.emit('testEnd', this.createTestEnd(test));
          }
        } catch (err) {
          _didIteratorError4 = true;
          _iteratorError4 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion4 && _iterator4.return) {
              _iterator4.return();
            }
          } finally {
            if (_didIteratorError4) {
              throw _iteratorError4;
            }
          }
        }

        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
          for (var _iterator5 = suite.childSuites[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var _suite = _step5.value;

            this.emit('suiteStart', this.createSuiteStart(_suite));
            this.emitData(_suite);
            this.emit('suiteEnd', this.createSuiteEnd(_suite));
          }
        } catch (err) {
          _didIteratorError5 = true;
          _iteratorError5 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion5 && _iterator5.return) {
              _iterator5.return();
            }
          } finally {
            if (_didIteratorError5) {
              throw _iteratorError5;
            }
          }
        }
      }
    }, {
      key: 'onBegin',
      value: function onBegin() {
        this.globalSuite = this.createGlobalSuite();
      }
    }, {
      key: 'onTestStart',
      value: function onTestStart(details) {
        this.errors = [];
      }
    }, {
      key: 'onLog',
      value: function onLog(details) {
        if (!details.result) {
          this.errors.push(details);
        }
      }
    }, {
      key: 'onTestDone',
      value: function onTestDone(details) {
        this.saveTestDetails(details);
      }
    }, {
      key: 'onDone',
      value: function onDone() {
        this.emit('runStart', this.createSuiteStart(this.globalSuite));
        this.emitData(this.globalSuite);
        this.emit('runEnd', this.createSuiteEnd(this.globalSuite));
      }
    }]);
    return QUnitAdapter;
  }(EventEmitter);

  /**
   * Limitations:
   *  - Errors in afterAll are ignored.
   */

  var JasmineAdapter = function (_EventEmitter) {
    babelHelpers.inherits(JasmineAdapter, _EventEmitter);

    function JasmineAdapter(jasmine) {
      babelHelpers.classCallCheck(this, JasmineAdapter);

      var _this = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(JasmineAdapter).call(this));

      _this.jasmine = jasmine;
      jasmine.addReporter({
        jasmineStarted: _this.onJasmineStarted.bind(_this),
        specDone: _this.onSpecDone.bind(_this),
        specStarted: _this.onSpecStarted.bind(_this),
        suiteStarted: _this.onSuiteStarted.bind(_this),
        suiteDone: _this.onSuiteDone.bind(_this),
        jasmineDone: _this.onJasmineDone.bind(_this)
      });

      _this.suites = {};
      _this.tests = {};
      return _this;
    }

    babelHelpers.createClass(JasmineAdapter, [{
      key: 'createSuiteStart',
      value: function createSuiteStart(suite) {
        return new Suite(suite.name, suite.childSuites.map(this.createSuiteStart.bind(this)), suite.tests.map(this.createTestStart.bind(this)));
      }
    }, {
      key: 'createSuiteEnd',
      value: function createSuiteEnd(suite) {
        return new Suite(suite.name, suite.childSuites.map(this.createSuiteEnd.bind(this)), suite.tests.map(this.createTestEnd.bind(this)));
      }
    }, {
      key: 'createTestStart',
      value: function createTestStart(test) {
        return new Test(test.testName, test.suiteName);
      }
    }, {
      key: 'createTestEnd',
      value: function createTestEnd(test) {
        return new Test(test.testName, test.suiteName, test.status, test.runtime, test.errors);
      }
    }, {
      key: 'saveTestDetails',
      value: function saveTestDetails(jasmineSpec) {
        var test = this.tests[jasmineSpec.id];

        test.errors = jasmineSpec.failedExpectations;

        if (jasmineSpec.status === 'pending') {
          test.status = 'skipped';
        } else {
          test.status = jasmineSpec.status;
          test.runtime = new Date() - this.startTime;
        }
      }
    }, {
      key: 'isJasmineGlobalSuite',
      value: function isJasmineGlobalSuite(suite) {
        return suite.description === 'Jasmine__TopLevel__Suite';
      }

      /**
       * Jasmine provides details about childSuites and tests only in the structure
       * returned by "this.jasmine.topSuite()".
       *
       * This function creates the global suite for the runStart event, as also
       * saves the created suites and tests compliant with the CRI standard in an
       * object using as key their unique ids provided by Jasmine.
       */

    }, {
      key: 'createGlobalSuite',
      value: function createGlobalSuite(jasmineSuite) {
        var childSuites = [];
        var tests = [];

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = jasmineSuite.children[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var child = _step.value;

            if (child.id.indexOf('suite') === 0) {
              childSuites.push(this.createGlobalSuite(child));
            } else {
              var suiteName = void 0;
              var test = void 0;

              // Jasmine full description is of form "suite1 suite2 ... suiteN test",
              // for the "suiteName" property we need to remove test name.
              if (!this.isJasmineGlobalSuite(jasmineSuite)) {
                suiteName = child.result.fullName.substring(0, child.result.fullName.indexOf(child.description) - 1);
              }

              test = new Test(child.description, suiteName);

              tests.push(test);
              this.tests[child.id] = test;
            }
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        var name = this.isJasmineGlobalSuite(jasmineSuite) ? undefined : jasmineSuite.description;
        var suite = new Suite(name, childSuites, tests);

        this.suites[jasmineSuite.id] = suite;

        return suite;
      }
    }, {
      key: 'onJasmineStarted',
      value: function onJasmineStarted() {
        this.globalSuite = this.createGlobalSuite(this.jasmine.topSuite());
        this.emit('runStart', this.createSuiteStart(this.globalSuite));
      }
    }, {
      key: 'onSpecStarted',
      value: function onSpecStarted(details) {
        this.startTime = new Date();
        this.emit('testStart', this.createTestStart(this.tests[details.id]));
      }
    }, {
      key: 'onSpecDone',
      value: function onSpecDone(details) {
        this.saveTestDetails(details);
        this.emit('testEnd', this.createTestEnd(this.tests[details.id]));
      }
    }, {
      key: 'onSuiteStarted',
      value: function onSuiteStarted(details) {
        this.emit('suiteStart', this.createSuiteStart(this.suites[details.id]));
      }
    }, {
      key: 'onSuiteDone',
      value: function onSuiteDone(details) {
        this.emit('suiteEnd', this.createSuiteEnd(this.suites[details.id]));
      }
    }, {
      key: 'onJasmineDone',
      value: function onJasmineDone() {
        this.emit('runEnd', this.createSuiteEnd(this.globalSuite));
      }
    }]);
    return JasmineAdapter;
  }(EventEmitter);

  var MochaAdapter = function (_EventEmitter) {
    babelHelpers.inherits(MochaAdapter, _EventEmitter);

    function MochaAdapter(mocha) {
      babelHelpers.classCallCheck(this, MochaAdapter);

      var _this = babelHelpers.possibleConstructorReturn(this, Object.getPrototypeOf(MochaAdapter).call(this));

      _this.mocha = mocha;

      mocha.reporter(function (runner) {
        _this.runner = runner;

        runner.on('start', _this.onStart.bind(_this));
        runner.on('suite', _this.onSuite.bind(_this));
        runner.on('test', _this.onTest.bind(_this));
        runner.on('pending', _this.onPending.bind(_this));
        runner.on('fail', _this.onFail.bind(_this));
        runner.on('test end', _this.onTestEnd.bind(_this));
        runner.on('suite end', _this.onSuiteEnd.bind(_this));
        runner.on('end', _this.onEnd.bind(_this));
      });
      return _this;
    }

    babelHelpers.createClass(MochaAdapter, [{
      key: 'convertSuite',
      value: function convertSuite(mochaSuite) {
        return new Suite(mochaSuite.title, mochaSuite.suites.map(this.convertSuite.bind(this)), mochaSuite.tests.map(this.convertTest.bind(this)));
      }
    }, {
      key: 'convertTest',
      value: function convertTest(mochaTest) {
        var suiteName;

        if (!mochaTest.parent.root) {
          suiteName = this.buildSuiteName(mochaTest.parent);
        }

        // If the test has the errors attached a "test end" must be emitted, else
        // a "test start".
        if (mochaTest.errors !== undefined) {
          var status = mochaTest.state === undefined ? 'skipped' : mochaTest.state;

          // Test end.
          return new Test(mochaTest.title, suiteName, status, mochaTest.duration, mochaTest.errors);
        }

        // Test start.
        return new Test(mochaTest.title, suiteName);
      }

      /**
       * Builds a concatenated name from nested suites.
       */

    }, {
      key: 'buildSuiteName',
      value: function buildSuiteName(mochaSuite) {
        var suiteName = mochaSuite.title;
        var parent = mochaSuite.parent;

        while (!parent.root) {
          suiteName = parent.title + ' ' + suiteName;
          parent = parent.parent;
        }

        return suiteName;
      }
    }, {
      key: 'onStart',
      value: function onStart() {
        var globalSuiteStart = this.convertSuite(this.runner.suite);
        globalSuiteStart.name = undefined;

        this.emit('runStart', globalSuiteStart);
      }
    }, {
      key: 'onSuite',
      value: function onSuite(mochaSuite) {
        if (!mochaSuite.root) {
          this.emit('suiteStart', this.convertSuite(mochaSuite));
        }
      }
    }, {
      key: 'onTest',
      value: function onTest(mochaTest) {
        this.errors = [];

        this.emit('testStart', this.convertTest(mochaTest));
      }

      /**
       * Emits the start of pending tests, because Mocha does not emit skipped tests
       * on its "test" event.
       */

    }, {
      key: 'onPending',
      value: function onPending(mochaTest) {
        this.emit('testStart', this.convertTest(mochaTest));
      }
    }, {
      key: 'onFail',
      value: function onFail(test, error) {
        this.errors.push(error);
      }
    }, {
      key: 'onTestEnd',
      value: function onTestEnd(mochaTest) {
        // Save the errors on Mocha's test object, because when the suite that
        // contains this test is emitted on the "suiteEnd" event, it should contain
        // also this test with all its details (errors, status, runtime). Runtime
        // and status are already attached to the test, but the errors don't.
        mochaTest.errors = this.errors;

        this.emit('testEnd', this.convertTest(mochaTest));
      }
    }, {
      key: 'onSuiteEnd',
      value: function onSuiteEnd(mochaSuite) {
        if (!mochaSuite.root) {
          this.emit('suiteEnd', this.convertSuite(mochaSuite));
        }
      }
    }, {
      key: 'onEnd',
      value: function onEnd() {
        var globalSuiteEnd = this.convertSuite(this.runner.suite);
        globalSuiteEnd.name = undefined;

        this.emit('runEnd', globalSuiteEnd);
      }
    }]);
    return MochaAdapter;
  }(EventEmitter);

  var TapReporter = function () {
    function TapReporter(runner) {
      babelHelpers.classCallCheck(this, TapReporter);

      this.testCount = 0;

      runner.on('runStart', this.onRunStart.bind(this));
      runner.on('testEnd', this.onTestEnd.bind(this));
      runner.on('runEnd', this.onRunEnd.bind(this));
    }

    babelHelpers.createClass(TapReporter, [{
      key: 'onRunStart',
      value: function onRunStart(globalSuite) {
        console.log('TAP version 13');
      }
    }, {
      key: 'onTestEnd',
      value: function onTestEnd(test) {
        this.testCount = this.testCount + 1;

        // TODO maybe switch to test.fullName
        // @see https://github.com/js-reporters/js-reporters/issues/65
        if (test.status === 'passed') {
          console.log('ok ' + this.testCount + ' ' + test.testName);
        } else if (test.status === 'skipped') {
          console.log('ok ' + this.testCount + ' ' + test.testName + ' # SKIP');
        } else {
          console.log('not ok ' + this.testCount + ' ' + test.testName);

          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = test.errors[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var error = _step.value;

              console.log('  ---');
              console.log('  message: "' + error.toString() + '"');
              console.log('  severity: failed');
              console.log('  ...');
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }
        }
      }
    }, {
      key: 'onRunEnd',
      value: function onRunEnd(globalSuite) {
        console.log('1..' + this.testCount);
      }
    }], [{
      key: 'init',
      value: function init(runner) {
        return new TapReporter(runner);
      }
    }]);
    return TapReporter;
  }();

  // TODO: finish grouping once suiteStart is implemented
  var hasGrouping = 'group' in console && 'groupEnd' in console;

  var ConsoleReporter = function () {
    function ConsoleReporter(runner) {
      babelHelpers.classCallCheck(this, ConsoleReporter);

      runner.on('runStart', this.onRunStart);
      runner.on('suiteStart', this.onSuiteStart);
      runner.on('testStart', this.onTestStart);
      runner.on('testEnd', this.onTestEnd);
      runner.on('suiteEnd', this.onSuiteEnd);
      runner.on('runEnd', this.onRunEnd);
    }

    babelHelpers.createClass(ConsoleReporter, [{
      key: 'onRunStart',
      value: function onRunStart(suite) {
        console.log('runStart', suite);
      }
    }, {
      key: 'onSuiteStart',
      value: function onSuiteStart(suite) {
        if (hasGrouping) {
          console.group(suite.name);
        }
        console.log('suiteStart', suite);
      }
    }, {
      key: 'onTestStart',
      value: function onTestStart(test) {
        console.log('testStart', test);
      }
    }, {
      key: 'onTestEnd',
      value: function onTestEnd(test) {
        console.log('testEnd', test);
      }
    }, {
      key: 'onSuiteEnd',
      value: function onSuiteEnd(suite) {
        console.log('suiteEnd', suite);
        if (hasGrouping) {
          console.groupEnd();
        }
      }
    }, {
      key: 'onRunEnd',
      value: function onRunEnd(globalSuite) {
        console.log('runEnd', globalSuite);
      }
    }], [{
      key: 'init',
      value: function init(runner) {
        return new ConsoleReporter(runner);
      }
    }]);
    return ConsoleReporter;
  }();

  /*
   The TestReporter verifies that a test runner outputs the right data in the right order.
   To do so, it compares the actual output with the provided reference data.
   The result is given in the ok attribute.
   */

  var TestReporter = function () {

    /**
     * @param runner: standardized test runner (or adapter)
     * @param referenceData: An array of all expected (eventName, eventData) tuples in the right order
     */

    function TestReporter(runner, referenceData) {
      babelHelpers.classCallCheck(this, TestReporter);

      this.referenceData = referenceData.slice();
      this.error = false;
      runner.on('runStart', this.onEvent.bind(this, 'runStart'));
      runner.on('suiteStart', this.onEvent.bind(this, 'suiteStart'));
      runner.on('testStart', this.onEvent.bind(this, 'testStart'));
      runner.on('testEnd', this.onEvent.bind(this, 'testEnd'));
      runner.on('suiteEnd', this.onEvent.bind(this, 'suiteEnd'));
      runner.on('runEnd', this.onEvent.bind(this, 'runEnd'));
    }

    /**
     * Gets called on each event emitted by the runner. Checks if the actual event matches the expected event.
     */


    babelHelpers.createClass(TestReporter, [{
      key: 'onEvent',
      value: function onEvent(eventName, eventData) {
        var _referenceData$shift = this.referenceData.shift();

        var _referenceData$shift2 = babelHelpers.slicedToArray(_referenceData$shift, 2);

        var expectedEventName = _referenceData$shift2[0];
        var expectedEventData = _referenceData$shift2[1];


        if (eventName !== expectedEventName || !this.equal(eventData, expectedEventData)) {
          this.error = true;
          console.error('expected:', expectedEventName, expectedEventData, '\r\n', 'actual:', eventName, eventData);
        }
      }
    }, {
      key: 'equal',


      /**
       * Helper function to compare
       *  - two Test objects
       *  - two Suite objects
       *  - two arrays of Test or Suite objects
       *  The equality check is not completely strict, e.g. the runtime of a Test does not have to be equal.
       * @returns {boolean}: true if both objects are equal, false otherwise
       */
      value: function equal(actual, expected) {
        if (expected instanceof Suite) {
          if (actual.name !== expected.name) {
            return false;
          }
          if (!this.equal(actual.childSuites, expected.childSuites)) {
            return false;
          }

          if (!this.equal(actual.tests, expected.tests)) {
            return false;
          }
        } else if (expected instanceof Test) {
          var _arr = ['testName', 'suiteName', 'status'];

          for (var _i = 0; _i < _arr.length; _i++) {
            var property = _arr[_i];
            if (actual[property] !== expected[property]) {
              return false;
            }
          }
          if (typeof actual.runtime !== 'number' && actual.runtime !== undefined) {
            return false;
          }

          if (!(actual.errors === undefined && expected.errors === undefined) && actual.errors.length !== expected.errors.length) {
            return false;
          }
        } else if (Array.isArray(expected)) {
          if (actual.length !== expected.length) {
            return false;
          }

          for (var i = 0; i < expected.length; i++) {
            if (!this.equal(actual[i], expected[i])) {
              return false;
            }
          }
        } else {
          return false;
        }
        return true;
      }
    }, {
      key: 'ok',
      get: function get() {
        return !this.error && this.referenceData.length === 0;
      }
    }]);
    return TestReporter;
  }();

  var index = {
    QUnitAdapter: QUnitAdapter,
    JasmineAdapter: JasmineAdapter,
    MochaAdapter: MochaAdapter,
    TapReporter: TapReporter,
    ConsoleReporter: ConsoleReporter,
    TestReporter: TestReporter,
    Test: Test,
    Suite: Suite
  };

  return index;

}));