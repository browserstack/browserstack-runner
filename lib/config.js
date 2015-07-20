var Log = require('./logger'),
  logger = new Log(global.logLevel),
  path = require('path'),
  fs = require('fs'),
  pwd = process.cwd();

var config_path = process.env.BROWSERSTACK_JSON || 'browserstack.json';
config_path = path.resolve(path.relative(process.cwd(), config_path));
logger.debug('Using config:', config_path);

try {
  var config = require(config_path);
} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND') {
    logger.info('Configuration file `browserstack.json` is missing.');
  } else {
    logger.info('Invalid configuration in `browserstack.json` file');
    logger.info(e.message);
    logger.info(e.stack);
  }
  process.exit(1);
}

var package_json = {};
try {
  package_json = require(process.cwd() + '/package.json');
} catch (e) {
}

if (process.env.BROWSERSTACK_KEY) {
  config.key = process.env.BROWSERSTACK_KEY;
}

if (process.env.BROWSERSTACK_USERNAME) {
  config.username = process.env.BROWSERSTACK_USERNAME;
}

if (!config.project) {
  var fallback_project;

  if (config.username === 'OpensourceJSLib') {
    fallback_project = 'Anonymous OpenSource Project';
  }

  config.project = process.env.TRAVIS_REPO_SLUG || package_json.name;
}

var commit_id = process.env.TRAVIS_COMMIT;

if(!config.build) {
  config.build = commit_id ? 'Commit-' + commit_id.slice(0, commit_id.length / 2) : 'Local run, ' + new Date().toISOString();
}

['username', 'key', 'browsers', 'test_path'].forEach(function(param) {
  if (typeof config[param] === 'undefined') {
    console.error('Configuration parameter `%s` is required.', param);
    process.exit(1);
  }
});

var formatPath = function(path) {
  if (/^win/.test(process.platform)) {
    path = path.replace(/\//g, '\\');
  }
  
  if (path.indexOf(pwd) === 0) {
    path = path.slice(pwd.length + 1);
  }
  if (!fs.existsSync(path) && !fs.existsSync(path.split('?')[0])) {
    console.error('Test path: ' + path + ' is invalid.');
    process.exit(1);
  }
  return path;
};

config.tunnelIdentifier = process.env.TUNNEL_ID || process.env.TRAVIS_JOB_ID || process.env.TRAVIS_BUILD_ID;

if (typeof(config['test_server']) === 'undefined') {
  if (Object.prototype.toString.call(config.test_path) === '[object Array]') {
    config.test_path.forEach(function(path) {
      path = formatPath(path);
    });

  } else {
    //Backward Compatibility, if test_path is not array of path
    config.test_path = formatPath(config.test_path);
  }
}

config.status = 0;

for (var key in config) {
  if (config.hasOwnProperty(key)) {
    exports[key] = config[key];
  }
}
