#! /usr/bin/env node

var path = require('path');
var Helper = require('./helper');

var browserstackConfig = {
  username: 'BROWSERSTACK_USERNAME',
  key: 'BROWSERSTACK_KEY'
};

var mode = (process.env.TEST_MODE || 'all').toLowerCase();
var runnerPath = path.resolve(path.join(__dirname, '..', 'bin', 'runner.js'));
var testHome = path.resolve(__dirname);
process.chdir(testHome);

/**
 * Mocha v2.4.5 - to change with another Mocha version or
 * something with Mocha tests
 *
 * index.html - 22 tests, 18 passed, 4 failed -> one test is displayed twice,
 *  so they are displayed 5 failing tests, but counted only 4
 * large.html - 64 tests, 60 passed, 4 failed -> only 2 tests are failing, but
 *  they are displayed twice
 * opts.html - 8 tests, 2 passed, 6 failed -> only 3 tests are failing, but
 *  they are displayed twice
 *
 * By "displayed" it is referred the Mocha HTML Reporter.
 *
 * From the above explanations it is clear that there are some inconsistencies,
 * also because Mocha's HTML Reporter counted number of tests does not match
 * the number of displyed tests.
 *
 * The cause is (snippet from Mocha's HTML reporter):
 *
 * runner.on('fail', function(test) {
 *  // For type = 'test' its possible that the test failed due to multiple
 *  // done() calls. So report the issue here.
 *  if (test.type === 'hook'
 *    || test.type === 'test') {
 *    runner.emit('test end', test);
 *  }
 * });
 *
 * This is why failed tests are displayed twice...
 *
 * The JsReporters is counting the tests on the "test end" event, that's why
 * it is capturing the failing tests twice, in the "index.html" it does not
 * capture everything, because there is an async test, which failure is
 * triggered after a timeout and the JsReporters is not waiting, because
 * it cannot know how much to wait.
 *
 *
 * This been said, the JsReporter MochaAdapter is functioning well, this
 * version of Mocha is not reliable and should be changed.
 */

var repositories = [
  {
    name: 'qunit',
    tag: '1.21.0',
    url: 'https://github.com/jquery/qunit.git',
    test_framework: 'qunit',
    browsers: [
      {
        'browser': 'firefox',
        'browser_version': '44.0',
        'os': 'OS X',
        'os_version': 'El Capitan'
      }
    ],
    test_path: [
      'test/index.html'
    ],
    expected_results: {
      tests: 133,
      passed: 130,
      failed: 0
    }
  },
  {
    name: 'mocha',
    tag: 'v2.4.5',
    url: 'https://github.com/mochajs/mocha.git',
    test_framework: 'mocha',
    browsers: [
      {
        'browser': 'ie',
        'browser_version': '11.0',
        'os': 'Windows',
        'os_version': '10'
      }
    ],
    test_path: [
      'test/browser/index.html',
      'test/browser/large.html',
      'test/browser/opts.html'
    ],
    expected_results: {
      tests: 86,
      passed: 78,
      failed: 8
    }
  },
  {
    name: 'spine',
    tag: 'v.1.6.2',
    url: 'https://github.com/spine/spine.git',
    test_framework: 'jasmine2',
    browsers: [
      {
        'browser': 'safari',
        'browser_version': '9.0',
        'os': 'OS X',
        'os_version': 'El Capitan'
      }
    ],
    test_path: [
      'test/index.html'
    ],
    expected_results: {
      tests: 161,
      passed: 161,
      failed: 0
    }
  },
  {
    name: 'spine',
    tag: 'v1.0.0',
    url: 'https://github.com/spine/spine.git',
    test_framework: 'jasmine',
    browsers: [
      {
        'browser': 'safari',
        'browser_version': '9.0',
        'os': 'OS X',
        'os_version': 'El Capitan'
      }
    ],
    test_path: [
      'test/index.html'
    ],
    patches: [
      {
        find: 'jasmine.getEnv().execute();',
        replace: 'window.onload = function () { jasmine.getEnv().execute(); };'
      }
    ],
    expected_results: {
      tests: 63,
      passed: 63,
      failed: 0
    }
  }
];

var repositoriesOptional = [
  {
    name: 'mocha',
    tag: '1.21.5',
    url: 'https://github.com/mochajs/mocha.git',
    test_framework: 'mocha',
    browsers: [
      {
        'browser': 'ie',
        'browser_version': '10.0',
        'os': 'Windows',
        'os_version': '7'
      }
    ],
    test_path: [
      'test/browser/index.html',
      'test/browser/large.html',
      'test/browser/opts.html'
    ],
    expected_results: {
      tests: 83,
      passed: 77,
      failed: 6
    }
  }
];

function run(repositories) {
  Helper.runRepositories(browserstackConfig, repositories, testHome, runnerPath, function (err) {
    if (err) {
      console.log(err.stack);
      throw err;
    }

    console.log('Done.');
  });
}

switch (mode) {
  case 'required':
    run(repositories);
  break;

  case 'optional':
    run(repositoriesOptional);
  break;

  default:
    run([].concat(repositories).concat(repositoriesOptional));
}
