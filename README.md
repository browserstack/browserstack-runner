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

## Configuration

To run browser tests on BrowserStack infrastructure, you need to create a `browserstack.json` file in project's root directory (the directory from which tests are run), by running this command:

    browserstack-runner init

### Parameters for `browserstack.json`

 * `username`: BrowserStack username (Or `BROWSERSTACK_USERNAME` environment variable)
 * `key`: BrowserStack [access key](https://www.browserstack.com/accounts/local-testing) (Or `BROWSERSTACK_KEY` environment variable)
 * `test_path`: Path to the test page which will run the tests when opened in a browser.
 * `test_framework`: Specify test framework which will run the tests. Currently supporting qunit, jasmine, jasmine2 and mocha.
 * `timeout`: Specify worker timeout with BrowserStack.
 * `browsers`: A list of browsers on which tests are to be run. Find a [list of all supported browsers and platforms on browerstack.com](http://www.browserstack.com/list-of-browsers-and-platforms?product=live).
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

#### Compact `browsers` configuration

When `os` and `os_version` granularity is not desired, following configuration can be used:
 * `[browser]_current` or *browser*_latest: will assign the latest version of the *browser*.
 * `[browser]_previous`: will assign the previous version of the *browser*.
 * `[browser]_[version]`: will assign the *version* specificed of the *browser*. Minor versions can be concatinated with underscores.

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
