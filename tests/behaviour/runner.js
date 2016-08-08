'use strict';

global.logLevel = 'silent';

var assert = require('assert'),
  sinon = require('sinon'),
  path = require('path'),
  http = require('http'),
  browserstackRunner = require('../../bin/cli.js'),
  Tunnel = require('../../lib/local.js').Tunnel;

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
    browserstackRunner.run(config, function(err, report) {
      assert.equal(err, null);
      assert.notEqual(report['Windows 7, Chrome 52.0'], null);
      assert.notEqual(report['Windows 7, Firefox 47.0'], null);
      done();
    });
  });
  it('report keys should have assertions and tests', function(done) {
    var config = getBaseConfig();
    browserstackRunner.run(config, function(err, report) {
      assert.equal(err, null);
      assert.notEqual(report['Windows 7, Chrome 52.0'].assertions, null);
      assert.notEqual(report['Windows 7, Chrome 52.0'].tests, null);
      assert.notEqual(report['Windows 7, Firefox 47.0'].assertions, null);
      assert.notEqual(report['Windows 7, Firefox 47.0'].tests, null);
      done();
    });
  });
  describe('Test Assertions', function() {
    it('report should have proper number of assertions for tests', function(done) {
      var config = getBaseConfig();
      browserstackRunner.run(config, function(err, report) {
        assert.equal(err, null);
        // Only failed assertions are emitted
        assert.equal(report['Windows 7, Chrome 52.0'].assertions.length, 8);
        assert.equal(report['Windows 7, Firefox 47.0'].assertions.length, 8);
        done();
      });
    });
    it('report should have specific keys', function(done) {
      var config = getBaseConfig();
      browserstackRunner.run(config, function(err, report) {
        assert.equal(err, null);
        Object.keys(report).forEach(function(reportKey) {
          report[reportKey].assertions.forEach(function(assertion) {
            [ 'actual', 'expected', 'message', 'source' ].forEach(function(key) {
              assert.notEqual(assertion[key], null);
            });
          });
        });
        done();
      });
    });
    it('report should have message in assertions', function(done) {
      var config = getBaseConfig();
      browserstackRunner.run(config, function(err, report) {
        assert.equal(err, null);
        Object.keys(report).forEach(function(reportKey) {
          report[reportKey].assertions.forEach(function(assertion) {
            assert.notEqual(assertion['message'].match(/\d+ is .*an .* number/), null);
          });
        });
        done();
      });
    });
  });
  describe('Test tests', function() {
    it('report should have proper number of tests', function(done) {
      var config = getBaseConfig();
      browserstackRunner.run(config, function(err, report) {
        assert.equal(err, null);
        assert.equal(report['Windows 7, Chrome 52.0'].tests.length, 1);
        assert.equal(report['Windows 7, Firefox 47.0'].tests.length, 1);
        done();
      });
    });
    it('report should have specific keys', function(done) {
      var config = getBaseConfig();
      browserstackRunner.run(config, function(err, report) {
        assert.equal(err, null);
        Object.keys(report).forEach(function(reportKey) {
          report[reportKey].tests.forEach(function(test) {
            [ 'runtime', 'total', 'passed', 'failed', 'url' ].forEach(function(key) {
              assert.notEqual(test[key], null);
            });
          });
        });
        done();
      });
    });
    it('report should have message in assertions', function(done) {
      var config = getBaseConfig();
      browserstackRunner.run(config, function(err, report) {
        assert.equal(err, null);
        Object.keys(report).forEach(function(reportKey) {
          report[reportKey].tests.forEach(function(test) {
            assert.equal(test['total'], 3);
            assert.equal(test['passed'], 1);
            assert.equal(test['failed'], 2);
          });
        });
        done();
      });
    });
  });
});
