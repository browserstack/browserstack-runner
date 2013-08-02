var path = require('path'),
    fs = require('fs');
var pwd = process.cwd();

try {
  var config = require(process.cwd() + '/browserstack');
} catch (e) {
  if (e.code == 'MODULE_NOT_FOUND') {
    console.error('Configuration file `browserstack.json` is missing.');
  } else {
    throw(e);
  }

  process.exit(1);
}

if (process.env.BROWSERSTACK_KEY) {
  config.key = process.env.BROWSERSTACK_KEY;
}

if (process.env.BROWSERSTACK_USERNAME) {
  config.username = process.env.BROWSERSTACK_USERNAME;
}

['username', 'key', 'test_path', 'browsers'].forEach(function (param) {
  if (typeof config[param] === 'undefined') {
    console.error('Configuration parameter `%s` is required.', param);
    process.exit(1);
  }
});

// Convert absoulte path into relative paths.
if (config.test_path.indexOf(pwd) === 0) {
  config.test_path = config.test_path.slice(pwd.length + 1);
}

if (!fs.existsSync(config.test_path)){
  console.error('Test path is invalid.');
  process.exit(1);
}

for (key in config) {
  if (config.hasOwnProperty(key)) {
    exports[key] = config[key];
  }
}
