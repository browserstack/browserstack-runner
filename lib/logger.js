var fmt = require('util').format;
var logLevels = {ERROR: 3, INFO: 6, DEBUG: 7};

function Log(level){
  if ('string' === typeof level) {
    level = logLevels[level.toUpperCase()];
  }
  this.level = isFinite(level) ? level : logLevels.DEBUG;
  this.stream = process.stdout;
}


Log.prototype = {

  log: function(levelStr, args) {
    if (logLevels[levelStr] <= this.level) {
      var msg = fmt.apply(null, args);
      this.stream.write(msg + '\n');
    }
  },

  error: function(){
    this.log('ERROR', arguments);
  },

  info: function(){
    this.log('INFO', arguments);
  },

  debug: function(){
    this.log('DEBUG', arguments);
  }
};

module.exports = Log;
