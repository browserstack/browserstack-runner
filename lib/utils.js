var Log = require('./logger'),
    logger = new Log(global.logLevel),
    config = require('./config'),
    http = require('http'),
    url = require('url'),
    querystring = require('querystring');

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

var alertBrowserStack = function alertBrowserStack(subject, content, params, fn) {
  var endpoint = config.alert_endpoint || 'http://www.browserstack.com/automate/alert';
  var urlObject = url.parse(endpoint);

  var context = config.alert_context || 'Runner alert';
  logger.info('[%s] [%s] %s, %s', new Date().toISOString(), context, subject, content);

  if (typeof fn !== 'function') {
    if (typeof params === 'function') {
    } else {
      fn = function() {
        process.exit('SIGINT');
      };
    }
  }

  if (!params || typeof(params) !== 'object') {
    params = {};
  }

  params.subject = subject;
  params.content = content;
  params.context = context;

  var body = querystring.stringify(params);
  var options = {
    hostname: urlObject.hostname,
    port: urlObject.port,
    path: urlObject.path,
    method: 'POST',
    auth: config.username + ':' + config.key,
    headers: {
      'Content-Length': body.length
    }
  };

  var callback = function(res) {
    var response = '';
    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      response += chunk;
    });
    res.on('end', function() {
      if (res.statusCode !== 200) {
        var message;
        if (res.headers['content-type'].indexOf('json') !== -1) {
          var resp = JSON.parse(response);
          message = resp.message;
          message += ' - ' + resp.errors.map(function(err) {
            return '`' + err.field + '`' + ' ' + err.code;
          }).join(', ');
        } else {
          message = response;
        }
        if (!message && res.statusCode === 403) {
          message = 'Forbidden';
        }
        fn(new Error(message));
      } else {
        fn(null, JSON.parse(response));
      }
    });
  };

  var request = http.request(options, callback);
  request.write(body);
  request.end();

  return request;
};

exports.titleCase = titleCase;
exports.uuid = uuid;
exports.browserString = browserString;
exports.objectSize = objectSize;
exports.alertBrowserStack = alertBrowserStack;
