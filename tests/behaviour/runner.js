'use strict';

global.logLevel = 'silent';

var assert = require('assert'),
  sinon = require('sinon'),
  path = require('path'),
  http = require('http'),
  browserstackRunner = require('../../bin/cli.js'),
  Tunnel = require('../../lib/local.js').Tunnel,
  exec = require('child_process').exec,
  execSync = require('child_process').execSync;

var getBaseConfig = function() {
  return { 
    username: 'BROWSERSTACK_USER',
    key: 'BROWSERSTACK_KEY',
    test_framework: 'qunit',
    test_path: path.resolve(__dirname, 'resources', 'qunit_sample.html'),
    build: 'BrowserStack Runner Behaviour Tests',
    browsers: [ { 
      browser: 'firefox',
      browser_version: '47.0',
      os: 'Windows',
      os_version: '7'
    }, {
      browser: 'chrome',
      browser_version: '52.0',
      os: 'Windows',
      os_version: '7'
    }, {
      browser: 'iphone',
      browser_version: '',
      device: 'iPhone SE',
      os: 'ios',
      os_version: '11.2',
      real_mobile: true
    } ]
  }
};

describe('Config Assertions', function() {
  this.timeout(0);

  it('should run normally with valid config', function(done) {
    browserstackRunner.run(getBaseConfig(), function(err) {
      assert.equal(err, null);
      done();
    });
  });
  it('should have an error if test path is not valid', function(done) {
    var config = getBaseConfig();
    config.test_path = 'Some invalid path';
    browserstackRunner.run(config, function(err) {
      assert.equal(err.message, 'Test path: ' + config.test_path + ' is invalid.');
      done();
    });
  });
  it('should have an error if config does not have a browsers key', function(done) {
    var config = getBaseConfig();
    delete(config.browsers);
    browserstackRunner.run(config, function(err) {
      assert.equal(err.message, 'Configuration parameter browsers is required.');
      done();
    });
  });
  it('should have an error if config does not have a test_path key', function(done) {
    var config = getBaseConfig();
    delete(config.test_path);
    browserstackRunner.run(config, function(err) {
      assert.equal(err.message, 'Configuration parameter test_path is required.');
      done();
    });
  });
  describe('Check Behaviour with invalid username or key', function() {
    var sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      sandbox.stub(process, 'env', {});
    });

    it('should have an error if config does not have a username', function(done) {
      var config = getBaseConfig();
      delete(config.username);
      browserstackRunner.run(config, function(err) {
        assert.equal(err.message, 'Configuration parameter username is required.');
        done();
      });
    });
    it('should have an error if config does not have a key', function(done) {
      var config = getBaseConfig();
      delete(config.key);
      browserstackRunner.run(config, function(err) {
        assert.equal(err.message, 'Configuration parameter key is required.');
        done();
      });
    });

    afterEach(function() {
      sandbox.restore();
    });
  });
});

