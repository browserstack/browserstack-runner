//beta browsers not handled
//+ not handled
var Log = require('./logger'),
    logger = new Log(global.logLevel);

var ConfigParser = {
  finalBrowsers: [],

  bsBrowsers: null,

  parse: function(client, browser_config, callback) {
    client.getBrowsers(function(error, browsers) {
      if(error) {
        logger.info('Error getting browsers list from BrowserStack');
        logger.info(error);
        process.exit(1);
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
      return filteredBrowsers[filteredBrowsers.length - 1];
    }
    else if (verStr === 'previous') {
      return filteredBrowsers[filteredBrowsers.length - 2];
    }
  },

  populateOsAndOsVersion: function(browserObject) {
    if (!(browserObject.os && browserObject.os_version)) {
      if (browserObject.mobile) {

        var mobileFiltered = ConfigParser.bsBrowsers.filter(function(currentValue) {
          return currentValue.browser.toLowerCase() === browserObject.browser && parseFloat(currentValue.os_version).toPrecision(4) === parseFloat(browserObject.os_version).toPrecision(4);
        });

        browserObject = mobileFiltered[Math.floor(Math.random() * mobileFiltered.length)];
      }
      else {

        var windowsFiltered = ConfigParser.bsBrowsers.filter(function(currentValue) {
          return currentValue.os === 'Windows' && currentValue.browser_version.match(/metro/i) == null && currentValue.browser === browserObject.browser && parseFloat(currentValue.browser_version).toPrecision(4) === parseFloat(browserObject.browser_version).toPrecision(4);
        });

        var osxFiltered = ConfigParser.bsBrowsers.filter(function(currentValue) {
          return currentValue.os === 'OS X' && currentValue.browser === browserObject.browser && parseFloat(currentValue.browser_version).toPrecision(4) === parseFloat(browserObject.browser_version).toPrecision(4);
        });
        browserObject = windowsFiltered.length > 0 ? windowsFiltered[Math.floor(Math.random() * windowsFiltered.length)] : osxFiltered[Math.floor(Math.random() * osxFiltered.length)];
      }

    }
    return browserObject;
  },

  getBrowserObject: function(entry) {
    var browserObject = {};
    var version = null;
    var sliceStart = 1;
    if (typeof(entry) === 'string') {
      var browserData = entry.split('_');
      var lindex = browserData.length - 1;
      if (browserData[0] === 'mobile' || browserData[0] === 'android' || (browserData[0] === 'opera' && browserData[1] === 'browser')) {
        browserObject.browser = browserData[0] + ' ' + browserData[1];
        browserObject.mobile = true;
        sliceStart = 2;
      }
      else {
        browserObject.browser = browserData[0];
      }
      if (browserData[lindex] && browserData[lindex].indexOf('+') === -1) {
        if (['current', 'previous', 'latest'].indexOf(browserData[lindex]) !== -1) {
          version = ConfigParser.setBrowserVersion(browserObject, browserData[lindex]);
        }
        else {
          version = browserData.slice(sliceStart, lindex + 1).join('.');
        }
      }
      else {
        version = browserData.slice(sliceStart, lindex + 1).join('.');
      }
      if (browserObject.mobile) {
        browserObject.os_version = version;
        browserObject.browser_version = null;
      }
      else {
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
