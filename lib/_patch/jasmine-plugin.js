(function(){
  function countSpecs(suite, results){
    suite.specs.forEach(function(s){
      if(s.passed){
	results.passed++;
      }else{
	results.tracebacks.push(s.description);
	results.failed++;
      }
    });
    suite.suites.forEach(function(s){
      results = countSpecs(s, results);
    });
    return(results);
  }

  var checker = setInterval(function(){
    if(!jasmine.running){
      var results = {}
      var report = jasmine.getJSReport()
      var errors = [];
      results.runtime = report.durationSec * 1000;
      results.total=0;
      results.passed=0;
      results.failed=0;
      results.tracebacks=[];

      jasmine.getJSReport().suites.forEach(function(suite){
	results = countSpecs(suite, results);
      });
      results.total = results.passed + results.failed;

      results.url = window.location.pathname;
      BrowserStack.post("/_report", results, function(){});
    }
    clearInterval(checker);
  }, 1000);
})();

