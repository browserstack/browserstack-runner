// Here begins strider-qunit extension plugin
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

  var striderErrors = []
    , i = 0;

  QUnit.log = function(res){
    i++;
    if (!res || !res.result){
      // Failure:
      striderErrors.push(JSON.stringify(res));
    }
    if (i%50 == 0){
      var data = {
          tests_run: i
        , tracebacks: striderErrors
        , url : window.location.pathname
      }
      striderErrors = [];
      post('/strider-progress', data, function(){}); 
    }
  }

  QUnit.done = function(results){
    results.tracebacks = striderErrors;
    results.url = window.location.pathname;
    post("/strider-report", results, function(){});
  }
})();
// End Strider
