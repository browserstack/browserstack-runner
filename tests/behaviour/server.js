'use strict';

var assert = require('assert'),
  sinon = require('sinon'),
  path = require('path'),
  http = require('http'),
  chalk = require('chalk'),
  serverPort = 8888,
  browserStackRunnerServer = require('../../lib/server.js');

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
    } ]
  }
};

var requestServer = function(path, requestBody, appendHeaders, callback) {
  var headers = {
    'Content-Length': Buffer.byteLength(requestBody)
  }
  var request = http.request({
    hostname: 'localhost',
    port: serverPort,
    path: path,
    method: 'POST',
    headers: Object.assign(headers, appendHeaders),
  }, (res) => {
    var responseData = '';

    res.on('data', (data) => {
      responseData += data.toString();
    });
    res.on('end', () => {
      callback(null, responseData, res.statusCode);
    });
  }).on('error', (e) => {
    callback(e);
  });
  request.write(requestBody);
  request.end();
};

describe('Server Assertions', function() {
  describe('Assert logs from the browserstack-runner server', function() {
    var sandBox, bsClient, infoLoggerStub, server, reports, workers = {};

    beforeEach(function() {
      sandBox = sinon.sandbox.create();
      bsClient = {
        takeScreenshot: sandBox.stub()
      },
      infoLoggerStub = sandBox.stub(browserStackRunnerServer.logger, 'info');

      server = browserStackRunnerServer.Server(bsClient, workers, getBaseConfig(), function(error, reports) {
        console.log('Dude!', reports);
      });
      server.listen(serverPort);
    });

    afterEach(function() {
      sandBox.restore();
      server.close();
    });

    it('logs console.log correctly', function(done) {
      var browserString = 'OS X Chrome 54'
      requestServer('/_log', '{"arguments":["Random String"]}', {
        'x-browser-string': browserString
      }, function(error) {
        if(error) done(error);
        assert.equal(infoLoggerStub.called, true);
        assert.equal(infoLoggerStub.callCount, 1);
        assert.equal(infoLoggerStub.getCalls()[0].args, '[' + browserString + '] ' + 'Random String');

        requestServer('/_log', '{"arguments":["Invalid Random String', {
          'x-browser-string': browserString
        }, function(error) {
          if(error) done(error);
          assert.equal(infoLoggerStub.callCount, 2);
          assert.equal(infoLoggerStub.getCalls()[1].args, '[' + browserString + '] ' + '{"arguments":["Invalid Random String');
          done();
        });
      });
    });

    it('logs test errors correctly', function(done) {
      var browserUUIDString = 'abcd-efgh-1234-5678',
        browserInfoString = 'browserInfo';

      workers[browserUUIDString] = {
        getTestBrowserInfo: sandBox.stub().returns(browserInfoString),
        string: 'workerString'
      };
      var requestBodyObject = {
        test: {
          errors: [{
            message: "failedTestMessage",
            actual: "ActualValue",
            expected: "expectedValue",
            source: "LongStackTrace"
          }],
          name:"customTestName",
          suiteName:"customSuiteName"
        }
      };

      requestServer('/_progress', JSON.stringify(requestBodyObject), {
        'x-worker-uuid': browserUUIDString
      }, function(error) {
        if(error) done(error);
        assert.equal(infoLoggerStub.called, true);
        assert.equal(infoLoggerStub.callCount, 1);
        assert.equal(infoLoggerStub.getCalls()[0].args.length, 3);
        assert.equal(infoLoggerStub.getCalls()[0].args[0], '[%s] ' + chalk.red('Error:'));
        assert.equal(infoLoggerStub.getCalls()[0].args[1], browserInfoString);
        assert.equal(infoLoggerStub.getCalls()[0].args[2], 
          '"customTestName" failed, failedTestMessage\n' + chalk.blue('Expected: ') + 'expectedValue' +
          '\n' + chalk.blue('  Actual: ') + 'ActualValue' +
          '\n' + chalk.blue('  Source: ') + 'LongStackTrace'
        );

        requestServer('/_progress', '{"arguments":["Invalid Random String', {
          'x-worker-uuid': browserUUIDString
        }, function(error) {
          if(error) done(error);
          assert.equal(infoLoggerStub.callCount, 3);
          assert.equal(infoLoggerStub.getCalls()[1].args.length, 2);
          assert.equal(infoLoggerStub.getCalls()[1].args[0], '[%s] Exception in parsing log');
          assert.equal(infoLoggerStub.getCalls()[1].args[1], 'workerString');

          assert.equal(infoLoggerStub.getCalls()[2].args.length, 2);
          assert.equal(infoLoggerStub.getCalls()[2].args[0], '[%s] Log: undefined');
          assert.equal(infoLoggerStub.getCalls()[2].args[1], 'workerString');
          done();
        });
      });
    });

    it('logs for test reports correctly', function(done) {
      var browserUUIDString = 'abcd-efgh-1234-5678',
        browserString = 'OS X Chrome 41',
        browserInfoString = 'browserInfo';

      workers[browserUUIDString] = {
        getTestBrowserInfo: sandBox.stub().returns(browserInfoString),
        string: 'workerString'
      };
      var requestBodyObject = {
        testCounts: {
          total: 1,
          passed: 1,
          failed: 0,
          skipped: 0
        },
        runtime: '00:01:00',
        status: 'passed'
      };

      requestServer('/_report', JSON.stringify(requestBodyObject), {
        'x-worker-uuid': browserUUIDString
      }, function(error) {
        if(error) done(error);
        assert.equal(infoLoggerStub.called, true);
        assert.equal(infoLoggerStub.callCount, 1);
        assert.equal(infoLoggerStub.getCalls()[0].args.length, 7);
        assert.equal(infoLoggerStub.getCalls()[0].args[0], '[%s] ' + chalk['green']('Passed:') + ' %d tests, %d passed, %d failed, %d skipped; ran for %dms');
        assert.equal(infoLoggerStub.getCalls()[0].args[1], browserInfoString);
        assert.equal(infoLoggerStub.getCalls()[0].args[2], 1);
        assert.equal(infoLoggerStub.getCalls()[0].args[3], 1);
        assert.equal(infoLoggerStub.getCalls()[0].args[4], 0);
        assert.equal(infoLoggerStub.getCalls()[0].args[5], 0);
        assert.equal(infoLoggerStub.getCalls()[0].args[6], '00:01:00');

        requestServer('/_report', '{"arguments":["Invalid Random String', {
          'x-worker-uuid': browserUUIDString,
          'x-browser-string': browserString
        }, function(error) {
          if(error) done(error);
          assert.equal(infoLoggerStub.callCount, 2);
          assert.equal(infoLoggerStub.getCalls()[1].args.length, 2);
          assert.equal(infoLoggerStub.getCalls()[1].args[0], '[%s] Null response from remote Browser');
          assert.equal(infoLoggerStub.getCalls()[1].args[1], browserString);
          done();
        });
      });
    });
  });
});
