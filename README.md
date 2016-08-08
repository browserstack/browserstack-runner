A command line interface to run browser tests over BrowserStack.

## Usage

Install globally:

    npm -g install browserstack-runner

Then, after setting up the configuration, run tests with:

    browserstack-runner

You can also install locally and run the local binary:

    npm install browserstack-runner
    node_modules/.bin/browserstack-runner

If you're getting an error `EACCES open ... BrowserStackLocal`, configure npm to install modules using something other than the default "nobody" user:

    npm -g config set user [user]

Where `[user]` is replaced with a local user with enough permissions.

## Usage as a module

`browserstack-runner` can also be used as a module. To run your tests, inside your project do -

```node
var browserstackRunner = require('browserstack-runner');

global.logLevel = 'info';
var config = require('./browserstack.json');

browserstackRunner.run(config, function(error, report) {
  if(error) {
    console.log("Error:" + error);
    return;
  }
  console.log(JSON.stringify(report, null, 2));
  console.log("Test Finished");
});
```

The callback to `browserstackRunner.run` is called with two params -
1. `error`: This parameter is either `null` or an `Error` object (if test execution failed) with message as the reason of why executing the tests on `BrowserStack` failed.
2. `report`: This is an object which can be used to keep track of the `failed assertions` and the total count of `passed/failed` tests specific to a browser instance.

The structure of the `report` object is as follows -

```json
{
  "OS X Lion, Firefox 44.0": {
    "assertions": [
    {
      "actual": false,
        "expected": true,
        "message": "One is an odd number",
        "source": "@http://localhost:8888/tests/test.js:4:1"
    },
    {
      "actual": false,
      "expected": true,
      "message": "Zero is not odd number",
      "source": "@http://localhost:8888/tests/test.js:6:3"
    },
    {
      "actual": false,
      "expected": true,
      "message": "Three is an odd number",
      "source": "@http://localhost:8888/tests/test.js:5:1"
    }
    ],
      "tests": [
      {
        "runtime": 3,
        "total": 1,
        "passed": 0,
        "failed": 1,
        "url": "/sample.html"
      }
    ]
  },
    "OS X Mountain Lion, Chrome 49.0": {
      "assertions": [
      {
        "actual": false,
        "expected": true,
        "message": "Three is an odd number",
        "source": "    at Object.<anonymous> (http://localhost:8888/tests/test.js:5:10)"
      },
      {
        "actual": false,
        "expected": true,
        "message": "One is an odd number",
        "source": "    at Object.<anonymous> (http://localhost:8888/tests/test.js:4:10)"
      },
      {
        "actual": false,
        "expected": true,
        "message": "Zero is not odd number",
        "source": "    at Object.<anonymous> (http://localhost:8888/tests/test.js:6:10)"
      }
      ],
        "tests": [
        {
          "runtime": 9,
          "total": 1,
          "passed": 0,
          "failed": 1,
          "url": "/sample.html"
        }
      ]
    }
}
```

## Configuration

To run browser tests on BrowserStack infrastructure, you need to create a `browserstack.json` file in project's root directory (the directory from which tests are run), by running this command:

    browserstack-runner init

### Parameters for `browserstack.json`

 * `username`: BrowserStack username (Or `BROWSERSTACK_USERNAME` environment variable)
 * `key`: BrowserStack [access key](https://www.browserstack.com/accounts/local-testing) (Or `BROWSERSTACK_KEY` environment variable)
 * `test_path`: Path to the test page which will run the tests when opened in a browser.
 * `test_framework`: Specify test framework which will run the tests. Currently supporting qunit, jasmine, jasmine2 and mocha.
 * `timeout`: Specify worker timeout with BrowserStack.
 * `browsers`: A list of browsers on which tests are to be run. Find a [list of all supported browsers and platforms on browerstack.com](https://www.browserstack.com/list-of-browsers-and-platforms?product=js_testing).
 * `build`: A string to identify your test run in Browserstack.  In `TRAVIS` setup `TRAVIS_COMMIT` will be the default identifier.
 * `proxy`: Specify a proxy to use for the local tunnel. Object with `host`, `port`, `username` and `password` properties.

A sample configuration file:

```json
{
  "username": "<username>",
  "key": "<access key>",
  "test_framework": "qunit|jasmine|jasmine2|mocha",
  "test_path": ["relative/path/to/test/page1", "relative/path/to/test/page2"],
  "browsers": [
    {
      "browser": "ie",
      "browser_version": "10.0",
      "device": null,
      "os": "Windows",
      "os_version": "8"
    },
    {
      "os": "android",
      "os_version": "4.0",
      "device": "Samsung Galaxy Nexus"
    },
    {
      "os": "ios",
      "os_version": "7.0",
      "device": "iPhone 5S"
    }
  ]
}
```

#### `browsers` parameter

`browsers` parameter is a list of objects, where each object contains the details of the browsers on which you want to run your tests. This object differs for browsers on desktop platforms and browsers on mobile platforms. Browsers on desktop platform should contain `browser`, `browser_version`, `os	`, `os_version` parameters set as required.

Example:
```json
{
      "browser": "ie",
      "browser_version": "10.0",
      "os": "Windows",
      "os_version": "8"
}
```

For mobile platforms, `os`, `os_version` and `device` parameters are required.

Example:
```json
[{
	"os": "ios",
	"os_version": "8.3",
	"device": "iPhone 6 Plus"
},
{
	"os": "android",
	"os_version": "4.0",
	"device": "Google Nexus"
}
]
```

For a full list of supported browsers, platforms and other details, [visit the BrowserStack site](https://www.browserstack.com/list-of-browsers-and-platforms?product=js_testing).

#### Compact `browsers` configuration

When `os` and `os_version` granularity is not desired, following configuration can be used:
 * `[browser]_current` or *browser*_latest: will assign the latest version of the *browser*.
 * `[browser]_previous`: will assign the previous version of the *browser*.
 * `[browser]_[version]`: will assign the *version* specified of the *browser*. Minor versions can be concatenated with underscores.

This can also be mixed with fine-grained configuration.

Example:
```json
{
  "browsers": [
      "chrome_previous",
      "chrome_latest",
      "firefox_previous",
      "firefox_latest",
      "ie_6",
      "ie_11",
      "opera_12_1",
      "safari_5_1",
      {
        "browser": "ie",
        "browser_version": "10.0",
        "device": null,
        "os": "Windows",
        "os_version": "8"
      }
  ]
}
```
**Note:**
These shortcuts work only for browsers on desktop platforms supported by BrowserStack.

### Proxy support for BrowserStack local

Add the following in `browserstack.json`
```json
{
  "proxy": {
      "host": "localhost",
      "port": 3128,
      "username": "foo",
      "password": "bar"
  }
}
```

### Supported environment variables

To avoid duplication of system or user specific information across several configuration files, use these environment variables:

* `BROWSERSTACK_USERNAME`: BrowserStack user name.
* `BROWSERSTACK_KEY`: BrowserStack key.
* `TUNNEL_ID`: Identifier for the current instance of the tunnel process. In `TRAVIS` setup `TRAVIS_JOB_ID` will be the default identifier.
* `BROWSERSTACK_JSON`: Path to the browserstack.json file. If null, `browserstack.json` in the root directory will be used.


### Secure Information

To avoid checking in the BrowserStack `username` and `key` in your source control system, the corresponding environment variables can be used.

These can also be provided by a build server, for example [using secure environment variables on Travis CI](http://about.travis-ci.org/docs/user/build-configuration/#Secure-environment-variables).


### Code Sample

Check out code sample [here].
[here]:https://github.com/browserstack/browserstack-runner-sample
