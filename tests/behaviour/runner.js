'use strict';

global.logLevel = "silent";

let assert = require('assert'),
  sinon = require('sinon'),
  path = require('path'),
  browserstackRunner = require('../../bin/cli.js');

let getBaseConfig = function() {
  return { 
    username: 'BROWSERSTACK_USER',
    key: 'BROWSERSTACK_KEY',
    test_framework: 'qunit',
    test_path: path.resolve(__dirname, 'resources', 'qunit_sample.html'),
    build: "BrowserStack Runner Behaviour Tests",
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
    let config = getBaseConfig();
    config.test_path = "Some invalid path";
    browserstackRunner.run(config, function(err) {
      assert.equal(err.message, "Test path: " + config.test_path + " is invalid.");
      done();
    });
  });
  it('should have an error if config does not have a browsers key', function(done) {
    let config = getBaseConfig();
    delete(config.browsers);
    browserstackRunner.run(config, function(err) {
      assert.equal(err.message, "Configuration parameter browsers is required.");
      done();
    });
  });
  it('should have an error if config does not have a test_path key', function(done) {
    let config = getBaseConfig();
    delete(config.test_path);
    browserstackRunner.run(config, function(err) {
      assert.equal(err.message, "Configuration parameter test_path is required.");
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
      let config = getBaseConfig();
      delete(config.username);
      browserstackRunner.run(config, function(err) {
        assert.equal(err.message, "Configuration parameter username is required.");
        done();
      });
    });
    it('should have an error if config does not have a key', function(done) {
      let config = getBaseConfig();
      delete(config.key);
      browserstackRunner.run(config, function(err) {
        assert.equal(err.message, "Configuration parameter key is required.");
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
    let config = getBaseConfig();
    browserstackRunner.run(config, function(err, report) {
      assert.equal(err, null);
      var parsedReport = JSON.parse(report);
      assert.notEqual(parsedReport["Windows 7, Chrome 52.0"], null);
      assert.notEqual(parsedReport["Windows 7, Firefox 47.0"], null);
      done();
    });
  });
  it('report keys should have assertions and tests', function(done) {
    let config = getBaseConfig();
    browserstackRunner.run(config, function(err, report) {
      assert.equal(err, null);
      var parsedReport = JSON.parse(report);
      assert.notEqual(parsedReport["Windows 7, Chrome 52.0"].assertions, null);
      assert.notEqual(parsedReport["Windows 7, Chrome 52.0"].tests, null);
      assert.notEqual(parsedReport["Windows 7, Firefox 47.0"].assertions, null);
      assert.notEqual(parsedReport["Windows 7, Firefox 47.0"].tests, null);
      done();
    });
  });
  describe('Test Assertions', function() {
    it('report should have proper number of assertions for tests', function(done) {
      let config = getBaseConfig();
      browserstackRunner.run(config, function(err, report) {
        assert.equal(err, null);
        console.log(report);
        var parsedReport = JSON.parse(report);
        // Only failed assertions are emitted
        assert.equal(parsedReport["Windows 7, Chrome 52.0"].assertions.length, 8);
        assert.equal(parsedReport["Windows 7, Firefox 47.0"].assertions.length, 8);
        done();
      });
    });
    it('report should have specific keys', function(done) {
      let config = getBaseConfig();
      console.log(JSON.stringify(config));
      browserstackRunner.run(config, function(err, report) {
        assert.equal(err, null);
        var parsedReport = JSON.parse(report);
        Object.keys(parsedReport).forEach(function(reportKey) {
          parsedReport[reportKey].assertions.forEach(function(assertion) {
            [ "actual", "expected", "message", "source" ].forEach(function(key) {
              assert.notEqual(assertion[key], null);
            });
          });
        });
        done();
      });
    });
    it('report should have message in assertions', function(done) {
      let config = getBaseConfig();
      console.log(JSON.stringify(config));
      browserstackRunner.run(config, function(err, report) {
        assert.equal(err, null);
        var parsedReport = JSON.parse(report);
        Object.keys(parsedReport).forEach(function(reportKey) {
          parsedReport[reportKey].assertions.forEach(function(assertion) {
            assert.notEqual(assertion["message"].match(/\d+ is .*an .* number/), null);
          });
        });
        done();
      });
    });
  });
  describe('Test tests', function() {
    it('report should have proper number of tests', function(done) {
      let config = getBaseConfig();
      browserstackRunner.run(config, function(err, report) {
        assert.equal(err, null);
        var parsedReport = JSON.parse(report);
        assert.equal(parsedReport["Windows 7, Chrome 52.0"].tests.length, 1);
        assert.equal(parsedReport["Windows 7, Firefox 47.0"].tests.length, 1);
        done();
      });
    });
    it('report should have specific keys', function(done) {
      let config = getBaseConfig();
      browserstackRunner.run(config, function(err, report) {
        assert.equal(err, null);
        var parsedReport = JSON.parse(report);
        Object.keys(parsedReport).forEach(function(reportKey) {
          parsedReport[reportKey].tests.forEach(function(test) {
            [ "runtime", "total", "passed", "failed", "url" ].forEach(function(key) {
              assert.notEqual(test[key], null);
            });
          });
        });
        done();
      });
    });
    it('report should have message in assertions', function(done) {
      let config = getBaseConfig();
      browserstackRunner.run(config, function(err, report) {
        assert.equal(err, null);
        var parsedReport = JSON.parse(report);
        Object.keys(parsedReport).forEach(function(reportKey) {
          parsedReport[reportKey].tests.forEach(function(test) {
            assert.equal(test["total"], 3);
            assert.equal(test["passed"], 1);
            assert.equal(test["failed"], 2);
          });
        });
        done();
      });
    });
  });
});
