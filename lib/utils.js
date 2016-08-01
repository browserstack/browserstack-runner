var Log = require('./logger'),
    logger = new Log(global.logLevel),
    http = require('http'),
    url = require('url'),
    querystring = require('querystring'),
    config;

String.prototype.escapeSpecialChars = function() {
  return this.replace(/\n/g, '\\n')
  .replace(/\r/g, '\\r')
  .replace(/\t/g, '\\t')
  .replace(/\f/g, '\\f')
  .replace(/\u0008/g, '\\u0008')  // \b
  .replace(/\v/g, '\\u000b')      // \v
  .replace(/\0/g, '\\u0000')      // \0
  .replace(/\\\'/, '\'');         // TODO: check why this exists
};

var titleCase = function toTitleCase(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

var uuid = function uuidGenerator() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

var browserString = function browserString(config) {
  var os_details = config.os + ' ' + config.os_version;
  if (config.browser) {
    return os_details + ', ' + (config.browser === 'ie' ? 'Internet Explorer' : titleCase(config.browser)) + ' ' + config.browser_version;
  } else {
    return os_details + (config.device ? (', ' + config.device) : '');
  }
};

var objectSize = function objectSize(obj) {
  var size = 0,
    key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      size++;
    }
  }
  return size;
};

exports.titleCase = titleCase;
exports.uuid = uuid;
exports.browserString = browserString;
exports.objectSize = objectSize;
