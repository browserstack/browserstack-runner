(function(){
  // Tiny Ajax Post
  var post = function (url, json, cb){
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
    var data = "data=" + JSON.stringify(json)
    req.open("POST", url, true);
    req.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    req.setRequestHeader('Content-length',  data.length);
    req.setRequestHeader('Connection', 'close');
    req.send(data);
  }

  if (console && console.log) {
    _console_log = console.log;

    console.log = function (arguments) {
      post('/_log/', arguments, function () {});
    };
  }

  var BrowserStack = {
    post: post
  };

  window.BrowserStack = BrowserStack;
})();
