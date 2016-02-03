(function (global) {
  'use strict';

  global.BrowserStack = global.BrowserStack || {};
  global.BrowserStack.util = {
    inspect: require('util-inspect'),
    toArray: function toArray(list, index) {
      var array = [];
      index = index || 0;

      for (var i = index || 0; i < list.length; i++) {
        array[i - index] = list[i];
      }

      return array;
    }
  };
})(global || window || {});
