(function(){
  var checker = setInterval(function(){
    if(!jasmine.running){
      var results = {};
      var specs = jsApiReporter.specs();
      results.runtime = jsApiReporter.executionTime();
      results.total = 0;
      results.passed = 0;
      results.failed = 0;
      results.tracebacks = [];

      for(spec in specs){
        var s = specs[spec]

        if (s.status === 'passed') {
            results.passed++;
        } else {
            results.tracebacks.push(s.description);
            results.failed = true;
        }
      }

      results.total = results.passed + results.failed;
      results.url = window.location.pathname;
      BrowserStack.post("/_report", results, function(){});
    }
    clearInterval(checker);
  }, 1000);
})();

