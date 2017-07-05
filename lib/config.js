var fs = require('fs'),
  pwd = process.cwd();

var formatPath = function(path) {
  if (/^win/.test(process.platform)) {
    path = path.replace(/\//g, '\\');
  }

  if (path.indexOf(pwd) === 0) {
    path = path.slice(pwd.length + 1);
  }
  if (!fs.existsSync(path) && !fs.existsSync(path.split('?')[0])) {
    throw new Error('Test path: ' + path + ' is invalid.');
  }
  return path;
};

exports.config = function(config) {
  var package_json = {};
  try {
    package_json = require(process.cwd() + '/package.json');
  } catch (e) {
  }

  if (process.env.BROWSERSTACK_KEY) {
    this.key = process.env.BROWSERSTACK_KEY;
    delete config.key;
  }

  if (process.env.BROWSERSTACK_ACCESS_KEY) {
    this.key = process.env.BROWSERSTACK_ACCESS_KEY;
    delete config.key;
  }

  if (process.env.BROWSERSTACK_USERNAME) {
    this.username = process.env.BROWSERSTACK_USERNAME;
    delete config.username;
  }

  if (!config.project) {
    var fallback_project;

    if (this.username === 'OpensourceJSLib') {
      fallback_project = 'Anonymous OpenSource Project';
    }

    this.project = process.env.TRAVIS_REPO_SLUG || fallback_project || package_json.name;
  }

  var commit_id = process.env.TRAVIS_COMMIT;

  if(!config.build) {
    this.build = commit_id ? 'Commit-' + commit_id.slice(0, commit_id.length / 2) : 'Local run, ' + new Date().toISOString();
  }

  var that = this;
  ['username', 'key', 'browsers', 'test_path'].forEach(function(param) {
    if (typeof config[param] === 'undefined' && typeof that[param] === 'undefined') {
      throw new Error('Configuration parameter ' + param + ' is required.');
    }
  });

  this.tunnelIdentifier = process.env.TUNNEL_ID || process.env.TRAVIS_JOB_ID || process.env.TRAVIS_BUILD_ID;

  if (typeof(config['test_server']) === 'undefined') {
    this.test_path = config.test_path;
    if (Object.prototype.toString.call(this.test_path) === '[object Array]') {
      this.test_path.forEach(function(path, index, test_path_array) {
        test_path_array[index] = formatPath(path);
      });

    } else {
      //Backward Compatibility, if test_path is not array of path
      this.test_path = formatPath(this.test_path);
    }
    delete config.test_path;
  }

  this.status = 0;

  for (var key in config) {
    this[key] = config[key];
  }

  if (!this.test_server_port) {
    this.test_server_port = 8888;
  }
};
