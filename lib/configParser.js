//beta browsers not handled
//+ not handled
var Log = require('./logger'),
    logger = new Log(global.logLevel || 'info');

var BROWSER_LIST_URL = 'https://www.browserstack.com/list-of-browsers-and-platforms/js_testing';

var ConfigParser = {
  finalBrowsers: [],

  bsBrowsers: null,

  parse: function(client, browser_config, callback) {
    client.getBrowsers(function(error, browsers) {
      if(error) {
        logger.info('Error getting browsers list from BrowserStack');
        logger.info(error);
        throw new Error('Error getting browsers list from BrowserStack');
      }
      ConfigParser.bsBrowsers = browsers;
      for (var key in browser_config) {
        var entry = browser_config[key];
        ConfigParser.finalBrowsers.push(ConfigParser.getBrowserObject(entry));
      }
      callback(ConfigParser.finalBrowsers);
    });
    return;
  },

  setBrowserVersion: function(browserObject, verStr) {
    var filteredBrowsers = ConfigParser.bsBrowsers.map(function(currentValue) {
      if (currentValue.browser.toLowerCase() === browserObject.browser) {
        return (browserObject.mobile ? currentValue.os_version : currentValue.browser_version);
      }
    }).filter(function(currentValue, index, array) {
      return currentValue && array.indexOf(currentValue) === index;
    }).sort(function(a, b) {
      return parseFloat(a) - parseFloat(b);
    });
    if (verStr === 'current' || verStr === 'latest') {
      return ConfigParser.checkIfLatestFlagApplicable(browserObject) ? 'latest' : filteredBrowsers[filteredBrowsers.length - 1];
    }
    else if (verStr === 'previous') {
      return ConfigParser.checkIfLatestFlagApplicable(browserObject) ? 'latest-1' : filteredBrowsers[filteredBrowsers.length - 2];
    }
  },

  checkIfLatestFlagApplicable: function(browserObject) {
    return !browserObject.mobile && browserObject.browser && ['chrome', 'firefox', 'edge'].includes(browserObject.browser.toLowerCase());
  },

  populateOsAndOsVersion: function(browserObject) {
    if (!(browserObject.os && browserObject.os_version)) {
      if (browserObject.mobile) {

        var mobileFiltered = ConfigParser.bsBrowsers.filter(function(currentValue) {
          return currentValue.browser.toLowerCase() === browserObject.browser && parseFloat(currentValue.os_version).toPrecision(4) === parseFloat(browserObject.os_version).toPrecision(4);
        });
        if (!mobileFiltered.length) {
          throw new Error('No mobile match found for ' + JSON.stringify(browserObject) + '\nCheck ' + BROWSER_LIST_URL);
        }

        browserObject = mobileFiltered[Math.floor(Math.random() * mobileFiltered.length)];
      } else {

        var windowsFiltered = ConfigParser.bsBrowsers.filter(function(currentValue) {
          return currentValue.os === 'Windows' && currentValue.browser_version.match(/metro/i) == null && currentValue.browser === browserObject.browser && ((browserObject.browser_version && browserObject.browser_version.indexOf('latest') > -1) || parseFloat(currentValue.browser_version).toPrecision(4) === parseFloat(browserObject.browser_version).toPrecision(4));
        });

        var osxFiltered = ConfigParser.bsBrowsers.filter(function(currentValue) {
          return currentValue.os === 'OS X' && currentValue.browser === browserObject.browser && ((browserObject.browser_version && browserObject.browser_version.indexOf('latest')) > -1 || parseFloat(currentValue.browser_version).toPrecision(4) === parseFloat(browserObject.browser_version).toPrecision(4));
        });
        // Use Windows VMs if no OS specified
        var desktopFiltered = windowsFiltered.length > 0 ? windowsFiltered : osxFiltered;

        if (!desktopFiltered.length) {
          throw new Error('No desktop match found for ' + JSON.stringify(browserObject) + '\nCheck ' + BROWSER_LIST_URL);
        }
        var filteredObject = desktopFiltered[Math.floor(Math.random() * desktopFiltered.length)];
        if (browserObject.browser_version.indexOf('latest') > -1) {
          filteredObject.browser_version = browserObject.browser_version;
        }
        browserObject = filteredObject;
      }

    }
    return browserObject;
  },

  getBrowserObject: function(entry) {
    var browserObject = {};
    var version = null;
    var sliceStart = 1;
    if (typeof entry  === 'string') {
      var browserData = entry.split('_');
      var lindex = browserData.length - 1;
      if (browserData[0] === 'mobile' || browserData[0] === 'android' || (browserData[0] === 'opera' && browserData[1] === 'browser')) {
        browserObject.browser = browserData[0] + ' ' + browserData[1];
        browserObject.mobile = true;
        sliceStart = 2;
      } else {
        browserObject.browser = browserData[0];
      }
      if (browserData[lindex] && browserData[lindex].indexOf('+') === -1) {
        if (['current', 'previous', 'latest'].indexOf(browserData[lindex]) !== -1) {
          version = ConfigParser.setBrowserVersion(browserObject, browserData[lindex]);
        }
        else {
          version = browserData.slice(sliceStart, lindex + 1).join('.');
        }
      } else {
        version = browserData.slice(sliceStart, lindex + 1).join('.');
      }
      if (browserObject.mobile) {
        browserObject.os_version = version;
        browserObject.browser_version = null;
      } else {
        browserObject.browser_version = version;
      }
    } else {
      browserObject = entry;
    }
    browserObject = ConfigParser.populateOsAndOsVersion(browserObject);
    return browserObject;
  }
};

exports.ConfigParser = ConfigParser;
