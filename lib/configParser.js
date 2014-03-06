//beta browsers not handled
//+ not handled
var ConfigParser = {
  finalBrowsers: [],

  bsBrowsers: null,

  parse: function(client, browser_config, callback) {
    client.getBrowsers(function(error, browsers) {
      ConfigParser.bsBrowsers = browsers;
      for (var key in browser_config) {
        var entry = browser_config[key];
        ConfigParser.finalBrowsers.push(ConfigParser.getBrowserObject(entry));
      }
      callback(ConfigParser.finalBrowsers);
    });
    return
  },

  setBrowserVersion: function(browsers, browserObject, verStr) {
    var filteredBrowsers = browsers.map(function(currentValue, index, array) {
      if (currentValue.browser == browserObject.browser) {
        return currentValue.browser_version; 
      }
    }).filter(function(currentValue, index, array) {
      return currentValue && array.indexOf(currentValue) === index;
    }).sort(function(a, b) {
      return parseFloat(a) - parseFloat(b);
    });
    if (verStr == 'current') {
      return filteredBrowsers[filteredBrowsers.length - 1];
    }
    else if (verStr == 'previous') {
      return filteredBrowsers[filteredBrowsers.length - 2];
    }
  },

  populateOsAndOsVersion: function(browsers, browserObject) {
    if (!(browserObject.os && browserObject.os_version)) {
      var windowsFiltered = browsers.filter(function(currentValue, index, array) {
        return currentValue.os == 'Windows' && currentValue.browser == browserObject.browser && parseFloat(currentValue.browser_version).toPrecision(4) == parseFloat(browserObject.browser_version).toPrecision(4);
      });
      var osxFiltered = browsers.filter(function(currentValue, index, array) {
        return currentValue.os == 'OS X' && currentValue.browser == browserObject.browser && parseFloat(currentValue.browser_version).toPrecision(4) == parseFloat(browserObject.browser_version).toPrecision(4);
      });
      browserObject = windowsFiltered.length > 0 ? windowsFiltered[Math.floor(Math.random() * windowsFiltered.length)] : osxFiltered[Math.floor(Math.random() * osxFiltered.length)];
    }
    return browserObject;
  },

  getBrowserObject: function(entry) {
    var browserObject = {};
    if (typeof(entry) == 'string') {
      var browserData = entry.split("_");
      var lindex = browserData.length - 1;
      browserObject.browser = browserData[0];
      if (browserData[lindex] && browserData[lindex].indexOf("+") == -1) {
        if (["current", "previous"].indexOf(browserData[1]) != -1) {
          browserObject.browser_version = ConfigParser.setBrowserVersion(ConfigParser.bsBrowsers, browserObject, browserData[1]);
        }
        else {
          browserObject.browser_version = browserData.slice(1, lindex + 1).join(".");
        }
      }
      else {
        browserObject.browser_version = browserData.slice(1, lindex + 1).join(".");
      }
    } else {
      browserObject = entry;
    }
    browserObject = ConfigParser.populateOsAndOsVersion(ConfigParser.bsBrowsers, browserObject);
    return browserObject;
  }
};

exports.ConfigParser = ConfigParser;
