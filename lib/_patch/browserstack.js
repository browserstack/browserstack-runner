(function(){
  var BrowserStack = {};

  function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }

  // Tiny Ajax Post
  var post = function (url, json, cb) {
    var req;

    if (window.ActiveXObject)
      req = new ActiveXObject('Microsoft.XMLHTTP');
    else if (window.XMLHttpRequest)
      req = new XMLHttpRequest();
    else
      throw "Strider: No ajax"

    req.onreadystatechange = function () {
      if (req.readyState==4)
        cb(req.responseText);
    };
    var data;
    if(window.CircularJSON) {
      data = window.CircularJSON.stringify(json);
    } else {
      data = JSON.stringify(json);
    }
    req.open("POST", url, true);
    req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    req.setRequestHeader('X-Browser-String', BrowserStack.browser_string);
    req.setRequestHeader('X-Worker-UUID', BrowserStack.worker_uuid);
    req.setRequestHeader('Content-type', 'application/json');
    req.send(data);
  }

  // Change some console method to capture the logs.
  // This must not replace the console object itself so that other console methods
  //  from the browser or added by the tested application remain unaffected.
  // https://github.com/browserstack/browserstack-runner/pull/199
  var browserstack_console = window.console || {};
  browserstack_console.log = function () {
    var args = BrowserStack.util.toArray(arguments).map(BrowserStack.util.inspect);
    post('/_log/', { arguments: args }, function () {});
  };
  browserstack_console.warn = function () {
    var args = BrowserStack.util.toArray(arguments).map(BrowserStack.util.inspect);
    post('/_log/', { arguments: args }, function () {});
  };

  BrowserStack.post = post;
  BrowserStack.getParameterByName = getParameterByName;

  BrowserStack.browser_string = getParameterByName('_browser_string');
  BrowserStack.worker_uuid = getParameterByName('_worker_key');

  window.BrowserStack = BrowserStack;
  // If the browser didn't have a console object (old IE), then this will create it.
  // Otherwise this is a no-op as it will assign the same object it already held.
  window.console = browserstack_console;
})();
