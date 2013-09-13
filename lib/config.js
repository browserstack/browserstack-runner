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

try {
  var package_json = require(process.cwd() + '/package.json');
} catch (e) {
  var package_json = {};
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

if (commit_id) {
  config.build = "Commit-" + commit_id.slice(0, commit_id.length/2);
}

['username', 'key', 'test_path', 'browsers'].forEach(function (param) {
  if (typeof config[param] === 'undefined') {
    console.error('Configuration parameter `%s` is required.', param);
    process.exit(1);
  }
});

var formatPath = function(path) {
// Convert absoulte path into relative paths.
  if (path.indexOf(pwd) === 0) {
    path= path.slice(pwd.length + 1);
  }

  if (!fs.existsSync(path)){
    console.error('Test path: '+ path + ' is invalid.');
    process.exit(1);
  }
    return path;
}

if(Object.prototype.toString.call(config.test_path) === '[object Array]') {
  config.test_path.forEach(function(path){
    path = formatPath(path);
  });
} else {
    //Backward Compatibility, if test_path is not array of path
    config.test_path = formatPath(config.test_path);
}
for (key in config) {
  if (config.hasOwnProperty(key)) {
    exports[key] = config[key];
  }
}
