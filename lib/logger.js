var fmt = require('util').format;
var logLevels = {ERROR: 3, INFO: 6, DEBUG: 7};

function Log(level){
  if ('string' == typeof level) level = logLevels[level.toUpperCase()];
  this.level = isFinite(level) ? level : logLevels.DEBUG;
  this.stream = process.stdout;
};


Log.prototype = {

  log: function(levelStr, args) {
    if (logLevels[levelStr] <= this.level) {
      var msg = fmt.apply(null, args);
      this.stream.write(
          '[' + new Date + ']'
        + ' ' + msg
        + '\n'
      );
    }
  },

  error: function(msg){
    this.log('ERROR', arguments);
  },

  info: function(msg){
    this.log('INFO', arguments);
  },

  debug: function(msg){
    this.log('DEBUG', arguments);
  }
};

module.exports = Log;
