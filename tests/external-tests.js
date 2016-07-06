#! /usr/bin/env node

var path = require('path');
var Helper = require('./helper');

var browserstackConfig = {
  username: 'BROWSERSTACK_USERNAME',
  key: 'BROWSERSTACK_KEY'
};

var mode = (process.env.TEST_MODE || 'all').toLowerCase();
var runnerPath = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'));
var testHome = path.resolve(__dirname);
process.chdir(testHome);

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
      tests: 89,
      passed: 80,
      failed: 9
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
        'browser_version': '5.1',
        'os': 'OS X',
        'os_version': 'Snow Leopard'
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
    name: 'qunit',
    tag: 'v1.0.0',
    url: 'https://github.com/jquery/qunit.git',
    test_framework: 'qunit',
    browsers: [
      {
        'browser': 'firefox',
        'browser_version': '44.0',
        'os': 'OS X',
        'os_version': 'Snow Leopard'
      }
    ],
    test_path: [
      'test/index.html',
      'test/logs.html'
    ],
    expected_results: {
      tests: 323,
      passed: 323,
      failed: 0
    }
  },
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
      tests: 84,
      passed: 77,
      failed: 7
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
