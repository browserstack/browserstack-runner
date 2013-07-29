var titleCase = function toTitleCase(str) {
  return str.replace(/\w\S*/g, function (txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

var uuid = function uuidGenerator () {
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
};

var browserString = function browserString (config) {
  return config.os + ' ' + config.os_version + ': ' +
    titleCase(config.browser || config.device) + ' ' +
    config.browser_version;
}

exports.titleCase = titleCase;
exports.uuid = uuid;
exports.browserString = browserString;
