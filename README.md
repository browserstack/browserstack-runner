A command line interface to run browser tests over BrowserStack.

## Install
Go to the `browserstack-runner` directory.  
Install browserstack-runner

    npm -g install

or


For development,

    npm link

## Configuration
To run browser tests on BrowserStack infrastructure, you need to
create a `browserstack.json` file in project's root directory (the
directory from which tests are run), by running this command:

    browserstack-runner init [preset]

If nothing is provided as `preset` **default** is used.

> Currently only one preset is present: **default**

### Parameters

 - *username*: BrowserStack username
   (Alternatively: use `BROWSERSTACK_USERNAME` environment variable)

 - *key*: BrowserStack key
   (Alternatively: use `BROWSERSTACK_KEY` environment variable)

 - *test_path*: Path to the which will execute the tests when opened
   in a browser.

 - *test_framework*: Specify test framework which will execute the tests.
    We support qunit, jasmine and mocha.

 - *timeout*: Specify worker timeout with BrowserStack.

 - *browsers*: A list of browsers on which tests are to be run.

A sample configuration file:

```json
{
  "username": "<username>",
  "key": "<key>",
  "test_framework": "qunit/jasmine/mocha",
  "test_path": ["relative/path/to/test/page1", "relative/path/to/test/page2"],
  "browsers":   [{
    "browser": "firefox",
    "browser_version": "15.0",
    "device": null,
    "os": "OS X",
    "os_version": "Snow Leopard"
  },
  {
    "browser": "firefox",
    "browser_version": "16.0",
    "device": null,
    "os": "Windows",
    "os_version": "7"
  },
  {
    "browser": "firefox",
    "browser_version": "17.0",
    "device": null,
    "os": "Windows",
    "os_version": "8"
  },
  {
    "browser": "ie",
    "browser_version": "8.0",
    "device": null,
    "os": "Windows",
    "os_version": "7"
  },
  {
    "browser": "ie",
    "browser_version": "9.0",
    "device": null,
    "os": "Windows",
    "os_version": "7"
  },
  {
    "browser": "ie",
    "browser_version": "10.0",
    "device": null,
    "os": "Windows",
    "os_version": "8"
  }]
}
```

#### Compact `browsers` configuration

Alternatively, if `os` and `os_version` granularity is not desired, following configuration can be used:
- *browser*_current or *browser*_latest: will assign the latest version of the *browser*.
- *browser*_previous: will assign the previous version of the *browser*.
- *browser*_*version*: will assign the *version* specificed of the *browser*. Minor versions can be concatinated with underscore.

Example:
```json
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
```

### Enviroment variables

* `BROWSERSTACK_USER`:
BrowserStack user name.

* `BROWSERSTACK_KEY`:
BrowserStack key.

* `TUNNEL_ID`:
Identifier for the current instance of the tunnel process. In `TRAVIS` setup `TRAVIS_JOB_ID` will be the default identifier.

* `BROWSERSTACK_JSON`:
Path to the browserstack.json file. If null, `browserstack.json` in the root directory will be used.


### Secure Information

To prevent checking in the BrowserStack `username` and `key` in your
source control, the corresponding environment variables can be used.

The environment variables then can be safely provided in the build
configuration. For example, with travis-ci you can follow:

http://about.travis-ci.org/docs/user/build-configuration/#Secure-environment-variables

## Running tests
Run `browserstack-runner` to run the tests on all the browsers mentioned
in the configuration.

You can include this in your test script to automatically run cross
browser tests on every build.
