try {
  var config = require(process.cwd() + '/browserstack');
} catch (e) {
  if (e.code == 'MODULE_NOT_FOUND') {
    console.log('Configuration file `browserstack.json` is missing.');
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

for (key in config) {
  if (config.hasOwnProperty(key)) {
    exports[key] = config[key];
  }
}