describe('Pass/Fail reporting', function() {
  this.timeout(0);

  it('report keys should have browser names', function(done) {
    var config = getBaseConfig();
    browserstackRunner.run(config, function(err, reports) {
      var shouldBePresentBrowsers = [ 'Windows 7, Chrome 52.0', 'Windows 7, Firefox 47.0', 'ios 11.2, Iphone '];
      assert.equal(err, null);
      reports.forEach(function(report) {
        var numMatched = 0;
        shouldBePresentBrowsers.forEach(function(browser) {
          if(browser === report.browser) {
            numMatched++;
          }
        });
        if(numMatched != 1) {
          done(new Error('Report didnt match the shouldBePresentBrowsers for browser: ' + report.browser + ' numMatched: ' + numMatched));
        } else {
          var removeIndex = shouldBePresentBrowsers.indexOf(report.browser);
          shouldBePresentBrowsers = shouldBePresentBrowsers.slice(0, removeIndex).concat(shouldBePresentBrowsers.slice(removeIndex + 1));
        }
      });
      if(shouldBePresentBrowsers.length != 0) {
        done(new Error('Browsers not Present in Report: ' + JSON.stringify(shouldBePresentBrowsers)));
      }
      done();
    });
  });
  it('report keys should have suites and tests', function(done) {
    var config = getBaseConfig();
    browserstackRunner.run(config, function(err, reports) {
      assert.equal(err, null);
      reports.forEach(function(report) {
        assert.notEqual(report.tests, null);
        assert.notEqual(report.suites, null);
      });
      done();
    });
  });
  describe('Test Tests', function() {
    it('report should have proper number of tests', function(done) {
      var config = getBaseConfig();
      browserstackRunner.run(config, function(err, reports) {
        assert.equal(err, null);
        reports.forEach(function(report) {
          assert.equal(report.tests.length, 4);
        });
        done();
      });
    });
    it('Each test should have specific keys', function(done) {
      var config = getBaseConfig();
      browserstackRunner.run(config, function(err, reports) {
        assert.equal(err, null);
        reports.forEach(function(report) {
          Object.keys(report.tests).forEach(function(reportKey) {
            [ 'name', 'suiteName', 'status', 'runtime', 'errors' ].forEach(function(key) {
              assert.notEqual(report.tests[reportKey][key], null);
            });
            report.tests[reportKey].assertions.forEach(function(assertion) {
              [ 'passed', 'actual', 'expected', 'message' ].forEach(function(key) {
                assert.notEqual(assertion[key], null);
              });
            });
          });
        });
        done();
      });
    });
    it('Each test should have message in assertions', function(done) {
      var config = getBaseConfig();
      browserstackRunner.run(config, function(err, reports) {
        assert.equal(err, null);
        reports.forEach(function(report) {
          Object.keys(report.tests).forEach(function(reportKey) {
            report.tests[reportKey].assertions.forEach(function(assertion) {
              assert.notEqual(assertion['message'].match(/(\d+ is .*an .* number|console\..*? exists)/), null);
            });
          });
        });
        done();
      });
    });
  });
  describe('Test Suites', function() {
    it('report should have Suite of tests', function(done) {
      var config = getBaseConfig();
      browserstackRunner.run(config, function(err, reports) {
        assert.equal(err, null);
        reports.forEach(function(report) {
          assert.notEqual(report.suites, null);
        });
        done();
      });
    });
    it('Each Suite should have specific keys', function(done) {
      var config = getBaseConfig();
      browserstackRunner.run(config, function(err, reports) {
        assert.equal(err, null);
        reports.forEach(function(report) {
          [ 'childSuites', 'tests', 'runtime', 'status', 'testCounts' ].forEach(function(key) {
            assert.notEqual(report.suites[key], null);
          });
          [ 'total', 'passed', 'failed', 'skipped' ].forEach(function(key) {
            assert.notEqual(report.suites.testCounts[key], null);
          });
        });
        done();
      });
    });
    it('Suites should have correct passed/failed count', function(done) {
      var config = getBaseConfig();
      browserstackRunner.run(config, function(err, reports) {
        assert.equal(err, null);
        reports.forEach(function(report) {
          assert.equal(report.suites.testCounts['total'], 4);
          assert.equal(report.suites.testCounts['passed'], 2);
          assert.equal(report.suites.testCounts['failed'], 2);
          assert.equal(report.suites.testCounts['skipped'], 0);
        });
        done();
      });
    });
  });
});

describe('Command Line Interface Tests', function() {
  this.timeout(0);
  it('Should run with valid CLI arguments', function(done) {
    execSync('bin/runner.js init');
    exec('bin/runner.js --browsers 1 --path tests/behaviour/resources/qunit_sample.html', null, function(error, stdout, stderr) {
      assert.equal(error, null);
      done();
    });
  });
  it('Should raise errors if all invalid browser keys.', function(done) {
    exec('bin/runner.js --browsers 10 --path tests/behaviour/resources/qunit_sample.html', null, function(error, stdout, stderr) {
      assert.notEqual(error.message.match('Invalid'), null);
      done();
    });
  });
  it('Should raise error if invalid test path', function(done) {
    exec('bin/runner.js --browsers 1 --path invalid/path', function(error, stdout, stderr) {
    assert.notEqual(error, null);
    assert.notEqual(error.message.match('Invalid'), null);
      done();
    });
  });
  it('Should run tests on browsers present if some keys not present', function(done) {
    exec('bin/runner.js --browsers 1 10 --path tests/behaviour/resources/qunit_sample.html', null, function(error, stdout, stderr) {
      assert.equal(error, null);
      done();
    });
  });
  it('Should raise error if empty pid path with pid parameter', function(done) {
    exec('bin/runner.js --browsers 1 --path tests/behaviour/resources/qunit_sample.html --pid', null, function(error, stdout, stderr) {
      assert.notEqual(error, null);
      done();
    });
  });
});
