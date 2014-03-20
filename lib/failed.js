var path = require('path'),
  fs = require('fs');
var pwd = process.cwd();

failed_path = path.resolve(path.relative(process.cwd(), 'browserstack-failed.json'));

try {
  var failed = require(failed_path);
} catch (e) {
}

exports['browsers'] = [];

if(failed){
  console.log("Launching tests on previously failed browsers only:", failed_path);

  exports['browsers'] = failed;
}

var failed = [];
var hasFailed = false;

exports['cleanUp'] = function(browser){
  if(!hasFailed){
    fs.unlink(failed_path);
  }
};

exports['add'] = function(browser){
  delete browser.url;

  hasFailed = true;

  failed.push(browser);

  var json = JSON.stringify(failed, null, 4);
  fs.writeFileSync(failed_path, json, 'utf-8')
};